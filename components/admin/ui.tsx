"use client";

import { type ReactNode, type ButtonHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Inbox,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

export function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

/* ------------------------------------------------------------------ Page header */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-chat-text-primary text-2xl font-bold tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-chat-text-secondary text-sm mt-1">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ Card */
export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-chat-bg-secondary border border-chat-border rounded-xl p-5 transition-colors",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ Stat card */
export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "#3b82f6",
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-chat-bg-secondary border border-chat-border rounded-xl p-5 flex flex-col gap-3 transition-colors hover:border-chat-text-tertiary/50">
      <div className="flex items-center justify-between">
        <p className="text-chat-text-tertiary text-xs font-medium uppercase tracking-wider">
          {label}
        </p>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-chat-text-primary text-2xl font-bold tracking-tight">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {sub && (
          <p className="text-chat-text-tertiary text-[11px] leading-tight">{sub}</p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Badge */
type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "purple";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-chat-text-tertiary/10 text-chat-text-secondary border-chat-text-tertiary/20",
  accent: "bg-chat-accent/10 text-chat-accent border-chat-accent/20",
  success: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  danger: "bg-red-500/10 text-red-500 border-red-500/20",
  purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap",
        BADGE_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ Button */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-chat-accent text-white hover:bg-chat-accent-hover shadow-[0_0_30px_-12px_rgba(37,99,235,0.6)]",
  secondary:
    "bg-chat-bg-secondary border border-chat-border text-chat-text-secondary hover:text-chat-text-primary hover:bg-chat-bg-hover",
  ghost: "text-chat-text-secondary hover:text-chat-text-primary hover:bg-chat-bg-hover",
  danger: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20",
};

export function Button({
  variant = "secondary",
  icon: Icon,
  loading,
  children,
  className,
  ...props
}: {
  variant?: ButtonVariant;
  icon?: LucideIcon;
  loading?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed",
        BUTTON_VARIANTS[variant],
        className
      )}
    >
      {loading ? (
        <RefreshCw size={15} className="animate-spin" />
      ) : (
        Icon && <Icon size={15} />
      )}
      {children}
    </button>
  );
}

export function IconButton({
  icon: Icon,
  tone = "neutral",
  title,
  className,
  ...props
}: {
  icon: LucideIcon;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger" | "purple";
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const tones: Record<string, string> = {
    neutral: "text-chat-text-secondary hover:bg-chat-bg-hover hover:text-chat-text-primary",
    accent: "text-chat-accent hover:bg-chat-accent/10",
    success: "text-emerald-500 hover:bg-emerald-500/10",
    warning: "text-amber-500 hover:bg-amber-500/10",
    danger: "text-red-500 hover:bg-red-500/10",
    purple: "text-purple-500 hover:bg-purple-500/10",
  };
  return (
    <button
      {...props}
      title={title}
      className={cn(
        "p-2 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed",
        tones[tone],
        className
      )}
    >
      <Icon size={16} />
    </button>
  );
}

/* ------------------------------------------------------------------ Search + filters */
export function SearchBar({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative flex-1 group min-w-0">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-chat-text-tertiary group-focus-within:text-chat-accent transition-colors"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-chat-bg-secondary border border-chat-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-chat-text-primary placeholder:text-chat-text-tertiary focus:outline-none focus:ring-2 focus:ring-chat-accent/20 focus:border-chat-accent transition-all"
      />
    </div>
  );
}

export function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-chat-bg-secondary border border-chat-border rounded-xl px-4 py-2.5 text-sm text-chat-text-primary focus:outline-none focus:border-chat-accent cursor-pointer min-w-[120px]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ------------------------------------------------------------------ States */
export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center pt-20 gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-chat-border border-t-chat-accent animate-spin" />
      {label && <p className="text-sm text-chat-text-tertiary font-medium">{label}</p>}
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center pt-20 text-center">
      <div className="w-16 h-16 rounded-full bg-chat-bg-secondary flex items-center justify-center mb-4 border border-chat-border">
        <Icon size={30} className="text-chat-text-tertiary" />
      </div>
      <h3 className="text-chat-text-primary font-semibold">{title}</h3>
      {description && (
        <p className="text-chat-text-tertiary text-sm mt-1 max-w-[280px]">
          {description}
        </p>
      )}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center flex flex-col items-center gap-3">
      <AlertTriangle className="text-red-400" size={24} />
      <p className="text-red-400 font-medium">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition-all"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-chat-bg-secondary rounded-xl border border-chat-border animate-pulse",
        className
      )}
    />
  );
}

/* ------------------------------------------------------------------ Pagination */
export function Pagination({
  page,
  pages,
  total,
  limit,
  onPage,
  noun = "records",
}: {
  page: number;
  pages: number;
  total: number;
  limit: number;
  onPage: (p: number) => void;
  noun?: string;
}) {
  return (
    <div className="shrink-0 px-4 sm:px-6 lg:px-8 py-4 bg-chat-bg-secondary/50 border-t border-chat-border flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-chat-text-tertiary text-xs font-medium">
        Showing{" "}
        <span className="text-chat-text-secondary">
          {total === 0 ? 0 : Math.min(total, (page - 1) * limit + 1)}-
          {Math.min(total, page * limit)}
        </span>{" "}
        of <span className="text-chat-text-secondary">{total}</span> {noun}
      </p>
      <div className="flex items-center gap-4">
        <p className="text-[11px] font-bold text-chat-text-tertiary uppercase tracking-widest hidden sm:block">
          Page {page} of {pages}
        </p>
        <div className="flex gap-1.5">
          <button
            onClick={() => onPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="p-2 bg-chat-bg-primary border border-chat-border rounded-lg text-chat-text-secondary disabled:opacity-30 disabled:cursor-not-allowed hover:text-chat-text-primary transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => onPage(Math.min(pages, page + 1))}
            disabled={page >= pages}
            className="p-2 bg-chat-bg-primary border border-chat-border rounded-lg text-chat-text-secondary disabled:opacity-30 disabled:cursor-not-allowed hover:text-chat-text-primary transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Avatar */
const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-cyan-500",
];

export function Avatar({
  src,
  name,
  className = "w-9 h-9",
}: {
  src?: string;
  name: string;
  className?: string;
}) {
  const initials = (name || "?").slice(0, 2).toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(
          "rounded-full object-cover border border-chat-border shrink-0",
          className
        )}
      />
    );
  }
  const color = AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0",
        color,
        className
      )}
    >
      {initials}
    </div>
  );
}
