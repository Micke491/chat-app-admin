import { withAdmin } from "@/lib/withAdmin";
import { ok, fail } from "@/lib/api";
import Message from "@/models/Message";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ messageId: string }> };

/** Soft-remove or restore a message. Content is retained for the audit trail. */
export const POST = withAdmin<RouteCtx>("messages.moderate", async (req, { auth, audit }, { params }) => {
  const { messageId } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body.action as "remove" | "restore";
  const reason: string | undefined = body.reason?.trim() || undefined;

  const message = await Message.findById(messageId);
  if (!message) return fail("Message not found", 404);

  if (action === "remove") {
    message.removedByAdmin = true;
    message.removedBy = auth.id as unknown as typeof message.removedBy;
    message.removedAt = new Date();
    message.removeReason = reason;
    await message.save();
    await audit({ action: "message.remove", targetType: "message", targetId: messageId, reason });
    return ok({ removedByAdmin: true });
  }

  if (action === "restore") {
    message.removedByAdmin = false;
    message.removedBy = undefined;
    message.removedAt = undefined;
    message.removeReason = undefined;
    await message.save();
    await audit({ action: "message.restore", targetType: "message", targetId: messageId });
    return ok({ removedByAdmin: false });
  }

  return fail("Invalid action", 400);
});
