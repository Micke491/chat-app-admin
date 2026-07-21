import { withAdmin } from "@/lib/withAdmin";
import { okPaginated, ok, fail, parsePagination, buildPagination } from "@/lib/api";
import Announcement from "@/models/Announcement";
import User from "@/models/User";

export const dynamic = "force-dynamic";

async function audienceCount(audience: string): Promise<number> {
  if (audience === "admins") return User.countDocuments({ role: "admin" });
  if (audience === "active") {
    const monthAgo = new Date(Date.now() - 30 * 864e5);
    return User.countDocuments({ lastSeen: { $gte: monthAgo } });
  }
  return User.countDocuments({});
}

export const GET = withAdmin("broadcast.view", async (req) => {
  const url = new URL(req.url);
  const { page, limit, skip } = parsePagination(url, { defaultLimit: 20 });
  const [items, total] = await Promise.all([
    Announcement.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Announcement.countDocuments({}),
  ]);
  return okPaginated(items, buildPagination(page, limit, total));
});

export const POST = withAdmin("broadcast.send", async (req, { auth, audit }) => {
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || "").trim();
  const text = String(body.body || "").trim();
  const audience = ["all", "admins", "active"].includes(body.audience) ? body.audience : "all";

  if (!title) return fail("Title is required", 400);
  if (!text) return fail("Message body is required", 400);

  const deliveredCount = await audienceCount(audience);

  const announcement = await Announcement.create({
    title,
    body: text,
    audience,
    status: "sent",
    createdBy: auth.id,
    createdByUsername: auth.username,
    sentAt: new Date(),
    deliveredCount,
  });

  await audit({
    action: "announcement.send",
    targetType: "announcement",
    targetId: String(announcement._id),
    targetLabel: title,
    metadata: { audience, deliveredCount },
  });

  return ok({ announcement });
});
