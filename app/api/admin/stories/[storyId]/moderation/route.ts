import { withAdmin } from "@/lib/withAdmin";
import { ok, fail } from "@/lib/api";
import Story from "@/models/Story";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ storyId: string }> };

/** Soft-remove or restore a story. */
export const POST = withAdmin<RouteCtx>("stories.moderate", async (req, { auth, audit }, { params }) => {
  const { storyId } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body.action as "remove" | "restore";
  const reason: string | undefined = body.reason?.trim() || undefined;

  const story = await Story.findById(storyId);
  if (!story) return fail("Story not found", 404);

  if (action === "remove") {
    story.removedByAdmin = true;
    story.removedBy = auth.id as unknown as typeof story.removedBy;
    story.removedAt = new Date();
    story.removeReason = reason;
    await story.save();
    await audit({ action: "story.remove", targetType: "story", targetId: storyId, reason });
    return ok({ removedByAdmin: true });
  }

  if (action === "restore") {
    story.removedByAdmin = false;
    story.removedBy = undefined;
    story.removedAt = undefined;
    story.removeReason = undefined;
    await story.save();
    await audit({ action: "story.restore", targetType: "story", targetId: storyId });
    return ok({ removedByAdmin: false });
  }

  return fail("Invalid action", 400);
});
