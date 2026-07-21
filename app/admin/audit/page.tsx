"use client";

import { useMemo, useState } from "react";
import {
  ScrollText,
  Ban,
  Clock,
  Trash2,
  ShieldCheck,
  UserX,
  UserCheck,
  MessageSquare,
  BookImage,
  MessagesSquare,
  Megaphone,
  Settings,
  LogIn,
  RotateCcw,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { useList } from "@/lib/client/useList";
import { useDebounce } from "@/lib/client/hooks";
import {
  PageHeader,
  SearchBar,
  FilterSelect,
  Button,
  Avatar,
  Badge,
  Spinner,
  EmptyState,
  ErrorState,
  Pagination,
} from "@/components/admin/ui";
import { formatDateTime, timeAgo } from "@/lib/format";

interface AuditEntry {
  _id: string;
  actorUsername: string;
  action: string;
  targetType: string;
  targetId?: string;
  targetLabel?: string;
  reason?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

const ACTION_ICONS: Record<string, LucideIcon> = {
  "user.ban": Ban,
  "user.unban": ShieldCheck,
  "user.timeout": Clock,
  "user.clear_timeout": Clock,
  "user.deactivate": UserX,
  "user.reactivate": UserCheck,
  "user.delete": Trash2,
  "user.role": ShieldCheck,
  "message.remove": MessageSquare,
  "message.restore": RotateCcw,
  "story.remove": BookImage,
  "story.restore": RotateCcw,
  "chat.delete": MessagesSquare,
  "chat.remove_member": UserX,
  "report.resolved": CheckCircle2,
  "report.dismissed": CheckCircle2,
  "announcement.send": Megaphone,
  "setting.update": Settings,
  "admin.update": ShieldCheck,
  "auth.login": LogIn,
};

function toneFor(action: string): "danger" | "warning" | "success" | "accent" | "neutral" {
  if (action.includes("delete") || action.includes("ban") || action.includes("remove")) return "danger";
  if (action.includes("timeout") || action.includes("deactivate")) return "warning";
  if (action.includes("restore") || action.includes("unban") || action.includes("reactivate") || action.includes("resolved")) return "success";
  if (action.includes("login")) return "neutral";
  return "accent";
}

export default function AuditPage() {
  const [actorInput, setActorInput] = useState("");
  const actor = useDebounce(actorInput);
  const [targetType, setTargetType] = useState("");
  const [page, setPage] = useState(1);

  const path = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: "30" });
    if (actor) p.set("actor", actor);
    if (targetType) p.set("targetType", targetType);
    return `/api/admin/audit?${p.toString()}`;
  }, [page, actor, targetType]);

  const { items: entries, pagination, loading, error, reload } = useList<AuditEntry>(path);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-chat-bg-primary relative">
      <div className="ambient-glow">
        <div className="ambient-glow-inner" />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <div className="p-4 sm:p-6 lg:p-8 pb-4 shrink-0 space-y-6">
          <PageHeader
            title="Audit Log"
            subtitle="Every administrative action, recorded"
            actions={<Button icon={ScrollText} onClick={reload} loading={loading}>Refresh</Button>}
          />
          <div className="flex flex-col md:flex-row gap-3">
            <SearchBar value={actorInput} onChange={(v) => { setActorInput(v); setPage(1); }} placeholder="Filter by admin username…" />
            <FilterSelect
              value={targetType}
              onChange={(v) => { setTargetType(v); setPage(1); }}
              options={[
                { label: "All Targets", value: "" },
                { label: "Users", value: "user" },
                { label: "Messages", value: "message" },
                { label: "Stories", value: "story" },
                { label: "Chats", value: "chat" },
                { label: "Reports", value: "report" },
                { label: "Announcements", value: "announcement" },
                { label: "Settings", value: "setting" },
                { label: "Admins", value: "admin" },
                { label: "Auth", value: "auth" },
              ]}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 custom-scrollbar pb-8">
          {loading ? (
            <Spinner label="Loading audit trail…" />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : entries.length === 0 ? (
            <EmptyState icon={ScrollText} title="No audit entries" description="Administrative actions will appear here as they happen." />
          ) : (
            <div className="relative pl-4">
              <div className="absolute left-[26px] top-2 bottom-2 w-px bg-chat-border" />
              <div className="flex flex-col gap-2">
                {entries.map((e) => {
                  const Icon = ACTION_ICONS[e.action] || ScrollText;
                  const tone = toneFor(e.action);
                  return (
                    <div key={e._id} className="flex items-start gap-3 relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border border-chat-border bg-chat-bg-secondary`}>
                        <Icon size={14} className={
                          tone === "danger" ? "text-red-500"
                          : tone === "warning" ? "text-amber-500"
                          : tone === "success" ? "text-emerald-500"
                          : tone === "neutral" ? "text-chat-text-tertiary"
                          : "text-chat-accent"
                        } />
                      </div>
                      <div className="flex-1 min-w-0 bg-chat-bg-secondary border border-chat-border rounded-xl p-3.5 mb-1">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0">
                            <p className="text-sm text-chat-text-primary">
                              <span className="font-semibold">@{e.actorUsername || "system"}</span>{" "}
                              <span className="text-chat-text-secondary">
                                {e.action.replace(/[._]/g, " ")}
                              </span>{" "}
                              {e.targetLabel && (
                                <span className="font-medium text-chat-text-primary">{e.targetLabel}</span>
                              )}
                            </p>
                            {e.reason && (
                              <p className="text-xs text-chat-text-tertiary italic mt-1">“{e.reason}”</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge tone={tone}>{e.targetType}</Badge>
                            <span className="text-[11px] text-chat-text-tertiary" title={formatDateTime(e.createdAt)}>
                              {timeAgo(e.createdAt)}
                            </span>
                          </div>
                        </div>
                        {e.ip && <p className="text-[10px] text-chat-text-tertiary mt-1.5 font-mono">IP {e.ip}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {pagination && (
          <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} limit={pagination.limit} onPage={setPage} noun="entries" />
        )}
      </div>
    </div>
  );
}
