"use client";

import { useEffect, useState } from "react";
import { Users, MessageSquare, Activity, Gauge, UserPlus, Image as ImageIcon, Trophy } from "lucide-react";
import { apiFetch } from "@/lib/client/api";
import { PageHeader, StatCard, Card, FilterSelect, Spinner, ErrorState, Skeleton } from "@/components/admin/ui";
import { LineChart, RankedList, type SeriesPoint } from "@/components/admin/charts";

interface Analytics {
  range: { days: number };
  totals: { users: number; messages: number; mau: number; avgMessagesPerUser: number };
  series: { newUsers: SeriesPoint[]; messages: SeriesPoint[]; dau: SeriesPoint[] };
  mediaBreakdown: { label: string; value: number }[];
  topUsers: { label: string; sub?: string; value: number }[];
}

const MEDIA_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];

export default function AnalyticsPage() {
  const [days, setDays] = useState("30");
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await apiFetch<Analytics>(`/api/admin/analytics?days=${days}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const totalMedia = data?.mediaBreakdown.reduce((a, b) => a + b.value, 0) ?? 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      <div className="ambient-glow">
        <div className="ambient-glow-inner" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar space-y-8">
        <PageHeader
          title="Analytics"
          subtitle="Growth, engagement, and content trends"
          actions={
            <FilterSelect
              value={days}
              onChange={setDays}
              options={[
                { label: "Last 7 days", value: "7" },
                { label: "Last 30 days", value: "30" },
                { label: "Last 90 days", value: "90" },
              ]}
            />
          }
        />

        {loading ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
            </div>
            <Skeleton className="h-64" />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : data ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Total Users" value={data.totals.users} color="#3b82f6" />
              <StatCard icon={Activity} label="Monthly Active" value={data.totals.mau} sub="Sent a message in 30d" color="#10b981" />
              <StatCard icon={MessageSquare} label="Total Messages" value={data.totals.messages} color="#8b5cf6" />
              <StatCard icon={Gauge} label="Msgs / User" value={data.totals.avgMessagesPerUser} sub="Lifetime average" color="#f59e0b" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <LineChart data={data.series.messages} color="#3b82f6" title="Messages per day" icon={MessageSquare} />
              <LineChart data={data.series.newUsers} color="#10b981" title="New users per day" icon={UserPlus} />
            </div>

            <LineChart data={data.series.dau} color="#8b5cf6" title="Daily active users" icon={Activity} />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Card>
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Trophy size={14} className="text-amber-500" />
                  </div>
                  <p className="text-chat-text-secondary text-sm font-semibold">Most active users</p>
                </div>
                {data.topUsers.length ? (
                  <RankedList items={data.topUsers} color="#f59e0b" valueLabel="msgs" />
                ) : (
                  <p className="text-sm text-chat-text-tertiary">No data yet.</p>
                )}
              </Card>

              <Card>
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                    <ImageIcon size={14} className="text-pink-500" />
                  </div>
                  <p className="text-chat-text-secondary text-sm font-semibold">Media breakdown</p>
                </div>
                {data.mediaBreakdown.length ? (
                  <div className="space-y-4">
                    <div className="flex h-3 rounded-full overflow-hidden bg-chat-bg-primary">
                      {data.mediaBreakdown.map((m, i) => (
                        <div
                          key={m.label}
                          style={{ width: `${(m.value / totalMedia) * 100}%`, backgroundColor: MEDIA_COLORS[i % MEDIA_COLORS.length] }}
                          title={`${m.label}: ${m.value}`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {data.mediaBreakdown.map((m, i) => (
                        <div key={m.label} className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MEDIA_COLORS[i % MEDIA_COLORS.length] }} />
                          <span className="text-xs text-chat-text-secondary capitalize flex-1">{m.label}</span>
                          <span className="text-xs font-bold text-chat-text-primary">{m.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-chat-text-tertiary">No media shared yet.</p>
                )}
              </Card>
            </div>
          </>
        ) : (
          <Spinner />
        )}
      </div>
    </div>
  );
}
