"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Image as ImageIcon,
  Video,
  Mic,
  MessageSquare,
  Trash2,
  RotateCcw,
  UserX,
  X,
  Eye,
} from "lucide-react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/client/api";
import { useList } from "@/lib/client/useList";
import { useDebounce } from "@/lib/client/hooks";
import { useToast } from "@/components/admin/Toast";
import { useAdmin } from "@/components/admin/AdminProvider";
import { Modal, ConfirmDialog } from "@/components/admin/Modal";
import {
  PageHeader,
  SearchBar,
  FilterSelect,
  Button,
  IconButton,
  Badge,
  Spinner,
  EmptyState,
  ErrorState,
  Pagination,
} from "@/components/admin/ui";

interface MsgRow {
  _id: string;
  text?: string;
  mediaType?: string;
  isDeletedForEveryone: boolean;
  isEdited: boolean;
  removedByAdmin?: boolean;
  createdAt: string;
  sender?: { _id: string; username: string; email: string; avatar?: string } | null;
  senderUsername?: string;
  chatId?: { isGroupChat: boolean; name?: string };
}

const mediaIcons: Record<string, typeof ImageIcon> = { image: ImageIcon, video: Video, audio: Mic };

function MediaIcon({ type }: { type?: string }) {
  if (!type || type === "call" || type === "sticker") return null;
  const Icon = mediaIcons[type] || MessageSquare;
  return <Icon className="w-3 h-3 text-chat-text-tertiary inline-block mr-1.5" />;
}

function preview(msg: { text?: string; mediaType?: string }) {
  return msg.text || `[${msg.mediaType || "media"}]`;
}

