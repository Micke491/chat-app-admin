import { withAdmin } from "@/lib/withAdmin";
import { ok, fail } from "@/lib/api";
import Chat from "@/models/Chat";
import Message from "@/models/Message";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ chatId: string }> };

export const GET = withAdmin<RouteCtx>("chats.view", async (_req, _admin, { params }) => {
  const { chatId } = await params;

  const chat = await Chat.findById(chatId)
    .populate("participants", "username avatar name email isBanned isDeactivated")
    .populate("groupAdmin", "username avatar")
    .lean();
  if (!chat) return fail("Chat not found", 404);

  const [recentMessages, messageCount] = await Promise.all([
    Message.find({ chatId })
      .populate("sender", "username avatar")
      .sort({ createdAt: -1 })
      .limit(30)
      .lean(),
    Message.countDocuments({ chatId }),
  ]);

  return ok({ chat, recentMessages: recentMessages.reverse(), messageCount });
});
