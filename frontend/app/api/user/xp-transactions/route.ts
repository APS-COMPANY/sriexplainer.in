import { NextResponse } from "next/server";
import { verifyAuth } from "../../../../lib/auth";
import { tursoQuery, tursoQueryOne } from "../../../../lib/db";

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.user) {
    return NextResponse.json({ message: auth.error || "Authentication required" }, { status: 401 });
  }

  try {
    const user = await tursoQueryOne("SELECT id, xpCoins FROM users WHERE id = ?", [auth.user.id]);
    const xpCoins = Number(user?.xpCoins || 0);

    const transactions = await tursoQuery(
      "SELECT id, type, amount, balanceBefore, balanceAfter, description, referenceId, createdAt FROM xp_transactions WHERE userId = ? ORDER BY createdAt DESC LIMIT 50",
      [auth.user.id]
    );

    const unlocks = await tursoQuery(
      "SELECT eu.id, eu.episodeId, eu.coinsPaid, eu.unlockedAt, e.title as episodeTitle, e.number as episodeNumber, s.title as seriesTitle FROM episode_unlocks eu JOIN episodes e ON eu.episodeId = e.id JOIN series s ON e.seriesId = s.id WHERE eu.userId = ? ORDER BY eu.unlockedAt DESC",
      [auth.user.id]
    );

    return NextResponse.json({
      xpCoins,
      transactions,
      unlockedEpisodes: unlocks
    });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Failed to fetch XP Coins data" }, { status: 500 });
  }
}