function ContextModal({ messageId, onClose }: { messageId: string; onClose: () => void }) {
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ messages: MsgRow[] }>(`/api/admin/messages/${messageId}/context`)
      .then((d) => setMessages(d.messages || []))
      .catch(() => setError("Could not load conversation context"))
      .finally(() => setLoading(false));
  }, [messageId]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-xl bg-chat-bg-secondary border border-chat-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="p-5 border-b border-chat-border flex items-center justify-between sticky top-0 z-10 bg-chat-bg-secondary">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-chat-accent/10 flex items-center justify-center">
              <MessageSquare size={16} className="text-chat-accent" />
            </div>
            <div>
              <h3 className="text-chat-text-primary font-bold">Conversation Context</h3>
              <p className="text-chat-text-tertiary text-[11px] uppercase font-bold tracking-wider">
                Surrounding messages
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-chat-text-tertiary hover:text-chat-text-primary hover:bg-chat-bg-hover rounded-lg transition-all">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading ? (
            <Spinner label="Retrieving chat log…" />
          ) : error ? (
            <p className="py-16 text-center text-red-500 text-sm font-medium">{error}</p>
          ) : (
            <div className="flex flex-col gap-1">
              {messages.map((msg) => {
                const isPivot = !!(msg as MsgRow & { _isPivot?: boolean })._isPivot;
                const name = msg.sender?.username || msg.senderUsername || "Unknown";
                const removed = msg.isDeletedForEveryone || msg.removedByAdmin;
                return (
                  <div
                    key={msg._id}
                    className={`p-4 rounded-2xl border ${
                      isPivot ? "bg-chat-accent/5 border-chat-accent/20" : "border-transparent hover:bg-chat-bg-hover/10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[12px] font-bold ${isPivot ? "text-chat-accent" : "text-chat-text-secondary"}`}>
                          {name}
                        </span>
                        <span className="text-chat-text-tertiary text-[10px]">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {isPivot && (
                        <span className="text-[9px] font-black uppercase bg-chat-accent text-white px-1.5 py-0.5 rounded tracking-widest">
                          Target
                        </span>
                      )}
                    </div>
                    <p className={`text-[13px] leading-relaxed ${removed ? "text-chat-text-tertiary italic line-through" : isPivot ? "text-chat-text-primary" : "text-chat-text-secondary"}`}>
                      <MediaIcon type={msg.mediaType} />
                      {preview(msg)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function MessagesPage() {
  const { can } = useAdmin();
  const toast = useToast();

  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [contextId, setContextId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<MsgRow | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const path = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: "30" });
    if (search) p.set("search", search);
    if (filter) p.set("filter", filter);
    return `/api/admin/messages?${p.toString()}`;
  }, [page, search, filter]);

  const { items: messages, pagination, loading, error, reload } = useList<MsgRow>(path);

  async function moderate(msg: MsgRow, action: "remove" | "restore", note?: string) {
    setBusy(msg._id);
    try {
      await apiFetch(`/api/admin/messages/${msg._id}/moderation`, {
        method: "POST",
        body: JSON.stringify({ action, reason: note }),
      });
      toast.success(action === "remove" ? "Message removed" : "Message restored");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-chat-bg-primary relative">
      <div className="ambient-glow">
        <div className="ambient-glow-inner" />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <div className="p-4 sm:p-6 lg:p-8 pb-4 shrink-0 space-y-6">
          <PageHeader
            title="Messages"
            subtitle="Search and moderate platform communications"
            actions={<Button icon={MessageSquare} onClick={reload} loading={loading}>Refresh</Button>}
          />
          <div className="flex flex-col md:flex-row gap-3">
            <SearchBar value={searchInput} onChange={(v) => { setSearchInput(v); setPage(1); }} placeholder="Search text or @username…" />
            <FilterSelect
              value={filter}
              onChange={(v) => { setFilter(v); setPage(1); }}
              options={[
                { label: "All Messages", value: "" },
                { label: "With Media", value: "media" },
                { label: "Removed", value: "removed" },
              ]}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 custom-scrollbar pb-8">
          {loading ? (
            <Spinner label="Scanning communications…" />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : messages.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No messages found" description="No messages match your search or filter." />
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block">
                <div className="grid grid-cols-[1.8fr_1fr_1fr_130px_150px] gap-4 px-4 py-3 border-b border-chat-border bg-chat-bg-secondary/30 rounded-t-xl sticky top-0 z-10 backdrop-blur-md">
                  <div className="text-[11px] font-bold text-chat-text-tertiary uppercase tracking-wider">Content</div>
                  <div className="text-[11px] font-bold text-chat-text-tertiary uppercase tracking-wider">Sender</div>
                  <div className="text-[11px] font-bold text-chat-text-tertiary uppercase tracking-wider">Conversation</div>
                  <div className="text-[11px] font-bold text-chat-text-tertiary uppercase tracking-wider">Sent</div>
                  <div className="text-[11px] font-bold text-chat-text-tertiary uppercase tracking-wider text-center">Status / Actions</div>
                </div>
                <div className="divide-y divide-chat-border/50 bg-chat-bg-secondary/10 border-x border-b border-chat-border rounded-b-xl">
                  {messages.map((msg) => {
                    const removed = msg.isDeletedForEveryone || msg.removedByAdmin;
                    return (
                      <div key={msg._id} className={`grid grid-cols-[1.8fr_1fr_1fr_130px_150px] gap-4 px-4 py-4 items-center hover:bg-chat-bg-hover/20 transition-all ${removed ? "bg-red-500/[0.02]" : ""}`}>
                        <button onClick={() => setContextId(msg._id)} className="min-w-0 pr-2 text-left group">
                          <p className={`text-[13px] truncate ${removed ? "text-chat-text-tertiary italic line-through" : "text-chat-text-primary group-hover:text-chat-accent"}`}>
                            <MediaIcon type={msg.mediaType} />
                            {preview(msg)}
                          </p>
                        </button>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-[13px] truncate ${!msg.sender ? "text-chat-text-tertiary italic" : "text-chat-text-secondary font-medium"}`}>
                            {msg.sender?.username || msg.senderUsername || "Unknown"}
                          </span>
                          {!msg.sender && msg.senderUsername && (
                            <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-[9px] font-bold text-red-500 uppercase">
                              <UserX size={8} /> Gone
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-chat-text-secondary text-[12px] min-w-0">
                          <span className="opacity-60 shrink-0">{msg.chatId?.isGroupChat ? "Group:" : "Direct:"}</span>
                          <span className="font-medium truncate">
                            {msg.chatId?.isGroupChat ? msg.chatId?.name || "Group" : "Private DM"}
                          </span>
                        </div>
                        <p className="text-chat-text-tertiary text-[12px]">
                          {new Date(msg.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                        </p>
                        <div className="flex items-center justify-center gap-1">
                          {msg.removedByAdmin && <Badge tone="danger">Removed</Badge>}
                          {!msg.removedByAdmin && msg.isDeletedForEveryone && <Badge tone="warning">User-deleted</Badge>}
                          {msg.isEdited && !removed && <Badge tone="warning">Edited</Badge>}
                          <IconButton icon={Eye} title="View context" onClick={() => setContextId(msg._id)} />
                          {can("messages.moderate") &&
                            (msg.removedByAdmin ? (
                              <IconButton icon={RotateCcw} tone="success" title="Restore" disabled={busy === msg._id} onClick={() => moderate(msg, "restore")} />
                            ) : (
                              <IconButton icon={Trash2} tone="danger" title="Remove" disabled={busy === msg._id} onClick={() => { setRemoveTarget(msg); setReason(""); }} />
                            ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mobile */}
              <div className="md:hidden space-y-3">
                {messages.map((msg) => {
                  const removed = msg.isDeletedForEveryone || msg.removedByAdmin;
                  return (
                    <div key={msg._id} className={`bg-chat-bg-secondary border rounded-2xl p-4 ${removed ? "border-red-500/20" : "border-chat-border"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[13px] font-medium truncate ${!msg.sender ? "text-chat-text-tertiary italic" : "text-chat-text-secondary"}`}>
                          {msg.sender?.username || msg.senderUsername || "Unknown"}
                        </span>
                        <span className="text-[10px] text-chat-text-tertiary font-bold">
                          {new Date(msg.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                        </span>
                      </div>
                      <button onClick={() => setContextId(msg._id)} className="w-full text-left p-3 rounded-xl mb-3 text-[13px] bg-chat-bg-primary/50 border border-chat-border/30">
                        <span className={removed ? "text-chat-text-tertiary italic line-through" : "text-chat-text-secondary"}>
                          <MediaIcon type={msg.mediaType} />
                          {preview(msg)}
                        </span>
                      </button>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1.5 flex-wrap">
                          {msg.removedByAdmin && <Badge tone="danger">Removed</Badge>}
                          {msg.isEdited && !removed && <Badge tone="warning">Edited</Badge>}
                        </div>
                        {can("messages.moderate") &&
                          (msg.removedByAdmin ? (
                            <IconButton icon={RotateCcw} tone="success" title="Restore" disabled={busy === msg._id} onClick={() => moderate(msg, "restore")} />
                          ) : (
                            <IconButton icon={Trash2} tone="danger" title="Remove" disabled={busy === msg._id} onClick={() => { setRemoveTarget(msg); setReason(""); }} />
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {pagination && (
          <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} limit={pagination.limit} onPage={setPage} noun="messages" />
        )}
      </div>

      {contextId && <ContextModal messageId={contextId} onClose={() => setContextId(null)} />}

      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) moderate(removeTarget, "remove", reason);
          setRemoveTarget(null);
        }}
        title="Remove this message?"
        message="It will be hidden from all users. The content is retained so you can restore it or review it in the audit log."
        confirmLabel="Remove message"
        danger
        loading={busy === removeTarget?._id}
        requireReason
        reason={reason}
        onReasonChange={setReason}
      />
    </div>
  );
}
