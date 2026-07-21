import { withAdmin } from "@/lib/withAdmin";
import { ok, fail } from "@/lib/api";
import User from "@/models/User";

type RouteCtx = { params: Promise<{ userId: string }> };

/** Change a user's platform role and/or admin tier. Super admin only. */
export const PATCH = withAdmin<RouteCtx>("users.role", async (req, { auth, audit }, { params }) => {
  const { userId } = await params;
  if (auth.id === userId) {
    return fail("You cannot change your own role", 400);
  }

  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if (body.role !== undefined) {
    if (!["user", "admin"].includes(body.role)) return fail("Invalid role", 400);
    update.role = body.role;
    // Demoting to a normal user clears any admin tier.
    if (body.role === "user") update.adminRole = undefined;
  }
  if (body.adminRole !== undefined) {
    if (body.adminRole !== null && !["superadmin", "moderator"].includes(body.adminRole)) {
      return fail("Invalid admin role", 400);
    }
    update.adminRole = body.adminRole ?? undefined;
  }

  if (Object.keys(update).length === 0) return fail("No valid fields to update", 400);

  const target = await User.findById(userId).lean();
  if (!target) return fail("User not found", 404);

  const updated = await User.findByIdAndUpdate(userId, { $set: update }, { new: true })
    .select("-password -twoFactorSecret -resetPasswordToken")
    .lean();

  await audit({
    action: "user.role",
    targetType: "user",
    targetId: userId,
    targetLabel: `@${target.username}`,
    metadata: { before: { role: target.role, adminRole: target.adminRole }, after: update },
  });

  return ok({ user: updated });
});
