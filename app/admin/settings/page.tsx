"use client";

import { useEffect, useState } from "react";
import { Settings as SettingsIcon, ShieldCheck, UserMinus, Crown, Wrench } from "lucide-react";
import { apiFetch } from "@/lib/client/api";
import { useToast } from "@/components/admin/Toast";
import { useAdmin } from "@/components/admin/AdminProvider";
import { ConfirmDialog } from "@/components/admin/Modal";
import { PageHeader, Card, Badge, Avatar, IconButton, Spinner, ErrorState } from "@/components/admin/ui";
import { formatDate } from "@/lib/format";

interface Flag {
  key: string;
  label: string;
  description: string;
  value: boolean;
}
interface AdminUser {
  _id: string;
  username: string;
  name?: string;
  avatar?: string;
  email: string;
  adminRole?: "superadmin" | "moderator" | null;
  createdAt: string;
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-chat-accent" : "bg-chat-bg-hover"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { admin, can } = useAdmin();
  const toast = useToast();
  const [flags, setFlags] = useState<Flag[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [demoteTarget, setDemoteTarget] = useState<AdminUser | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const d = await apiFetch<{ flags: Flag[]; admins: AdminUser[] }>("/api/admin/settings");
      setFlags(d.flags);
      setAdmins(d.admins);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleFlag(flag: Flag) {
    setBusy(flag.key);
    const next = !flag.value;
    setFlags((prev) => prev.map((f) => (f.key === flag.key ? { ...f, value: next } : f)));
    try {
      await apiFetch("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ key: flag.key, value: next }),
      });
      toast.success(`${flag.label} ${next ? "enabled" : "disabled"}`);
    } catch (e) {
      setFlags((prev) => prev.map((f) => (f.key === flag.key ? { ...f, value: !next } : f)));
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setBusy(null);
    }
  }

  async function setAdminRole(user: AdminUser, adminRole: "superadmin" | "moderator") {
    setBusy(user._id);
    try {
      await apiFetch(`/api/admin/users/${user._id}`, {
        method: "PATCH",
        body: JSON.stringify({ adminRole }),
      });
      setAdmins((prev) => prev.map((a) => (a._id === user._id ? { ...a, adminRole } : a)));
      toast.success(`@${user.username} is now ${adminRole === "superadmin" ? "Super Admin" : "Moderator"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setBusy(null);
    }
  }

  async function demote(user: AdminUser) {
    setBusy(user._id);
    try {
      await apiFetch(`/api/admin/users/${user._id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: "user" }),
      });
      setAdmins((prev) => prev.filter((a) => a._id !== user._id));
      toast.success(`@${user.username} demoted to user`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setBusy(null);
    }
  }

  const roleOf = (a: AdminUser) => a.adminRole ?? "superadmin";

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      <div className="ambient-glow">
        <div className="ambient-glow-inner" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar space-y-8">
        <PageHeader title="Settings" subtitle="Feature flags and admin team management" />

        {loading ? (
          <Spinner label="Loading settings…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <>
            <div className="space-y-4">
              <h2 className="text-chat-text-tertiary text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                <Wrench size={12} /> Feature flags
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {flags.map((flag) => (
                  <Card key={flag.key} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-chat-text-primary">{flag.label}</p>
                      <p className="text-[11px] text-chat-text-tertiary">{flag.description}</p>
                    </div>
                    <Toggle
                      checked={flag.value}
                      disabled={!can("settings.manage") || busy === flag.key}
                      onChange={() => toggleFlag(flag)}
                    />
                  </Card>
                ))}
              </div>
              {!can("settings.manage") && (
                <p className="text-[11px] text-chat-text-tertiary">You have read-only access to settings.</p>
              )}
            </div>

            <div className="space-y-4">
              <h2 className="text-chat-text-tertiary text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                <ShieldCheck size={12} /> Admin team ({admins.length})
              </h2>
              <div className="flex flex-col gap-3">
                {admins.map((a) => {
                  const isSelf = a._id === admin?.id;
                  const canManage = can("admins.manage") && !isSelf;
                  return (
                    <Card key={a._id} className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar src={a.avatar} name={a.name || a.username} className="w-10 h-10" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-chat-text-primary truncate flex items-center gap-1.5">
                            {a.name || a.username}
                            {isSelf && <Badge tone="accent">You</Badge>}
                          </p>
                          <p className="text-[11px] text-chat-text-tertiary truncate">@{a.username} · joined {formatDate(a.createdAt)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {canManage ? (
                          <div className="flex rounded-lg border border-chat-border overflow-hidden">
                            {(["moderator", "superadmin"] as const).map((r) => (
                              <button
                                key={r}
                                disabled={busy === a._id}
                                onClick={() => setAdminRole(a, r)}
                                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                                  roleOf(a) === r
                                    ? "bg-chat-accent text-white"
                                    : "bg-chat-bg-primary text-chat-text-secondary hover:text-chat-text-primary"
                                }`}
                              >
                                {r === "superadmin" ? "Super" : "Mod"}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <Badge tone={roleOf(a) === "superadmin" ? "success" : "accent"}>
                            {roleOf(a) === "superadmin" ? (
                              <>
                                <Crown size={10} /> Super Admin
                              </>
                            ) : (
                              "Moderator"
                            )}
                          </Badge>
                        )}
                        {canManage && (
                          <IconButton icon={UserMinus} tone="danger" title="Remove admin access" disabled={busy === a._id} onClick={() => setDemoteTarget(a)} />
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
              {!can("admins.manage") && (
                <p className="text-[11px] text-chat-text-tertiary">Only super admins can manage the admin team.</p>
              )}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!demoteTarget}
        onClose={() => setDemoteTarget(null)}
        onConfirm={() => {
          if (demoteTarget) demote(demoteTarget);
          setDemoteTarget(null);
        }}
        title={`Remove @${demoteTarget?.username ?? ""} as admin?`}
        message="They will lose all admin access and return to a regular user account. You can re-promote them later from the Users page."
        confirmLabel="Remove admin"
        danger
        loading={busy === demoteTarget?._id}
      />
    </div>
  );
}
