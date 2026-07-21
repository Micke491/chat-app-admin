"use client";

import { type ReactNode, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, AlertTriangle, type LucideIcon } from "lucide-react";
import { Button } from "./ui";

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconTone = "accent",
  children,
  maxWidth = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconTone?: "accent" | "warning" | "danger" | "success";
  children: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const tones: Record<string, string> = {
    accent: "bg-chat-accent/10 text-chat-accent",
    warning: "bg-amber-500/10 text-amber-500",
    danger: "bg-red-500/10 text-red-500 border border-red-500/20",
    success: "bg-emerald-500/10 text-emerald-500",
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className={`relative w-full ${maxWidth} bg-chat-bg-secondary border border-chat-border rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar`}
          >
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                {Icon && (
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tones[iconTone]}`}
                  >
                    <Icon size={20} />
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-chat-text-primary">{title}</h3>
                  {subtitle && (
                    <p className="text-[11px] text-chat-text-tertiary mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-chat-text-tertiary hover:text-chat-text-primary transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  loading = false,
  requireReason = false,
  reason,
  onReasonChange,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  requireReason?: boolean;
  reason?: string;
  onReasonChange?: (v: string) => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      icon={danger ? AlertTriangle : undefined}
      iconTone={danger ? "danger" : "accent"}
      maxWidth="max-w-sm"
    >
      <div className="text-sm text-chat-text-secondary leading-relaxed">{message}</div>

      {requireReason && (
        <div className="mt-4">
          <label className="text-[10px] font-bold text-chat-text-tertiary uppercase tracking-widest mb-1.5 block">
            Reason {danger ? "(required)" : "(optional)"}
          </label>
          <textarea
            value={reason ?? ""}
            onChange={(e) => onReasonChange?.(e.target.value)}
            rows={2}
            placeholder="Add a note for the audit log…"
            className="w-full bg-chat-bg-primary border border-chat-border rounded-lg px-3 py-2 text-sm text-chat-text-primary placeholder:text-chat-text-tertiary focus:outline-none focus:border-chat-accent resize-none"
          />
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-chat-text-tertiary hover:bg-chat-bg-hover transition-all"
        >
          Cancel
        </button>
        <Button
          variant={danger ? "danger" : "primary"}
          loading={loading}
          disabled={requireReason && danger && !reason?.trim()}
          onClick={onConfirm}
          className="flex-1"
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
