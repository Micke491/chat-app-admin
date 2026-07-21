"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  User as UserIcon,
  MessageSquare,
  BookImage,
  ShieldAlert,
} from "lucide-react";
import { apiFetch } from "@/lib/client/api";
import { useList } from "@/lib/client/useList";
import { useToast } from "@/components/admin/Toast";
import { useAdmin } from "@/components/admin/AdminProvider";
import { Modal } from "@/components/admin/Modal";
import {
  PageHeader,
  FilterSelect,
  Button,
  Badge,
  Avatar,
  Spinner,
  EmptyState,
  ErrorState,
  Pagination,
} from "@/components/admin/ui";
import { timeAgo } from "@/lib/format";

interface Reporter {
  username: string;
  name?: string;
  avatar?: string;
}
interface ReportRow {
  _id: string;
  targetType: "user" | "message" | "story";
  category: string;
  details?: string;
  status: "pending" | "resolved" | "dismissed";
  adminNotes?: string;
  createdAt: string;
  reporterId?: Reporter | null;
  target?: Record<string, unknown> | null;
}

const TYPE_ICONS = { user: UserIcon, message: MessageSquare, story: BookImage };
const STATUS_TONE = { pending: "warning", resolved: "success", dismissed: "neutral" } as const;

export default function ReportsPage() {
  const { can } = useAdmin();
  const toast = useToast();

  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [notesFor, setNotesFor] = useState<ReportRow | null>(null);
  const [notes, setNotes] = useState("");

  const path = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: "20" });
    if (status) p.set("status", status);
    return `/api/admin/reports?${p.toString()}`;
  }, [page, status]);

  const { items: reports, pagination, loading, error, reload } = useList<ReportRow>(path);

  async function resolve(report: ReportRow, newStatus: "resolved" | "dismissed", adminNotes?: string) {
    setBusy(report._id);
    try {
      await apiFetch(`/api/admin/reports/${report._id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus, ...(adminNotes !== undefined ? { adminNotes } : {}) }),
      });
      toast.success(newStatus === "resolved" ? "Report resolved" : "Report dismissed");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  function TargetSnapshot({ report }: { report: ReportRow }) {
    const t = report.target;
    if (!t) return <span className="text-chat-text-tertiary text-xs italic">Target no longer exists</span>;
    if (report.targetType === "user") {
      return (
        <div className="flex items-center gap-2">
          <Avatar src={t.avatar as string} name={(t.username as string) || "?"} className="w-7 h-7" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-chat-text-primary truncate">@{t.username as string}</p>
            {(t.isBanned as boolean) && <Badge tone="danger">Banned</Badge>}
          </div>
        </div>
      );
    }
    if (report.targetType === "message") {
      const sender = t.sender as Reporter | undefined;
      return (
        <div className="min-w-0">
          <p className="text-xs text-chat-text-secondary truncate">
            {(t.text as string) || `[${(t.mediaType as string) || "media"}]`}
          </p>
          <p className="text-[10px] text-chat-text-tertiary">by @{sender?.username || (t.senderUsername as string) || "unknown"}</p>
        </div>
      );
    }
    const author = t.userId as Reporter | undefined;
    return (
      <div className="flex items-center gap-2">
        {t.mediaType === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.mediaUrl as string} alt="story" className="w-8 h-10 rounded object-cover border border-chat-border" />
        ) : (
          <div className="w-8 h-10 rounded bg-chat-bg-primary flex items-center justify-center">
            <BookImage size={12} className="text-chat-text-tertiary" />
          </div>
        )}
        <p className="text-[10px] text-chat-text-tertiary">by @{author?.username || "unknown"}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-chat-bg-primary relative">
      <div className="ambient-glow">
        <div className="ambient-glow-inner" />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <div className="p-4 sm:p-6 lg:p-8 pb-4 shrink-0 space-y-6">
          <PageHeader
            title="Reports"
            subtitle="User-submitted reports awaiting moderation"
            actions={<Button icon={AlertCircle} onClick={reload} loading={loading}>Refresh</Button>}
          />
          <FilterSelect
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            options={[
              { label: "Pending", value: "pending" },
              { label: "Resolved", value: "resolved" },
              { label: "Dismissed", value: "dismissed" },
              { label: "All", value: "" },
            ]}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 custom-scrollbar pb-8">
          {loading ? (
            <Spinner label="Loading reports…" />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : reports.length === 0 ? (
            <EmptyState icon={ShieldAlert} title="Nothing to review" description="No reports match this filter. Great job keeping things clean!" />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {reports.map((report) => {
                const TypeIcon = TYPE_ICONS[report.targetType];
                return (
                  <div key={report._id} className="bg-chat-bg-secondary border border-chat-border rounded-2xl p-5 flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-chat-accent/10 flex items-center justify-center">
                          <TypeIcon size={16} className="text-chat-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-chat-text-primary capitalize">
                            {report.targetType} report
                          </p>
                          <p className="text-[11px] text-chat-text-tertiary">{timeAgo(report.createdAt)}</p>
                        </div>
                      </div>
                      <Badge tone={STATUS_TONE[report.status]}>{report.status}</Badge>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge tone="danger">{report.category}</Badge>
                      {report.reporterId && (
                        <span className="text-[11px] text-chat-text-tertiary">
                          reported by @{report.reporterId.username}
                        </span>
                      )}
                    </div>

                    {report.details && (
                      <p className="text-xs text-chat-text-secondary bg-chat-bg-primary/60 border border-chat-border/40 rounded-lg p-3 leading-relaxed">
                        {report.details}
                      </p>
                    )}

                    <div className="p-3 rounded-lg bg-chat-bg-primary/40 border border-chat-border/40">
                      <p className="text-[10px] font-bold text-chat-text-tertiary uppercase tracking-widest mb-2">Target</p>
                      <TargetSnapshot report={report} />
                    </div>

                    {report.adminNotes && (
                      <p className="text-[11px] text-chat-text-tertiary italic">Note: {report.adminNotes}</p>
                    )}

                    {can("reports.resolve") && report.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          icon={CheckCircle2}
                          className="flex-1"
                          loading={busy === report._id}
                          onClick={() => { setNotesFor(report); setNotes(""); }}
                        >
                          Resolve
                        </Button>
                        <Button
                          variant="secondary"
                          icon={XCircle}
                          className="flex-1"
                          loading={busy === report._id}
                          onClick={() => resolve(report, "dismissed")}
                        >
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {pagination && (
          <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} limit={pagination.limit} onPage={setPage} noun="reports" />
        )}
      </div>

      {/* Resolve with note */}
      <Modal
        open={!!notesFor}
        onClose={() => setNotesFor(null)}
        title="Resolve report"
        subtitle="Optionally record what action you took"
        icon={CheckCircle2}
        iconTone="success"
      >
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="e.g. Removed the message and warned the user."
          className="w-full bg-chat-bg-primary border border-chat-border rounded-lg px-3 py-2 text-sm text-chat-text-primary placeholder:text-chat-text-tertiary focus:outline-none focus:border-chat-accent resize-none"
        />
        <div className="flex gap-3 mt-4">
          <button onClick={() => setNotesFor(null)} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-chat-text-tertiary hover:bg-chat-bg-hover transition-all">
            Cancel
          </button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => {
              if (notesFor) resolve(notesFor, "resolved", notes);
              setNotesFor(null);
            }}
          >
            Mark resolved
          </Button>
        </div>
      </Modal>
    </div>
  );
}
