"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MessagesSquare,
  Users as UsersIcon,
  Trash2,
  X,
  UserMinus,
  Crown,
  Hash,
} from "lucide-react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/client/api";
import { useList } from "@/lib/client/useList";
import { useDebounce } from "@/lib/client/hooks";
import { useToast } from "@/components/admin/Toast";
import { useAdmin } from "@/components/admin/AdminProvider";
import { ConfirmDialog } from "@/components/admin/Modal";
import {
  PageHeader,
  SearchBar,
  FilterSelect,
  Button,
  IconButton,
  Badge,
  Avatar,
  Spinner,
  EmptyState,
  ErrorState,
  Pagination,
} from "@/components/admin/ui";
import { timeAgo, formatDateTime } from "@/lib/format";

interface Participant {
  _id: string;
  username: string;
  name?: string;
  avatar?: string;
  isBanned?: boolean;
}
interface ChatRow {
  _id: string;
  isGroupChat?: boolean;
  name?: string;
  avatar?: string;
  participants?: Participant[];
  participantUsernames?: string[];
  groupAdmin?: { username: string } | null;
  messageCount?: number;
  updatedAt: string;
  createdAt: string;
}
interface ChatDetail {
  chat: ChatRow & { participants: Participant[] };
  recentMessages: {
    _id: string;
    text?: string;
    mediaType?: string;
    createdAt: string;
    sender?: { username: string; avatar?: string } | null;
  }[];
  messageCount: number;
}

function chatTitle(chat: ChatRow): string {
  if (chat.isGroupChat) return chat.name || "Unnamed group";
  const names = chat.participants?.map((p) => p.username) || chat.participantUsernames || [];
  return names.length ? names.map((n) => `@${n}`).join(" · ") : "Direct chat";
}

