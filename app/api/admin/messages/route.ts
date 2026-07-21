import { withAdmin } from "@/lib/withAdmin";
import { okPaginated, parsePagination, buildPagination, escapeRegex } from "@/lib/api";
import Message from "@/models/Message";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export const GET = withAdmin("messages.view", async (req) => {
  const url = new URL(req.url);
  const { page, limit, skip } = parsePagination(url, { defaultLimit: 40, maxLimit: 100 });
  const search = url.searchParams.get("search")?.trim() || "";
  const filter = url.searchParams.get("filter") || ""; // removed|media|all

  const query: Record<string, unknown> = {};

  if (search.startsWith("@") && search.length > 1) {
    const term = escapeRegex(search.slice(1));
    const matching = await User.find({
      $or: [{ username: { $regex: term, $options: "i" } }, { email: { $regex: term, $options: "i" } }],
    })
      .select("_id")
      .lean();
    const ids = matching.map((u) => u._id);
    query.$or = [
      ...(ids.length ? [{ sender: { $in: ids } }] : []),
      { senderUsername: { $regex: term, $options: "i" } },
    ];
  } else if (search) {
    query.text = { $regex: escapeRegex(search), $options: "i" };
  }

  if (filter === "removed") {
    query.$or = [{ removedByAdmin: true }, { isDeletedForEveryone: true }];
  } else if (filter === "media") {
    query.mediaUrl = { $exists: true, $ne: null };
  }

  const [messages, total] = await Promise.all([
    Message.find(query)
      .populate("sender", "username email avatar")
      .populate("chatId", "isGroupChat name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Message.countDocuments(query),
  ]);

  return okPaginated(messages, buildPagination(page, limit, total));
});
