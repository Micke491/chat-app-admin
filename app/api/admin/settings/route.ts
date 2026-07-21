import { withAdmin } from "@/lib/withAdmin";
import { ok, fail } from "@/lib/api";
import AdminSetting from "@/models/AdminSetting";
import User from "@/models/User";

export const dynamic = "force-dynamic";

interface FlagDef {
  key: string;
  label: string;
  description: string;
  default: boolean;
}

const FLAGS: FlagDef[] = [
  {
    key: "registrationOpen",
    label: "Open registration",
    description: "Allow new users to create accounts.",
    default: true,
  },
  {
    key: "storiesEnabled",
    label: "Stories enabled",
    description: "Allow users to post ephemeral stories.",
    default: true,
  },
  {
    key: "maintenanceMode",
    label: "Maintenance mode",
    description: "Display a maintenance notice across the platform.",
    default: false,
  },
];

export const GET = withAdmin("settings.view", async () => {
  const [stored, admins] = await Promise.all([
    AdminSetting.find({ key: { $in: FLAGS.map((f) => f.key) } }).lean(),
    User.find({ role: "admin" })
      .select("username name avatar email adminRole createdAt")
      .sort({ createdAt: 1 })
      .lean(),
  ]);

  const storedMap = new Map(stored.map((s) => [s.key, s.value]));
  const flags = FLAGS.map((f) => ({
    key: f.key,
    label: f.label,
    description: f.description,
    value: storedMap.has(f.key) ? Boolean(storedMap.get(f.key)) : f.default,
  }));

  return ok({ flags, admins });
});

export const PATCH = withAdmin("settings.manage", async (req, { auth, audit }) => {
  const body = await req.json().catch(() => ({}));
  const key = String(body.key || "");
  if (!FLAGS.some((f) => f.key === key)) return fail("Unknown setting", 400);
  const value = Boolean(body.value);

  await AdminSetting.findOneAndUpdate(
    { key },
    { key, value, updatedBy: auth.id },
    { upsert: true }
  );

  await audit({
    action: "setting.update",
    targetType: "setting",
    targetLabel: key,
    metadata: { value },
  });

  return ok({ key, value });
});
