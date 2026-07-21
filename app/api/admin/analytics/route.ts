import { withAdmin } from "@/lib/withAdmin";
import { ok } from "@/lib/api";
import User from "@/models/User";
import Message from "@/models/Message";

export const dynamic = "force-dynamic";

interface DayBucket {
  _id: { year: number; month: number; day: number };
  count: number;
}

function seriesFromBuckets(buckets: DayBucket[], start: Date, days: number) {
  const find = (d: Date) =>
    buckets.find(
      (b) => b._id.year === d.getFullYear() && b._id.month === d.getMonth() + 1 && b._id.day === d.getDate()
    )?.count ?? 0;
  const out: { label: string; value: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push({ label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), value: find(d) });
  }
  return out;
}

export const GET = withAdmin("analytics.view", async (req) => {
  const url = new URL(req.url);
  const days = Math.min(90, Math.max(7, parseInt(url.searchParams.get("days") || "30", 10) || 30));

  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  const monthAgo = new Date(Date.now() - 30 * 864e5);

  const dayGroup = {
    $group: {
      _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" }, day: { $dayOfMonth: "$createdAt" } },
      count: { $sum: 1 },
    },
  };

  const [
    newUsersBuckets,
    messagesBuckets,
    dauBuckets,
    totalUsers,
    totalMessages,
    mau,
    mediaBreakdown,
    topUsers,
  ] = await Promise.all([
    User.aggregate([{ $match: { createdAt: { $gte: start } } }, dayGroup]) as Promise<DayBucket[]>,
    Message.aggregate([{ $match: { createdAt: { $gte: start } } }, dayGroup]) as Promise<DayBucket[]>,
    Message.aggregate([
      { $match: { createdAt: { $gte: start } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
            sender: "$sender",
          },
        },
      },
      {
        $group: {
          _id: { year: "$_id.year", month: "$_id.month", day: "$_id.day" },
          count: { $sum: 1 },
        },
      },
    ]) as Promise<DayBucket[]>,
    User.countDocuments({}),
    Message.countDocuments({}),
    Message.distinct("sender", { createdAt: { $gte: monthAgo } }).then((s) => s.length),
    Message.aggregate([
      { $match: { mediaType: { $exists: true, $ne: null } } },
      { $group: { _id: "$mediaType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]) as Promise<{ _id: string; count: number }[]>,
    Message.aggregate([
      { $group: { _id: "$sender", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { $project: { count: 1, username: "$user.username", name: "$user.name", avatar: "$user.avatar" } },
    ]) as Promise<{ count: number; username: string; name?: string; avatar?: string }[]>,
  ]);

  return ok({
    range: { days, start: start.toISOString() },
    totals: {
      users: totalUsers,
      messages: totalMessages,
      mau,
      avgMessagesPerUser: totalUsers ? Math.round((totalMessages / totalUsers) * 10) / 10 : 0,
    },
    series: {
      newUsers: seriesFromBuckets(newUsersBuckets, start, days),
      messages: seriesFromBuckets(messagesBuckets, start, days),
      dau: seriesFromBuckets(dauBuckets, start, days),
    },
    mediaBreakdown: mediaBreakdown.map((m) => ({ label: m._id, value: m.count })),
    topUsers: topUsers.map((u) => ({ label: `@${u.username}`, sub: u.name, value: u.count })),
  });
});
