import { withAdmin } from "@/lib/withAdmin";
import { ok, fail } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import User from "@/models/User";
import Message from "@/models/Message";
import Story from "@/models/Story";
import Report from "@/models/Report";
import Chat from "@/models/Chat";

type RouteCtx = { params: Promise<{ userId: string }> };

type Action =
  | "ban"
  | "unban"
  | "timeout"
  | "clear_timeout"
  | "deactivate"
  | "reactivate"
  | "delete";

const MODERATE_ACTIONS: Action[] = [
  "ban",
  "unban",
  "timeout",
  "clear_timeout",
  "deactivate",
  "reactivate",
];

export const POST = withAdmin<RouteCtx>(null, async (req, { auth, audit }, { params }) => {
  const { userId } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body.action as Action;
  const reason: string | undefined = body.reason?.trim() || undefined;

  if (auth.id === userId) return fail("You cannot moderate your own account", 400);

  // Permission gating: delete requires the privileged permission.
  if (action === "delete") {
    if (!hasPermission(auth.adminRole, "users.delete")) {
      return fail("Forbidden: hard delete requires super admin", 403);
    }
  } else if (MODERATE_ACTIONS.includes(action)) {
    if (!hasPermission(auth.adminRole, "users.moderate")) {
      return fail("Forbidden: insufficient permissions", 403);
    }
  } else {
    return fail("Invalid action", 400);
  }

  const target = await User.findById(userId);
  if (!target) return fail("User not found", 404);

  // Only super admins may act on another admin account.
  if (target.role === "admin" && !hasPermission(auth.adminRole, "users.role")) {
    return fail("Forbidden: you cannot moderate an admin account", 403);
  }

  const label = `@${target.username}`;

  switch (action) {
    case "ban":
    case "unban": {
      target.isBanned = action === "ban";
      await target.save();
      await audit({ action: `user.${action}`, targetType: "user", targetId: userId, targetLabel: label, reason });
      return ok({ isBanned: target.isBanned });
    }
    case "timeout": {
      if (!body.timeoutUntil) return fail("timeoutUntil is required", 400);
      const until = new Date(body.timeoutUntil);
      if (Number.isNaN(until.getTime())) return fail("Invalid timeout date", 400);
      target.timeoutUntil = until;
      await target.save();
      await audit({ action: "user.timeout", targetType: "user", targetId: userId, targetLabel: label, reason, metadata: { until } });
      return ok({ timeoutUntil: until });
    }
    case "clear_timeout": {
      target.timeoutUntil = undefined;
      await target.save();
      await audit({ action: "user.clear_timeout", targetType: "user", targetId: userId, targetLabel: label });
      return ok({ timeoutUntil: null });
    }
    case "deactivate": {
      target.isDeactivated = true;
      target.deactivatedBy = auth.id as unknown as typeof target.deactivatedBy;
      target.deactivatedAt = new Date();
      target.deactivationReason = reason;
      await target.save();
      await audit({ action: "user.deactivate", targetType: "user", targetId: userId, targetLabel: label, reason });
      return ok({ isDeactivated: true });
    }
    case "reactivate": {
      target.isDeactivated = false;
      target.deactivatedBy = undefined;
      target.deactivatedAt = undefined;
      target.deactivationReason = undefined;
      await target.save();
      await audit({ action: "user.reactivate", targetType: "user", targetId: userId, targetLabel: label });
      return ok({ isDeactivated: false });
    }
    case "delete": {
      await Promise.all([
        User.findByIdAndDelete(userId),
        Message.deleteMany({ sender: userId }),
        Story.deleteMany({ userId }),
        Report.deleteMany({ $or: [{ reporterId: userId }, { targetId: userId }] }),
        Chat.updateMany({ participants: userId }, { $pull: { participants: userId } }),
      ]);
      await audit({ action: "user.delete", targetType: "user", targetId: userId, targetLabel: label, reason });
      return ok({ deleted: true });
    }
    default:
      return fail("Invalid action", 400);
  }
});
