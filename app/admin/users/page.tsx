"use client";

import { useMemo, useState } from "react";
import {
  Ban,
  ShieldCheck,
  Clock,
  XCircle,
  Trash2,
  UserX,
  UserCheck,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  BadgeCheck,
  Users as UsersIcon,
} from "lucide-react";
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
  Avatar,
  Spinner,
  EmptyState,
  ErrorState,
  Pagination,
} from "@/components/admin/ui";
import { formatDate, isTimedOut } from "@/lib/format";

interface UserRow {
  _id: string;
  username: string;
  email: string;
  name?: string;
  avatar?: string;
  role: "user" | "admin";
  adminRole?: "superadmin" | "moderator" | null;
  isBanned: boolean;
  isDeactivated: boolean;
  isEmailVerified?: boolean;
  timeoutUntil?: string;
  createdAt: string;
  isOnline?: boolean;
}

type SortField = "username" | "createdAt" | "isBanned";

export default function UsersPage() {
  const { can } = useAdmin();
  const toast = useToast();

  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);

  const [timeoutUser, setTimeoutUser] = useState<UserRow | null>(null);
  const [customTimeout, setCustomTimeout] = useState("");
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
  const [deactivateUser, setDeactivateUser] = useState<UserRow | null>(null);
  const [reason, setReason] = useState("");

  const path = useMemo(() => {
    const p = new URLSearchParams({
      page: String(page),
      limit: "20",
      sortBy,
      sortOrder,
    });
    if (search) p.set("search", search);
    if (role) p.set("role", role);
    if (status) p.set("status", status);
    return `/api/admin/users?${p.toString()}`;
  }, [page, sortBy, sortOrder, search, role, status]);

  const { items: users, pagination, loading, error, reload } = useList<UserRow>(path);

  function toggleSort(field: SortField) {
    if (sortBy === field) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortOrder(field === "username" ? "asc" : "desc");
    }
    setPage(1);
  }

  async function moderate(user: UserRow, body: Record<string, unknown>, ok: string) {
    setBusy(user._id);
    try {
      await apiFetch(`/api/admin/users/${user._id}/moderation`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      toast.success(ok);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  async function changeRole(user: UserRow) {
    setBusy(user._id);
    try {
      const makeAdmin = user.role !== "admin";
      await apiFetch(`/api/admin/users/${user._id}`, {
        method: "PATCH",
        body: JSON.stringify({
          role: makeAdmin ? "admin" : "user",
          adminRole: makeAdmin ? "moderator" : null,
        }),
      });
      toast.success(makeAdmin ? "Promoted to admin" : "Demoted to user");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  const statusOptions = [
    { label: "All Statuses", value: "" },
    { label: "Active", value: "active" },
    { label: "Banned", value: "banned" },
    { label: "Deactivated", value: "deactivated" },
    { label: "Timed Out", value: "timedout" },
  ];

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ArrowUpDown size={12} className="text-chat-text-tertiary ml-1" />;
    return sortOrder === "asc" ? (
      <ArrowUp size={12} className="text-chat-accent ml-1" />
    ) : (
      <ArrowDown size={12} className="text-chat-accent ml-1" />
    );
  };

  function StatusBadges({ user }: { user: UserRow }) {
    return (
      <div className="flex flex-wrap items-center gap-1 justify-center">
        {user.isBanned ? (
          <Badge tone="danger">Banned</Badge>
        ) : user.isDeactivated ? (
          <Badge tone="warning">Deactivated</Badge>
        ) : (
          <Badge tone="neutral">Active</Badge>
        )}
        {isTimedOut(user.timeoutUntil) && <Badge tone="warning">Timed out</Badge>}
      </div>
    );
  }

  function Actions({ user }: { user: UserRow }) {
    const b = busy === user._id;
    return (
      <div className="flex items-center gap-0.5 justify-center">
        {can("users.moderate") && (
          <>
            {isTimedOut(user.timeoutUntil) && (
              <IconButton
                icon={XCircle}
                tone="warning"
                title="Clear timeout"
                disabled={b}
                onClick={() => moderate(user, { action: "clear_timeout" }, "Timeout cleared")}
              />
            )}
            <IconButton icon={Clock} tone="warning" title="Timeout" disabled={b} onClick={() => setTimeoutUser(user)} />
            <IconButton
              icon={Ban}
              tone={user.isBanned ? "success" : "danger"}
              title={user.isBanned ? "Unban" : "Ban"}
              disabled={b}
              onClick={() =>
                moderate(
                  user,
                  { action: user.isBanned ? "unban" : "ban" },
                  user.isBanned ? "User unbanned" : "User banned"
                )
              }
            />
            <IconButton
              icon={user.isDeactivated ? UserCheck : UserX}
              tone={user.isDeactivated ? "success" : "warning"}
              title={user.isDeactivated ? "Reactivate" : "Deactivate"}
              disabled={b}
              onClick={() =>
                user.isDeactivated
                  ? moderate(user, { action: "reactivate" }, "User reactivated")
                  : setDeactivateUser(user)
              }
            />
          </>
        )}
        {can("users.role") && (
          <IconButton
            icon={ShieldCheck}
            tone="purple"
            title={user.role === "admin" ? "Demote to user" : "Make admin"}
            disabled={b}
            onClick={() => changeRole(user)}
          />
        )}
        {can("users.delete") && (
          <IconButton icon={Trash2} tone="danger" title="Delete permanently" disabled={b} onClick={() => setDeleteUser(user)} />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-chat-bg-primary relative">
      <div className="ambient-glow">
        <div className="ambient-glow-inner" />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <div className="p-4 sm:p-6 lg:p-8 pb-4 shrink-0 space-y-6">
          <PageHeader
            title="Users"
            subtitle="Manage accounts, roles, and moderation status"
            actions={<Button icon={UsersIcon} onClick={reload} loading={loading}>Refresh</Button>}
          />
          <div className="flex flex-col md:flex-row gap-3">
            <SearchBar value={searchInput} onChange={(v) => { setSearchInput(v); setPage(1); }} placeholder="Search by username, name, or email…" />
            <div className="flex gap-2 flex-wrap">
              <FilterSelect
                value={role}
                onChange={(v) => { setRole(v); setPage(1); }}
                options={[
                  { label: "All Roles", value: "" },
                  { label: "User", value: "user" },
                  { label: "Admin", value: "admin" },
                ]}
              />
              <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={statusOptions} />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 custom-scrollbar pb-8">
          {loading ? (
            <Spinner label="Loading users…" />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : users.length === 0 ? (
            <EmptyState icon={UsersIcon} title="No users found" description="Try adjusting your search or filters." />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden lg:block">
                <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1.2fr_1.4fr] gap-4 px-4 py-3 border-b border-chat-border bg-chat-bg-secondary/30 rounded-t-xl sticky top-0 z-10 backdrop-blur-md items-center">
                  <button onClick={() => toggleSort("username")} className="flex items-center text-[11px] font-bold text-chat-text-tertiary uppercase tracking-wider hover:text-chat-text-primary">
                    User <SortIcon field="username" />
                  </button>
                  <div className="text-[11px] font-bold text-chat-text-tertiary uppercase tracking-wider">Email</div>
                  <button onClick={() => toggleSort("createdAt")} className="flex items-center justify-center text-[11px] font-bold text-chat-text-tertiary uppercase tracking-wider hover:text-chat-text-primary">
                    Joined <SortIcon field="createdAt" />
                  </button>
                  <div className="text-[11px] font-bold text-chat-text-tertiary uppercase tracking-wider text-center">Role</div>
                  <button onClick={() => toggleSort("isBanned")} className="flex items-center justify-center text-[11px] font-bold text-chat-text-tertiary uppercase tracking-wider hover:text-chat-text-primary">
                    Status <SortIcon field="isBanned" />
                  </button>
                  <div className="text-[11px] font-bold text-chat-text-tertiary uppercase tracking-wider text-center">Actions</div>
                </div>
                <div className="divide-y divide-chat-border/50 bg-chat-bg-secondary/10 border-x border-b border-chat-border rounded-b-xl">
                  {users.map((user) => (
                    <div key={user._id} className="grid grid-cols-[2fr_2fr_1fr_1fr_1.2fr_1.4fr] gap-4 px-4 py-4 items-center hover:bg-chat-bg-hover/20 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar src={user.avatar} name={user.name || user.username} />
                        <div className="min-w-0">
                          <p className="text-chat-text-primary text-sm font-semibold truncate flex items-center gap-1">
                            {user.name || user.username}
                            {user.isEmailVerified && <BadgeCheck size={13} className="text-chat-accent shrink-0" />}
                          </p>
                          <p className="text-chat-text-tertiary text-xs truncate">@{user.username}</p>
                        </div>
                      </div>
                      <p className="text-chat-text-secondary text-[13px] truncate pr-2">{user.email}</p>
                      <p className="text-chat-text-tertiary text-[12px] text-center">{formatDate(user.createdAt)}</p>
                      <div className="flex justify-center">
                        <Badge tone={user.role === "admin" ? "success" : "accent"}>
                          {user.role === "admin"
                            ? user.adminRole === "moderator"
                              ? "Moderator"
                              : "Super Admin"
                            : "User"}
                        </Badge>
                      </div>
                      <StatusBadges user={user} />
                      <Actions user={user} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile cards */}
              <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                {users.map((user) => (
                  <div key={user._id} className="bg-chat-bg-secondary border border-chat-border rounded-2xl p-5 flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar src={user.avatar} name={user.name || user.username} className="w-11 h-11" />
                        <div className="min-w-0">
                          <p className="text-chat-text-primary font-bold truncate">{user.name || user.username}</p>
                          <p className="text-chat-text-tertiary text-xs truncate">@{user.username}</p>
                        </div>
                      </div>
                      <Badge tone={user.role === "admin" ? "success" : "accent"}>
                        {user.role === "admin" ? (user.adminRole === "moderator" ? "Mod" : "Super") : "User"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 py-3 border-y border-chat-border/50">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-chat-text-tertiary uppercase mb-0.5">Email</p>
                        <p className="text-xs text-chat-text-secondary truncate">{user.email}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-chat-text-tertiary uppercase mb-0.5">Joined</p>
                        <p className="text-xs text-chat-text-secondary">{formatDate(user.createdAt)}</p>
                      </div>
                    </div>
                    <StatusBadges user={user} />
                    <div className="flex justify-end">
                      <Actions user={user} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {pagination && (
          <Pagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            limit={pagination.limit}
            onPage={setPage}
            noun="users"
          />
        )}
      </div>

      {/* Timeout modal */}
      <Modal
        open={!!timeoutUser}
        onClose={() => { setTimeoutUser(null); setCustomTimeout(""); }}
        title={`Timeout @${timeoutUser?.username ?? ""}`}
        subtitle="User cannot sign in until the timeout expires"
        icon={Clock}
        iconTone="warning"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "1 Hour", h: 1 },
              { label: "24 Hours", h: 24 },
              { label: "3 Days", h: 72 },
              { label: "1 Week", h: 168 },
            ].map((q) => (
              <button
                key={q.label}
                onClick={() => {
                  if (!timeoutUser) return;
                  const d = new Date();
                  d.setHours(d.getHours() + q.h);
                  moderate(timeoutUser, { action: "timeout", timeoutUntil: d.toISOString() }, "Timeout applied");
                  setTimeoutUser(null);
                }}
                className="py-2 bg-chat-bg-primary border border-chat-border rounded-lg text-xs font-bold text-chat-text-secondary hover:border-amber-500/50 hover:text-amber-500 transition-all"
              >
                {q.label}
              </button>
            ))}
          </div>
          <div>
            <div className="text-[10px] font-bold text-chat-text-tertiary uppercase tracking-widest mb-1.5 ml-1">Custom expiry</div>
            <input
              type="datetime-local"
              value={customTimeout}
              onChange={(e) => setCustomTimeout(e.target.value)}
              className="w-full bg-chat-bg-primary border border-chat-border rounded-lg px-3 py-2 text-xs text-chat-text-primary focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <Button
            variant="primary"
            className="w-full"
            disabled={!customTimeout}
            onClick={() => {
              if (!timeoutUser || !customTimeout) return;
              moderate(timeoutUser, { action: "timeout", timeoutUntil: new Date(customTimeout).toISOString() }, "Timeout applied");
              setTimeoutUser(null);
              setCustomTimeout("");
            }}
          >
            Set timeout
          </Button>
        </div>
      </Modal>

      {/* Deactivate confirm */}
      <ConfirmDialog
        open={!!deactivateUser}
        onClose={() => { setDeactivateUser(null); setReason(""); }}
        onConfirm={() => {
          if (!deactivateUser) return;
          moderate(deactivateUser, { action: "deactivate", reason }, "User deactivated");
          setDeactivateUser(null);
          setReason("");
        }}
        title={`Deactivate @${deactivateUser?.username ?? ""}?`}
        message="The account will be reversibly disabled and unable to sign in. You can reactivate it at any time."
        confirmLabel="Deactivate"
        loading={busy === deactivateUser?._id}
        requireReason
        reason={reason}
        onReasonChange={setReason}
      />

      {/* Delete confirm (super admin) */}
      <ConfirmDialog
        open={!!deleteUser}
        onClose={() => { setDeleteUser(null); setReason(""); }}
        onConfirm={() => {
          if (!deleteUser) return;
          moderate(deleteUser, { action: "delete", reason }, "User permanently deleted");
          setDeleteUser(null);
          setReason("");
        }}
        title={`Permanently delete @${deleteUser?.username ?? ""}?`}
        message="This erases the account and all of its messages, stories, and reports. This cannot be undone — prefer Deactivate unless removal is required."
        confirmLabel="Hard delete"
        danger
        loading={busy === deleteUser?._id}
        requireReason
        reason={reason}
        onReasonChange={setReason}
      />
    </div>
  );
}
