import { withAdmin } from "@/lib/withAdmin";
import { okPaginated, parsePagination, buildPagination } from "@/lib/api";
import Story from "@/models/Story";

export const dynamic = "force-dynamic";

export const GET = withAdmin("stories.view", async (req) => {
  const url = new URL(req.url);
  const { page, limit, skip } = parsePagination(url, { defaultLimit: 24, maxLimit: 60 });
  const filter = url.searchParams.get("filter") || ""; // active|removed

  const query: Record<string, unknown> = {};
  if (filter === "active") query.expiresAt = { $gt: new Date() };
  else if (filter === "removed") query.removedByAdmin = true;

  const [stories, total] = await Promise.all([
    Story.find(query)
      .populate("userId", "username email avatar name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Story.countDocuments(query),
  ]);

  return okPaginated(stories, buildPagination(page, limit, total));
});
