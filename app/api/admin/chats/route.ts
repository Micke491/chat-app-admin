import { withAdmin } from "@/lib/withAdmin";
import { okPaginated, parsePagination, buildPagination, escapeRegex } from "@/lib/api";
import Chat from "@/models/Chat";
import Message from "@/models/Message";

export const dynamic = "force-dynamic";

export const GET = withAdmin("chats.view", async (req) => {
  const url = new URL(req.url);
  const { page, limit, skip } = parsePagination(url, { defaultLimit: 20 });
  const search = url.searchParams.get("search")?.trim() || "";
  const type = url.searchParams.get("type") || ""; // group|direct

  const query: Record<string, unknown> = {};
  if (type === "group") query.isGroupChat = true;
  else if (type === "direct") query.isGroupChat = false;
  if (search) {
    const rx = { $regex: escapeRegex(search), $options: "i" };
    query.$or = [{ name: rx }, { participantUsernames: rx }];
  }

  const [chats, total] = await Promise.all([
    Chat.find(query)
      .populate("participants", "username avatar name")
      .populate("groupAdmin", "username")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Chat.countDocuments(query),
  ]);

  // Attach message counts for each listed chat.
  const withCounts = await Promise.all(
    chats.map(async (chat) => ({
      ...chat,
      messageCount: await Message.countDocuments({ chatId: chat._id }),
    }))
  );

  return okPaginated(withCounts, buildPagination(page, limit, total));
});
