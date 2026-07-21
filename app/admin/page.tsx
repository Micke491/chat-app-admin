"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Ban,
  ShieldCheck,
  MessageSquare,
  Trash2,
  BookImage,
  AlertCircle,
  MessagesSquare,
  Wifi,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/client/api";
import { StatCard, Spinner, ErrorState, Skeleton } from "@/components/admin/ui";
import { BarChart, type SeriesPoint } from "@/components/admin/charts";

interface Overview {
  users: { total: number; banned: number; deactivated: number; admins: number; online: number; new24h: number };
  messages: { total: number; removed: number; last24h: number };
  stories: { total: number; active: number };
  reports: { pending: number };
  chats: { total: number; groups: number; direct: number };
}

interface DayData {
  date: string;
  label: string;
  messages: number;
  users: number;
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [activity, setActivity] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [ov, act] = await Promise.all([
        apiFetch<Overview>("/api/admin/stats/overview"),
        apiFetch<{ days: DayData[] }>("/api/admin/stats/activity?days=7"),
      ]);
      setOverview(ov);
      setActivity(act.days);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const messageSeries: SeriesPoint[] = activity.map((d) => ({ label: d.label, value: d.messages }));
  const userSeries: SeriesPoint[] = activity.map((d) => ({ label: d.label, value: d.users }));

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      <div className="ambient-glow">
        <div className="ambient-glow-inner" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar space-y-8">
        <div>
          <h1 className="text-chat-text-primary text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-chat-text-secondary text-sm mt-1">
            Platform overview and live activity
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : overview ? (
          <div className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-chat-text-tertiary text-[10px] font-bold uppercase tracking-[0.2em]">
                Users
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Total Users" value={overview.users.total} color="#3b82f6" />
                <StatCard icon={UserPlus} label="New (24h)" value={overview.users.new24h} sub="Joined today" color="#10b981" />
                <StatCard icon={Wifi} label="Online Now" value={overview.users.online} color="#22c55e" />
                <StatCard icon={Ban} label="Banned" value={overview.users.banned} sub={`${overview.users.deactivated} deactivated`} color="#ef4444" />
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-chat-text-tertiary text-[10px] font-bold uppercase tracking-[0.2em]">
                Content & Moderation
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={MessageSquare} label="Messages" value={overview.messages.total} sub={`${overview.messages.last24h} in 24h`} color="#8b5cf6" />
                <StatCard icon={MessagesSquare} label="Conversations" value={overview.chats.total} sub={`${overview.chats.groups} groups · ${overview.chats.direct} direct`} color="#06b6d4" />
                <StatCard icon={BookImage} label="Active Stories" value={overview.stories.active} sub={`of ${overview.stories.total} total`} color="#ec4899" />
                <Link href="/admin/reports" className="block">
                  <StatCard icon={AlertCircle} label="Pending Reports" value={overview.reports.pending} sub="Needs review" color="#f59e0b" />
                </Link>
              </div>
            </section>

            {activity.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-chat-text-tertiary text-[10px] font-bold uppercase tracking-[0.2em]">
                  Last 7 Days
                </h2>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <BarChart data={messageSeries} color="#3b82f6" title="Messages Sent" icon={MessageSquare} />
                  <BarChart data={userSeries} color="#10b981" title="New Registrations" icon={UserPlus} />
                </div>
              </section>
            )}

            <div className="bg-chat-bg-secondary/50 border border-chat-border rounded-xl p-5 flex items-center gap-3">
              <div className="p-2 bg-chat-accent/10 rounded-lg">
                <Activity size={16} className="text-chat-accent" />
              </div>
              <p className="text-chat-text-secondary text-xs sm:text-sm">
                Live data — stats refresh on every visit. Every moderation action is recorded
                in the{" "}
                <Link href="/admin/audit" className="text-chat-accent hover:underline">
                  audit log
                </Link>
                .
              </p>
            </div>
          </div>
        ) : (
          <Spinner />
        )}
      </div>
    </div>
  );
}
