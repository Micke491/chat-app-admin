import { withAdmin } from "@/lib/withAdmin";
import { ok } from "@/lib/api";
import User from "@/models/User";
import Message from "@/models/Message";
import Story from "@/models/Story";
import Report from "@/models/Report";
import Chat from "@/models/Chat";

export const dynamic = "force-dynamic";

export const GET = withAdmin("dashboard.view", async () => {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    bannedUsers,
    deactivatedUsers,
    adminUsers,
    onlineUsers,
    newUsers24h,
    totalMessages,
    removedMessages,
    messages24h,
    totalStories,
    activeStories,
    pendingReports,
    totalChats,
    groupChats,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ isBanned: true }),
    User.countDocuments({ isDeactivated: true }),
    User.countDocuments({ role: "admin" }),
    User.countDocuments({ isOnline: true }),
    User.countDocuments({ createdAt: { $gte: dayAgo } }),
    Message.countDocuments({}),
    Message.countDocuments({ $or: [{ removedByAdmin: true }, { isDeletedForEveryone: true }] }),
    Message.countDocuments({ createdAt: { $gte: dayAgo } }),
    Story.countDocuments({}),
    Story.countDocuments({ expiresAt: { $gt: now } }),
    Report.countDocuments({ status: "pending" }),
    Chat.countDocuments({}),
    Chat.countDocuments({ isGroupChat: true }),
  ]);

  return ok({
    users: {
      total: totalUsers,
      banned: bannedUsers,
      deactivated: deactivatedUsers,
      admins: adminUsers,
      online: onlineUsers,
      new24h: newUsers24h,
    },
    messages: { total: totalMessages, removed: removedMessages, last24h: messages24h },
    stories: { total: totalStories, active: activeStories },
    reports: { pending: pendingReports },
    chats: { total: totalChats, groups: groupChats, direct: totalChats - groupChats },
  });
});
