"use client";

import { useMemo, useState } from "react";
import { Megaphone, Send, Users, ShieldCheck, Activity } from "lucide-react";
import { apiFetch } from "@/lib/client/api";
import { useList } from "@/lib/client/useList";
import { useToast } from "@/components/admin/Toast";
import { useAdmin } from "@/components/admin/AdminProvider";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Spinner,
  EmptyState,
  ErrorState,
  Pagination,
} from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format";

interface Announcement {
  _id: string;
  title: string;
  body: string;
  audience: "all" | "admins" | "active";
  status: "draft" | "sent";
  createdByUsername: string;
  sentAt?: string;
  deliveredCount: number;
  createdAt: string;
}

const AUDIENCES = [
  { value: "all", label: "Everyone", icon: Users },
  { value: "active", label: "Active (30d)", icon: Activity },
  { value: "admins", label: "Admins only", icon: ShieldCheck },
] as const;

export default function BroadcastPage() {
  const { can } = useAdmin();
  const toast = useToast();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"all" | "admins" | "active">("all");
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);

  const path = useMemo(() => `/api/admin/announcements?page=${page}&limit=15`, [page]);
  const { items, pagination, loading, error, reload } = useList<Announcement>(path);

  const canSend = can("broadcast.send");

  async function send() {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and message are required");
      return;
    }
    setSending(true);
    try {
      await apiFetch("/api/admin/announcements", {
        method: "POST",
        body: JSON.stringify({ title, body, audience }),
      });
      toast.success("Announcement sent");
      setTitle("");
      setBody("");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      <div className="ambient-glow">
        <div className="ambient-glow-inner" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar space-y-8">
        <PageHeader title="Broadcast" subtitle="Send platform-wide announcements to your users" />

        {canSend && (
          <Card className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-chat-accent/10 flex items-center justify-center">
                <Megaphone size={15} className="text-chat-accent" />
              </div>
              <p className="text-sm font-semibold text-chat-text-primary">Compose announcement</p>
            </div>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={140}
              placeholder="Title"
              className="w-full bg-chat-bg-primary border border-chat-border rounded-xl px-4 py-3 text-sm text-chat-text-primary placeholder:text-chat-text-tertiary focus:outline-none focus:border-chat-accent"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={4000}
              rows={4}
              placeholder="Write your message…"
              className="w-full bg-chat-bg-primary border border-chat-border rounded-xl px-4 py-3 text-sm text-chat-text-primary placeholder:text-chat-text-tertiary focus:outline-none focus:border-chat-accent resize-none"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex gap-2">
                {AUDIENCES.map((a) => {
                  const Icon = a.icon;
                  const active = audience === a.value;
                  return (
                    <button
                      key={a.value}
                      onClick={() => setAudience(a.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                        active
                          ? "bg-chat-accent/10 border-chat-accent/40 text-chat-accent"
                          : "bg-chat-bg-primary border-chat-border text-chat-text-secondary hover:text-chat-text-primary"
                      }`}
                    >
                      <Icon size={13} />
                      {a.label}
                    </button>
                  );
                })}
              </div>
              <Button variant="primary" icon={Send} loading={sending} onClick={send} disabled={!title.trim() || !body.trim()}>
                Send announcement
              </Button>
            </div>
            <p className="text-[11px] text-chat-text-tertiary">
              Recorded and delivered to the selected audience. All sends are logged in the audit trail.
            </p>
          </Card>
        )}

        <div className="space-y-4">
          <h2 className="text-chat-text-tertiary text-[10px] font-bold uppercase tracking-[0.2em]">History</h2>
          {loading ? (
            <Spinner label="Loading announcements…" />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : items.length === 0 ? (
            <EmptyState icon={Megaphone} title="No announcements yet" description={canSend ? "Compose your first announcement above." : "Sent announcements will appear here."} />
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((a) => (
                <Card key={a._id} className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-bold text-chat-text-primary">{a.title}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge tone={a.status === "sent" ? "success" : "neutral"}>{a.status}</Badge>
                      <Badge tone="accent">{a.audience}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-chat-text-secondary whitespace-pre-wrap">{a.body}</p>
                  <div className="flex items-center gap-3 text-[11px] text-chat-text-tertiary pt-1">
                    <span>by @{a.createdByUsername}</span>
                    <span>·</span>
                    <span>{formatDateTime(a.sentAt || a.createdAt)}</span>
                    <span>·</span>
                    <span className="font-medium text-chat-text-secondary">{a.deliveredCount.toLocaleString()} recipients</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {pagination && pagination.pages > 1 && (
          <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} limit={pagination.limit} onPage={setPage} noun="announcements" />
        )}
      </div>
    </div>
  );
}
