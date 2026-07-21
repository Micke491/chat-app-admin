"use client";

import { useEffect, useState } from "react";
import { Bot, MessageSquare, Sparkles, Save, Pin, UserCircle } from "lucide-react";
import { apiFetch } from "@/lib/client/api";
import { useToast } from "@/components/admin/Toast";
import { useAdmin } from "@/components/admin/AdminProvider";
import { PageHeader, StatCard, Card, Button, Badge, Avatar, Spinner, ErrorState } from "@/components/admin/ui";
import { timeAgo } from "@/lib/format";

interface BotData {
  stats: { totalChats: number; totalMessages: number; usersWithPersona: number; avgMessagesPerChat: number };
  defaultPersona: string;
  recentChats: {
    _id: string;
    title: string;
    messageCount: number;
    pinned: boolean;
    updatedAt: string;
    user: { username?: string; avatar?: string } | null;
  }[];
}

export default function BotPage() {
  const { can } = useAdmin();
  const toast = useToast();
  const [data, setData] = useState<BotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [persona, setPersona] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const d = await apiFetch<BotData>("/api/admin/bot");
      setData(d);
      setPersona(d.defaultPersona);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bot data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function savePersona() {
    setSaving(true);
    try {
      await apiFetch("/api/admin/bot", {
        method: "PATCH",
        body: JSON.stringify({ defaultPersona: persona }),
      });
      toast.success("Default persona saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      <div className="ambient-glow">
        <div className="ambient-glow-inner" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar space-y-8">
        <PageHeader
          title="Bot"
          subtitle="AI assistant usage and configuration"
          actions={<Button icon={Bot} onClick={load} loading={loading}>Refresh</Button>}
        />

        {loading ? (
          <Spinner label="Loading bot data…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : data ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={MessageSquare} label="Bot Conversations" value={data.stats.totalChats} color="#3b82f6" />
              <StatCard icon={Sparkles} label="Bot Messages" value={data.stats.totalMessages} color="#8b5cf6" />
              <StatCard icon={UserCircle} label="Custom Personas" value={data.stats.usersWithPersona} sub="Users with a set persona" color="#ec4899" />
              <StatCard icon={Bot} label="Avg / Chat" value={data.stats.avgMessagesPerChat} color="#10b981" />
            </div>

            {can("bot.manage") && (
              <Card className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-chat-accent/10 flex items-center justify-center">
                    <Sparkles size={15} className="text-chat-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-chat-text-primary">Default bot persona</p>
                    <p className="text-[11px] text-chat-text-tertiary">Baseline system prompt for users without a custom persona</p>
                  </div>
                </div>
                <textarea
                  value={persona}
                  onChange={(e) => setPersona(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  placeholder="e.g. You are VokiToki's friendly assistant. Be concise and helpful…"
                  className="w-full bg-chat-bg-primary border border-chat-border rounded-xl px-4 py-3 text-sm text-chat-text-primary placeholder:text-chat-text-tertiary focus:outline-none focus:border-chat-accent resize-none"
                />
                <div className="flex justify-end">
                  <Button variant="primary" icon={Save} loading={saving} onClick={savePersona}>
                    Save persona
                  </Button>
                </div>
              </Card>
            )}

            <div className="space-y-4">
              <h2 className="text-chat-text-tertiary text-[10px] font-bold uppercase tracking-[0.2em]">Recent bot conversations</h2>
              {data.recentChats.length === 0 ? (
                <Card>
                  <p className="text-sm text-chat-text-tertiary">No bot conversations yet.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.recentChats.map((c) => (
                    <Card key={c._id} className="flex items-center gap-3">
                      <Avatar src={c.user?.avatar} name={c.user?.username || "?"} className="w-9 h-9" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-chat-text-primary truncate flex items-center gap-1.5">
                          {c.title}
                          {c.pinned && <Pin size={11} className="text-amber-500 shrink-0" />}
                        </p>
                        <p className="text-[11px] text-chat-text-tertiary">@{c.user?.username || "unknown"} · {timeAgo(c.updatedAt)}</p>
                      </div>
                      <Badge tone="neutral">{c.messageCount} msgs</Badge>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
