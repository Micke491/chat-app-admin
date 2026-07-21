"use client";

import { useEffect, useState } from "react";
import { TrendingUp, type LucideIcon } from "lucide-react";

export interface SeriesPoint {
  label: string;
  value: number;
}

/* ------------------------------------------------------------------ Bar chart */
export function BarChart({
  data,
  color,
  title,
  icon: Icon,
  suffix = "7d",
}: {
  data: SeriesPoint[];
  color: string;
  title: string;
  icon: LucideIcon;
  suffix?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const values = data.map((d) => d.value);
  const max = Math.max(...values, 1);
  const total = values.reduce((a, b) => a + b, 0);

  const chartH = 140;
  const barWidth = 30;
  const gap = 14;
  const totalWidth = data.length * barWidth + (data.length - 1) * gap;

  return (
    <div className="bg-chat-bg-secondary border border-chat-border rounded-xl p-5 transition-colors hover:border-chat-text-tertiary/50 flex flex-col flex-1 min-w-0">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon size={14} style={{ color }} />
          </div>
          <p className="text-chat-text-secondary text-sm font-semibold">{title}</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-chat-bg-primary rounded-md border border-chat-border/50">
          <TrendingUp size={12} style={{ color }} />
          <span className="text-sm font-bold" style={{ color }}>
            {total.toLocaleString()}
          </span>
          <span className="text-chat-text-tertiary text-[10px] uppercase font-medium">
            {suffix}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-none pb-2">
        <div className="flex justify-center min-w-max px-2">
          <svg width={totalWidth} height={chartH + 28} className="overflow-visible">
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
              <line
                key={i}
                x1={0}
                x2={totalWidth}
                y1={chartH - chartH * pct}
                y2={chartH - chartH * pct}
                stroke="currentColor"
                className="text-chat-border"
                strokeWidth={1}
              />
            ))}
            {data.map((d, i) => {
              const barH = animated ? (d.value / max) * (chartH - 8) : 0;
              const x = i * (barWidth + gap);
              const y = chartH - barH;
              const isHovered = hovered === i;
              return (
                <g
                  key={i}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  className="cursor-pointer"
                >
                  <rect
                    x={x - 4}
                    y={0}
                    width={barWidth + 8}
                    height={chartH}
                    rx={6}
                    className="fill-transparent hover:fill-chat-text-primary/5 transition-colors"
                  />
                  {isHovered && (
                    <text
                      x={x + barWidth / 2}
                      y={y - 6}
                      className="text-[11px] font-bold fill-chat-text-primary"
                      textAnchor="middle"
                    >
                      {d.value}
                    </text>
                  )}
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(barH, 2)}
                    rx={6}
                    ry={6}
                    style={{
                      fill: isHovered ? color : `${color}cc`,
                      transition:
                        "height 0.6s cubic-bezier(0.34,1.56,0.64,1), y 0.6s cubic-bezier(0.34,1.56,0.64,1), fill 0.15s",
                      transitionDelay: `${i * 0.05}s`,
                    }}
                  />
                  <text
                    x={x + barWidth / 2}
                    y={chartH + 18}
                    className={`text-[10px] font-medium transition-colors ${
                      isHovered ? "fill-chat-text-secondary" : "fill-chat-text-tertiary"
                    }`}
                    textAnchor="middle"
                  >
                    {d.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Line chart */
export function LineChart({
  data,
  color,
  title,
  icon: Icon,
}: {
  data: SeriesPoint[];
  color: string;
  title: string;
  icon: LucideIcon;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const W = 560;
  const H = 180;
  const pad = 24;
  const values = data.map((d) => d.value);
  const max = Math.max(...values, 1);
  const total = values.reduce((a, b) => a + b, 0);
  const stepX = data.length > 1 ? (W - pad * 2) / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = H - pad - (d.value / max) * (H - pad * 2);
    return { x, y, ...d };
  });

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${line} L ${points[points.length - 1]?.x ?? pad} ${H - pad} L ${
    points[0]?.x ?? pad
  } ${H - pad} Z`;

  return (
    <div className="bg-chat-bg-secondary border border-chat-border rounded-xl p-5 flex flex-col flex-1 min-w-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon size={14} style={{ color }} />
          </div>
          <p className="text-chat-text-secondary text-sm font-semibold">{title}</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-chat-bg-primary rounded-md border border-chat-border/50">
          <TrendingUp size={12} style={{ color }} />
          <span className="text-sm font-bold" style={{ color }}>
            {total.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="overflow-x-auto scrollbar-none">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="min-w-[420px]">
          <defs>
            <linearGradient id={`grad-${title}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((pct, i) => (
            <line
              key={i}
              x1={pad}
              x2={W - pad}
              y1={pad + pct * (H - pad * 2)}
              y2={pad + pct * (H - pad * 2)}
              stroke="currentColor"
              className="text-chat-border"
              strokeWidth={1}
            />
          ))}
          <path d={area} fill={`url(#grad-${title})`} />
          <path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
          {points.map((p, i) => (
            <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              <circle
                cx={p.x}
                cy={p.y}
                r={hovered === i ? 5 : 3}
                fill={color}
                stroke="var(--bg-secondary)"
                strokeWidth={2}
                className="transition-all"
              />
              {hovered === i && (
                <text
                  x={p.x}
                  y={p.y - 10}
                  className="text-[11px] font-bold fill-chat-text-primary"
                  textAnchor="middle"
                >
                  {p.value}
                </text>
              )}
              {i % Math.ceil(data.length / 8 || 1) === 0 && (
                <text
                  x={p.x}
                  y={H - 6}
                  className="text-[9px] fill-chat-text-tertiary"
                  textAnchor="middle"
                >
                  {p.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Ranked bar list */
export function RankedList({
  items,
  color = "#3b82f6",
  valueLabel,
}: {
  items: { label: string; sub?: string; value: number }[];
  color?: string;
  valueLabel?: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-chat-text-tertiary w-5 shrink-0">
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-chat-text-primary font-medium truncate">
                {item.label}
              </span>
              <span className="text-xs text-chat-text-secondary font-bold ml-2 shrink-0">
                {item.value.toLocaleString()}
                {valueLabel ? ` ${valueLabel}` : ""}
              </span>
            </div>
            <div className="h-1.5 bg-chat-bg-primary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(item.value / max) * 100}%`, backgroundColor: color }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
