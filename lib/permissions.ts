import type { AdminRole } from "@/models/User";

/**
 * Every distinct capability an admin route can require.
 * Keep this list the single source of truth for authorization.
 */
export type Permission =
  // Read access to the various admin sections
  | "dashboard.view"
  | "analytics.view"
  | "users.view"
  | "chats.view"
  | "messages.view"
  | "stories.view"
  | "reports.view"
  | "audit.view"
  | "broadcast.view"
  | "bot.view"
  | "settings.view"
  // Moderation (available to moderators)
  | "users.moderate" // ban / timeout / deactivate
  | "messages.moderate" // soft-remove / restore
  | "stories.moderate"
  | "reports.resolve"
  // Privileged (super admin only)
  | "users.role" // promote / demote admins, change adminRole
  | "users.delete" // hard delete
  | "chats.moderate" // lock / delete groups
  | "broadcast.send"
  | "bot.manage"
  | "settings.manage"
  | "admins.manage";

const MODERATOR_PERMISSIONS: Permission[] = [
  "dashboard.view",
  "analytics.view",
  "users.view",
  "chats.view",
  "messages.view",
  "stories.view",
  "reports.view",
  "audit.view",
  "broadcast.view",
  "bot.view",
  "users.moderate",
  "messages.moderate",
  "stories.moderate",
  "reports.resolve",
];

// Super admins can do everything; derived as moderator perms + privileged perms.
const SUPERADMIN_PERMISSIONS: Permission[] = [
  ...MODERATOR_PERMISSIONS,
  "settings.view",
  "users.role",
  "users.delete",
  "chats.moderate",
  "broadcast.send",
  "bot.manage",
  "settings.manage",
  "admins.manage",
];

const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  moderator: MODERATOR_PERMISSIONS,
  superadmin: SUPERADMIN_PERMISSIONS,
};

/**
 * Resolve the effective admin role. Any account with role === 'admin' but no
 * explicit adminRole is treated as a super admin (backward compatible with the
 * pre-rebuild single-role model).
 */
export function resolveAdminRole(
  role: string | undefined,
  adminRole: AdminRole | undefined
): AdminRole | null {
  if (role !== "admin") return null;
  return adminRole ?? "superadmin";
}

export function getPermissions(adminRole: AdminRole | null): Permission[] {
  if (!adminRole) return [];
  return ROLE_PERMISSIONS[adminRole];
}

export function hasPermission(
  adminRole: AdminRole | null,
  permission: Permission
): boolean {
  if (!adminRole) return false;
  return ROLE_PERMISSIONS[adminRole].includes(permission);
}
