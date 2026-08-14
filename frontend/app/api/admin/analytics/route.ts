import { NextResponse } from "next/server";
import { verifyAuth } from "../../../../lib/auth";
import { tursoQuery, tursoQueryOne } from "../../../../lib/db";

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const totalUsersRow = await tursoQueryOne("SELECT COUNT(*) as c FROM users");
  const activeSubscribersRow = await tursoQueryOne("SELECT COUNT(*) as c FROM users WHERE subscriptionEndsAt IS NOT NULL AND datetime(subscriptionEndsAt) > datetime('now')");
  const totalSeriesRow = await tursoQueryOne("SELECT COUNT(*) as c FROM series");
  const totalEpisodesRow = await tursoQueryOne("SELECT COUNT(*) as c FROM episodes");
  const totalRevenueRow = await tursoQueryOne("SELECT SUM(amount) as s FROM subscriptions WHERE status = 'active' OR status = 'completed'");
  const totalWatchTimeRow = await tursoQueryOne("SELECT SUM(duration) as s FROM watch_history");

  const topSeries = await tursoQuery("SELECT id, title, views, thumbnail FROM series ORDER BY views DESC LIMIT 5");

  return NextResponse.json({
    totalUsers: totalUsersRow?.c || 0,
    activeSubscribers: activeSubscribersRow?.c || 0,
    totalSeries: totalSeriesRow?.c || 0,
    totalEpisodes: totalEpisodesRow?.c || 0,
    totalRevenue: totalRevenueRow?.s || (activeSubscribersRow?.c || 0) * 39,
    totalWatchHours: Math.round(((totalWatchTimeRow?.s || 0) / 3600) * 10) / 10,
    topSeries: topSeries.map((s: any) => ({
      ...s,
      _id: s.id,
      thumbnail: s.thumbnail || ""
    }))
  });
}
