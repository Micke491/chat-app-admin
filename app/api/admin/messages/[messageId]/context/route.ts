import { withAdmin } from "@/lib/withAdmin";
import { ok, fail } from "@/lib/api";
import Message from "@/models/Message";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ messageId: string }> };

const CONTEXT = 6;

export const GET = withAdmin<RouteCtx>("messages.view", async (_req, _admin, { params }) => {
  const { messageId } = await params;
  const pivot = await Message.findById(messageId).lean();
  if (!pivot) return fail("Message not found", 404);

  const [before, after, pivotPopulated] = await Promise.all([
    Message.find({ chatId: pivot.chatId, createdAt: { $lt: pivot.createdAt } })
      .sort({ createdAt: -1 })
      .limit(CONTEXT)
      .populate("sender", "username avatar")
      .lean(),
    Message.find({ chatId: pivot.chatId, createdAt: { $gt: pivot.createdAt } })
      .sort({ createdAt: 1 })
      .limit(CONTEXT)
      .populate("sender", "username avatar")
      .lean(),
    Message.findById(messageId).populate("sender", "username avatar").lean(),
  ]);

  const messages = [
    ...before.reverse(),
    { ...pivotPopulated, _isPivot: true },
    ...after,
  ];

  return ok({ messages, chatId: pivot.chatId });
});
