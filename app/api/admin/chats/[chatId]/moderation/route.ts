import { withAdmin } from "@/lib/withAdmin";
import { ok, fail } from "@/lib/api";
import Chat from "@/models/Chat";
import Message from "@/models/Message";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ chatId: string }> };

/** Delete a conversation (and its messages) or remove a member from a group. */
export const POST = withAdmin<RouteCtx>("chats.moderate", async (req, { audit }, { params }) => {
  const { chatId } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body.action as "delete" | "remove_member";
  const reason: string | undefined = body.reason?.trim() || undefined;

  const chat = await Chat.findById(chatId);
  if (!chat) return fail("Chat not found", 404);

  if (action === "delete") {
    await Promise.all([Chat.findByIdAndDelete(chatId), Message.deleteMany({ chatId })]);
    await audit({
      action: "chat.delete",
      targetType: "chat",
      targetId: chatId,
      targetLabel: chat.name || (chat.isGroupChat ? "Group" : "Direct chat"),
      reason,
    });
    return ok({ deleted: true });
  }

  if (action === "remove_member") {
    if (!chat.isGroupChat) return fail("Not a group chat", 400);
    const memberId = String(body.memberId || "");
    if (!memberId) return fail("memberId is required", 400);
    await Chat.updateOne({ _id: chatId }, { $pull: { participants: memberId } });
    await audit({
      action: "chat.remove_member",
      targetType: "chat",
      targetId: chatId,
      targetLabel: chat.name || "Group",
      metadata: { memberId },
      reason,
    });
    return ok({ removed: true });
  }

  return fail("Invalid action", 400);
});
