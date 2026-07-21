import { withAdmin } from "@/lib/withAdmin";
import { okPaginated, parsePagination, buildPagination, escapeRegex } from "@/lib/api";
import AuditLog from "@/models/AuditLog";

export const dynamic = "force-dynamic";

export const GET = withAdmin("audit.view", async (req) => {
  const url = new URL(req.url);
  const { page, limit, skip } = parsePagination(url, { defaultLimit: 30, maxLimit: 100 });
  const actor = url.searchParams.get("actor")?.trim() || "";
  const targetType = url.searchParams.get("targetType") || "";
  const action = url.searchParams.get("action") || "";

  const query: Record<string, unknown> = {};
  if (actor) query.actorUsername = { $regex: escapeRegex(actor), $options: "i" };
  if (targetType) query.targetType = targetType;
  if (action) query.action = { $regex: `^${escapeRegex(action)}`, $options: "i" };

  const [entries, total] = await Promise.all([
    AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(query),
  ]);

  return okPaginated(entries, buildPagination(page, limit, total));
});
