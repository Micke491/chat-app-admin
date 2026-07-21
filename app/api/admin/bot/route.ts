import { withAdmin } from "@/lib/withAdmin";
import { ok, fail } from "@/lib/api";
import BotChat from "@/models/BotChat";
import User from "@/models/User";
import AdminSetting from "@/models/AdminSetting";

export const dynamic = "force-dynamic";

const DEFAULT_PERSONA_KEY = "bot.defaultPersona";

export const GET = withAdmin("bot.view", async () => {
  const [totalChats, msgAgg, usersWithPersona, recentChats, personaSetting] = await Promise.all([
    BotChat.countDocuments({}),
    BotChat.aggregate([{ $group: { _id: null, total: { $sum: { $size: "$messages" } } } }]) as Promise<
      { total: number }[]
    >,
    User.countDocuments({ botPersona: { $nin: ["", null] } }),
    BotChat.find({})
      .populate("userId", "username avatar")
      .sort({ updatedAt: -1 })
      .limit(12)
      .lean(),
    AdminSetting.findOne({ key: DEFAULT_PERSONA_KEY }).lean(),
  ]);

  const totalMessages = msgAgg[0]?.total ?? 0;

  return ok({
    stats: {
      totalChats,
      totalMessages,
      usersWithPersona,
      avgMessagesPerChat: totalChats ? Math.round((totalMessages / totalChats) * 10) / 10 : 0,
    },
    defaultPersona: (personaSetting?.value as string) ?? "",
    recentChats: recentChats.map((c) => ({
      _id: String(c._id),
      title: c.title || "Untitled",
      messageCount: c.messages?.length ?? 0,
      pinned: c.pinned,
      updatedAt: c.updatedAt,
      user: c.userId as unknown as { username?: string; avatar?: string } | null,
    })),
  });
});

export const PATCH = withAdmin("bot.manage", async (req, { auth, audit }) => {
  const body = await req.json().catch(() => ({}));
  if (typeof body.defaultPersona !== "string") return fail("defaultPersona must be a string", 400);
  const value = body.defaultPersona.slice(0, 2000);

  await AdminSetting.findOneAndUpdate(
    { key: DEFAULT_PERSONA_KEY },
    { key: DEFAULT_PERSONA_KEY, value, label: "Default bot persona", updatedBy: auth.id },
    { upsert: true }
  );

  await audit({
    action: "setting.update",
    targetType: "setting",
    targetLabel: DEFAULT_PERSONA_KEY,
    metadata: { length: value.length },
  });

  return ok({ defaultPersona: value });
});