export default function ChatsPage() {
  const { can } = useAdmin();
  const toast = useToast();

  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput);
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ChatDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ChatRow | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const path = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) p.set("search", search);
    if (type) p.set("type", type);
    return `/api/admin/chats?${p.toString()}`;
  }, [page, search, type]);

  const { items: chats, pagination, loading, error, reload } = useList<ChatRow>(path);

  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    apiFetch<ChatDetail>(`/api/admin/chats/${detailId}`)
      .then(setDetail)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load chat"))
      .finally(() => setDetailLoading(false));
  }, [detailId, toast]);

  async function deleteChat(chat: ChatRow, note?: string) {
    setBusy(true);
    try {
      await apiFetch(`/api/admin/chats/${chat._id}/moderation`, {
        method: "POST",
        body: JSON.stringify({ action: "delete", reason: note }),
      });
      toast.success("Conversation deleted");
      setDetailId(null);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(memberId: string) {
    if (!detailId) return;
    try {
      await apiFetch(`/api/admin/chats/${detailId}/moderation`, {
        method: "POST",
        body: JSON.stringify({ action: "remove_member", memberId }),
      });
      toast.success("Member removed");
      const fresh = await apiFetch<ChatDetail>(`/api/admin/chats/${detailId}`);
      setDetail(fresh);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
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
            title="Chats & Groups"
            subtitle="Browse conversations and manage group membership"
            actions={<Button icon={MessagesSquare} onClick={reload} loading={loading}>Refresh</Button>}
          />
          <div className="flex flex-col md:flex-row gap-3">
            <SearchBar value={searchInput} onChange={(v) => { setSearchInput(v); setPage(1); }} placeholder="Search group name or @participant…" />
            <FilterSelect
              value={type}
              onChange={(v) => { setType(v); setPage(1); }}
              options={[
                { label: "All Types", value: "" },
                { label: "Groups", value: "group" },
                { label: "Direct", value: "direct" },
              ]}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 custom-scrollbar pb-8">
          {loading ? (
            <Spinner label="Loading conversations…" />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : chats.length === 0 ? (
            <EmptyState icon={MessagesSquare} title="No conversations found" description="Try a different search or type filter." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {chats.map((chat) => (
                <button
                  key={chat._id}
                  onClick={() => setDetailId(chat._id)}
                  className="text-left bg-chat-bg-secondary border border-chat-border rounded-2xl p-5 hover:border-chat-text-tertiary/50 transition-all flex flex-col gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${chat.isGroupChat ? "bg-chat-accent/10 text-chat-accent" : "bg-purple-500/10 text-purple-500"}`}>
                      {chat.isGroupChat ? <UsersIcon size={18} /> : <MessagesSquare size={18} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-chat-text-primary truncate">{chatTitle(chat)}</p>
                      <p className="text-[11px] text-chat-text-tertiary">{timeAgo(chat.updatedAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone={chat.isGroupChat ? "accent" : "purple"}>
                      {chat.isGroupChat ? "Group" : "Direct"}
                    </Badge>
                    <Badge tone="neutral">
                      <UsersIcon size={10} /> {chat.participants?.length ?? 0}
                    </Badge>
                    <Badge tone="neutral">
                      <Hash size={10} /> {chat.messageCount ?? 0}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {pagination && (
          <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} limit={pagination.limit} onPage={setPage} noun="conversations" />
        )}
      </div>

      {/* Detail drawer */}
      {detailId && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setDetailId(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative w-full max-w-md bg-chat-bg-secondary border-l border-chat-border h-full flex flex-col shadow-2xl"
          >
            <div className="p-5 border-b border-chat-border flex items-center justify-between">
              <h3 className="text-base font-bold text-chat-text-primary">Conversation details</h3>
              <button onClick={() => setDetailId(null)} className="p-2 text-chat-text-tertiary hover:text-chat-text-primary rounded-lg">
                <X size={18} />
              </button>
            </div>

            {detailLoading || !detail ? (
              <Spinner label="Loading…" />
            ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
                <div>
                  <p className="text-sm font-bold text-chat-text-primary">{chatTitle(detail.chat)}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge tone={detail.chat.isGroupChat ? "accent" : "purple"}>{detail.chat.isGroupChat ? "Group" : "Direct"}</Badge>
                    <Badge tone="neutral">{detail.messageCount} messages</Badge>
                    <span className="text-[11px] text-chat-text-tertiary">created {formatDateTime(detail.chat.createdAt)}</span>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-chat-text-tertiary uppercase tracking-widest mb-2">
                    Members ({detail.chat.participants.length})
                  </p>
                  <div className="flex flex-col gap-1">
                    {detail.chat.participants.map((p) => (
                      <div key={p._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-chat-bg-hover/30">
                        <Avatar src={p.avatar} name={p.username} className="w-8 h-8" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-chat-text-primary truncate flex items-center gap-1">
                            @{p.username}
                            {detail.chat.groupAdmin?.username === p.username && <Crown size={12} className="text-amber-500" />}
                          </p>
                          {p.isBanned && <span className="text-[10px] text-red-500">banned</span>}
                        </div>
                        {can("chats.moderate") && detail.chat.isGroupChat && detail.chat.participants.length > 1 && (
                          <IconButton icon={UserMinus} tone="danger" title="Remove from group" onClick={() => removeMember(p._id)} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-chat-text-tertiary uppercase tracking-widest mb-2">Recent messages</p>
                  <div className="flex flex-col gap-2">
                    {detail.recentMessages.length === 0 ? (
                      <p className="text-xs text-chat-text-tertiary italic">No messages.</p>
                    ) : (
                      detail.recentMessages.map((m) => (
                        <div key={m._id} className="text-xs bg-chat-bg-primary/50 border border-chat-border/40 rounded-lg p-2.5">
                          <span className="font-semibold text-chat-text-secondary">@{m.sender?.username || "unknown"}: </span>
                          <span className="text-chat-text-tertiary">{m.text || `[${m.mediaType || "media"}]`}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {can("chats.moderate") && (
              <div className="p-4 border-t border-chat-border">
                <Button variant="danger" icon={Trash2} className="w-full" onClick={() => { setDeleteTarget(detail?.chat ?? null); setReason(""); }}>
                  Delete conversation
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteChat(deleteTarget, reason);
          setDeleteTarget(null);
        }}
        title="Delete this conversation?"
        message="This permanently deletes the conversation and every message in it. This cannot be undone."
        confirmLabel="Delete conversation"
        danger
        loading={busy}
        requireReason
        reason={reason}
        onReasonChange={setReason}
      />
    </div>
  );
}
