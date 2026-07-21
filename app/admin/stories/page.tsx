"use client";

import { useMemo, useState } from "react";
import { BookImage, Trash2, RotateCcw, Eye, Clock, X, Play } from "lucide-react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/client/api";
import { useList } from "@/lib/client/useList";
import { useToast } from "@/components/admin/Toast";
import { useAdmin } from "@/components/admin/AdminProvider";
import { ConfirmDialog } from "@/components/admin/Modal";
import {
  PageHeader,
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

interface StoryRow {
  _id: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption?: string;
  viewedBy?: { userId: string }[];
  expiresAt: string;
  createdAt: string;
  removedByAdmin?: boolean;
  userId?: { _id: string; username: string; name?: string; avatar?: string } | null;
}

export default function StoriesPage() {
  const { can } = useAdmin();
  const toast = useToast();

  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<StoryRow | null>(null);
  const [reason, setReason] = useState("");
  const [lightbox, setLightbox] = useState<StoryRow | null>(null);

  const path = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: "24" });
    if (filter) p.set("filter", filter);
    return `/api/admin/stories?${p.toString()}`;
  }, [page, filter]);

  const { items: stories, pagination, loading, error, reload } = useList<StoryRow>(path);

  async function moderate(story: StoryRow, action: "remove" | "restore", note?: string) {
    setBusy(story._id);
    try {
      await apiFetch(`/api/admin/stories/${story._id}/moderation`, {
        method: "POST",
        body: JSON.stringify({ action, reason: note }),
      });
      toast.success(action === "remove" ? "Story removed" : "Story restored");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  const isExpired = (s: StoryRow) => new Date(s.expiresAt) <= new Date();

  return (
    <div className="flex flex-col h-full overflow-hidden bg-chat-bg-primary relative">
      <div className="ambient-glow">
        <div className="ambient-glow-inner" />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <div className="p-4 sm:p-6 lg:p-8 pb-4 shrink-0 space-y-6">
          <PageHeader
            title="Stories"
            subtitle="Review and moderate ephemeral story media"
            actions={<Button icon={BookImage} onClick={reload} loading={loading}>Refresh</Button>}
          />
          <FilterSelect
            value={filter}
            onChange={(v) => { setFilter(v); setPage(1); }}
            options={[
              { label: "All Stories", value: "" },
              { label: "Active", value: "active" },
              { label: "Removed", value: "removed" },
            ]}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 custom-scrollbar pb-8">
          {loading ? (
            <Spinner label="Loading stories…" />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : stories.length === 0 ? (
            <EmptyState icon={BookImage} title="No stories found" description="No stories match this filter. Expired stories are removed automatically." />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {stories.map((story) => (
                <div key={story._id} className="bg-chat-bg-secondary border border-chat-border rounded-2xl overflow-hidden flex flex-col group">
                  <button onClick={() => setLightbox(story)} className="relative aspect-[3/4] bg-chat-bg-primary overflow-hidden">
                    {story.mediaType === "video" ? (
                      <>
                        <video src={story.mediaUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                            <Play size={16} className="text-white ml-0.5" />
                          </div>
                        </div>
                      </>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={story.mediaUrl} alt={story.caption || "story"} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    )}
                    {story.removedByAdmin && (
                      <div className="absolute inset-0 bg-red-950/60 flex items-center justify-center">
                        <Badge tone="danger">Removed</Badge>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/50 text-white text-[10px] font-medium">
                      <Eye size={10} /> {story.viewedBy?.length ?? 0}
                    </div>
                  </button>

                  <div className="p-3 flex flex-col gap-2 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar src={story.userId?.avatar} name={story.userId?.username || "?"} className="w-6 h-6" />
                      <span className="text-xs font-medium text-chat-text-primary truncate">
                        @{story.userId?.username || "unknown"}
                      </span>
                    </div>
                    {story.caption && (
                      <p className="text-[11px] text-chat-text-secondary line-clamp-2">{story.caption}</p>
                    )}
                    <div className="flex items-center justify-between mt-auto pt-1">
                      <span className="flex items-center gap-1 text-[10px] text-chat-text-tertiary">
                        <Clock size={10} />
                        {isExpired(story) ? "expired" : timeAgo(story.createdAt)}
                      </span>
                      {can("stories.moderate") &&
                        (story.removedByAdmin ? (
                          <IconButton icon={RotateCcw} tone="success" title="Restore" disabled={busy === story._id} onClick={() => moderate(story, "restore")} />
                        ) : (
                          <IconButton icon={Trash2} tone="danger" title="Remove" disabled={busy === story._id} onClick={() => { setRemoveTarget(story); setReason(""); }} />
                        ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {pagination && (
          <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} limit={pagination.limit} onPage={setPage} noun="stories" />
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-chat-bg-secondary border border-chat-border rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-chat-border">
              <div className="flex items-center gap-2">
                <Avatar src={lightbox.userId?.avatar} name={lightbox.userId?.username || "?"} className="w-8 h-8" />
                <div>
                  <p className="text-sm font-semibold text-chat-text-primary">@{lightbox.userId?.username}</p>
                  <p className="text-[10px] text-chat-text-tertiary">{formatDateTime(lightbox.createdAt)}</p>
                </div>
              </div>
              <button onClick={() => setLightbox(null)} className="p-2 text-chat-text-tertiary hover:text-chat-text-primary rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="bg-black flex items-center justify-center max-h-[65vh] overflow-hidden">
              {lightbox.mediaType === "video" ? (
                <video src={lightbox.mediaUrl} controls autoPlay className="max-h-[65vh] w-auto" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lightbox.mediaUrl} alt={lightbox.caption || "story"} className="max-h-[65vh] w-auto object-contain" />
              )}
            </div>
            {lightbox.caption && (
              <p className="p-4 text-sm text-chat-text-secondary">{lightbox.caption}</p>
            )}
          </motion.div>
        </div>
      )}

      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) moderate(removeTarget, "remove", reason);
          setRemoveTarget(null);
        }}
        title="Remove this story?"
        message="It will be hidden from all users immediately."
        confirmLabel="Remove story"
        danger
        loading={busy === removeTarget?._id}
        requireReason
        reason={reason}
        onReasonChange={setReason}
      />
    </div>
  );
}
