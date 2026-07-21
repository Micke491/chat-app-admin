import { withAdmin } from "@/lib/withAdmin";
import { ok, fail } from "@/lib/api";
import Report from "@/models/Report";

type RouteCtx = { params: Promise<{ id: string }> };

/** Resolve or dismiss a report and optionally attach admin notes. */
export const PATCH = withAdmin<RouteCtx>("reports.resolve", async (req, { audit }, { params }) => {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const update: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (!["pending", "resolved", "dismissed"].includes(body.status)) {
      return fail("Invalid status", 400);
    }
    update.status = body.status;
  }
  if (body.adminNotes !== undefined) {
    update.adminNotes = String(body.adminNotes).slice(0, 1000);
  }
  if (Object.keys(update).length === 0) return fail("Nothing to update", 400);

  const report = await Report.findByIdAndUpdate(id, update, { new: true }).lean();
  if (!report) return fail("Report not found", 404);

  await audit({
    action: `report.${update.status ?? "update"}`,
    targetType: "report",
    targetId: id,
    metadata: { status: update.status },
  });

  return ok({ report });
});
