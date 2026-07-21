import { withAdmin } from "@/lib/withAdmin";
import { okPaginated, parsePagination, buildPagination } from "@/lib/api";
import Report from "@/models/Report";
import User from "@/models/User";
import Message from "@/models/Message";
import Story from "@/models/Story";

export const dynamic = "force-dynamic";

export const GET = withAdmin("reports.view", async (req) => {
  const url = new URL(req.url);
  const { page, limit, skip } = parsePagination(url, { defaultLimit: 20 });
  const status = url.searchParams.get("status") || "";

  const query: Record<string, unknown> = {};
  if (["pending", "resolved", "dismissed"].includes(status)) query.status = status;

  const [reports, total] = await Promise.all([
    Report.find(query)
      .populate("reporterId", "username name avatar email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Report.countDocuments(query),
  ]);

  // Attach a lightweight snapshot of each report's target for context.
  const enriched = await Promise.all(
    reports.map(async (report) => {
      let target: unknown = null;
      try {
        if (report.targetType === "user") {
          target = await User.findById(report.targetId)
            .select("username name avatar email isBanned isDeactivated")
            .lean();
        } else if (report.targetType === "message") {
          target = await Message.findById(report.targetId)
            .select("text mediaType removedByAdmin isDeletedForEveryone sender senderUsername")
            .populate("sender", "username name avatar")
            .lean();
        } else if (report.targetType === "story") {
          target = await Story.findById(report.targetId)
            .select("mediaUrl mediaType caption removedByAdmin userId")
            .populate("userId", "username name avatar")
            .lean();
        }
      } catch {
        target = null;
      }
      return { ...report, target };
    })
  );

  return okPaginated(enriched, buildPagination(page, limit, total));
});
