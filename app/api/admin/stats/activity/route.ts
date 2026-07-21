import { withAdmin } from "@/lib/withAdmin";
import { ok } from "@/lib/api";
import Message from "@/models/Message";
import User from "@/models/User";

export const dynamic = "force-dynamic";

interface DayBucket {
  _id: { year: number; month: number; day: number };
  count: number;
}

export const GET = withAdmin("dashboard.view", async (req) => {
  const url = new URL(req.url);
  const days = Math.min(30, Math.max(7, parseInt(url.searchParams.get("days") || "7", 10) || 7));

  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const groupStage = {
    $group: {
      _id: {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      },
      count: { $sum: 1 },
    },
  };

  const [messagesPerDay, usersPerDay] = (await Promise.all([
    Message.aggregate([{ $match: { createdAt: { $gte: start } } }, groupStage]),
    User.aggregate([{ $match: { createdAt: { $gte: start } } }, groupStage]),
  ])) as [DayBucket[], DayBucket[]];

  const find = (buckets: DayBucket[], d: Date) =>
    buckets.find(
      (e) =>
        e._id.year === d.getFullYear() &&
        e._id.month === d.getMonth() + 1 &&
        e._id.day === d.getDate()
    )?.count ?? 0;

  const result: { date: string; label: string; messages: number; users: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    result.push({
      date: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
      label: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" }),
      messages: find(messagesPerDay, d),
      users: find(usersPerDay, d),
    });
  }

  return ok({ days: result });
});
