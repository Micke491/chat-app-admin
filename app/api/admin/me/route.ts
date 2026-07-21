import { withAdmin } from "@/lib/withAdmin";
import { ok } from "@/lib/api";
import { getPermissions } from "@/lib/permissions";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export const GET = withAdmin(null, async (_req, { auth }) => {
  const user = await User.findById(auth.id)
    .select("username name email avatar role adminRole createdAt")
    .lean();

  return ok({
    id: auth.id,
    username: user?.username ?? auth.username,
    name: user?.name ?? "",
    email: user?.email ?? auth.email ?? "",
    avatar: user?.avatar ?? "",
    role: auth.role,
    adminRole: auth.adminRole,
    permissions: getPermissions(auth.adminRole),
  });
});
