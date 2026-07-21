import { withAdmin } from "@/lib/withAdmin";
import { okPaginated, parsePagination, buildPagination, escapeRegex } from "@/lib/api";
import User from "@/models/User";

export const dynamic = "force-dynamic";

const ALLOWED_SORT = ["username", "createdAt", "lastSeen", "isBanned"];

export const GET = withAdmin("users.view", async (req) => {
  const url = new URL(req.url);
  const { page, limit, skip } = parsePagination(url, { defaultLimit: 20 });
  const search = url.searchParams.get("search")?.trim() || "";
  const role = url.searchParams.get("role") || "";
  const status = url.searchParams.get("status") || ""; // banned|deactivated|timedout|active
  const sortByRaw = url.searchParams.get("sortBy") || "createdAt";
  const sortBy = ALLOWED_SORT.includes(sortByRaw) ? sortByRaw : "createdAt";
  const sortOrder = url.searchParams.get("sortOrder") === "asc" ? 1 : -1;

  const query: Record<string, unknown> = {};
  if (search) {
    const rx = { $regex: escapeRegex(search), $options: "i" };
    query.$or = [{ username: rx }, { email: rx }, { name: rx }];
  }
  if (role === "user" || role === "admin") query.role = role;
  if (status === "banned") query.isBanned = true;
  else if (status === "deactivated") query.isDeactivated = true;
  else if (status === "timedout") query.timeoutUntil = { $gt: new Date() };
  else if (status === "active") {
    query.isBanned = false;
    query.isDeactivated = false;
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select("-password -twoFactorSecret -resetPasswordToken -resetPasswordExpires")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  return okPaginated(users, buildPagination(page, limit, total));
});
