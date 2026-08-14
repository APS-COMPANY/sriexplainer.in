import { NextResponse } from "next/server";
import { verifyAuth } from "../../../../../lib/auth";
import { tursoExecute, tursoQueryOne, getTursoClient } from "../../../../../lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await verifyAuth(req);
  if (!auth.user) {
    return NextResponse.json({ message: auth.error || "Authentication required to unlock episodes" }, { status: 401 });
  }

  try {
    const ep = await tursoQueryOne(
      "SELECT e.*, s.title as seriesTitle FROM episodes e JOIN series s ON e.seriesId = s.id WHERE e.id = ?",
      [id]
    );

    if (!ep) {
      return NextResponse.json({ message: "Episode not found" }, { status: 404 });
    }

    const accessType = (ep.access || "free").toLowerCase().trim();
    const isXpCoinsRequired = accessType === "xp_coins" || accessType === "premium" || accessType === "subscription";
    if (!isXpCoinsRequired) {
      return NextResponse.json({ success: true, message: "This episode is free!" });
    }

    // 1. Check if user already unlocked this episode
    const existingUnlock = await tursoQueryOne(
      "SELECT id FROM episode_unlocks WHERE userId = ? AND episodeId = ?",
      [auth.user.id, id]
    );

    if (existingUnlock) {
      const user = await tursoQueryOne("SELECT xpCoins FROM users WHERE id = ?", [auth.user.id]);
      return NextResponse.json({
        success: true,
        message: "Episode is already unlocked!",
        alreadyUnlocked: true,
        xpCoins: Number(user?.xpCoins || 0)
      });
    }

    // 2. Validate User XP Coin Balance
    const user = await tursoQueryOne("SELECT id, xpCoins FROM users WHERE id = ?", [auth.user.id]);
    const currentCoins = Number(user?.xpCoins || 0);
    const xpCost = Math.max(1, Number(ep.xpCost || 5));

    if (currentCoins < xpCost) {
      return NextResponse.json(
        {
          message: "Not enough XP Coins.",
          insufficientCoins: true,
          requiredCoins: xpCost,
          userCoins: currentCoins
        },
        { status: 400 }
      );
    }

    const balanceBefore = currentCoins;
    const client = getTursoClient();

    // 3. Atomic Database Deduction (Strict race-condition protection)
    const updateResult = await client.execute({
      sql: "UPDATE users SET xpCoins = xpCoins - ? WHERE id = ? AND xpCoins >= ?",
      args: [xpCost, auth.user.id, xpCost]
    });

    if (updateResult.rowsAffected === 0) {
      return NextResponse.json(
        {
          message: "Not enough XP Coins.",
          insufficientCoins: true,
          requiredCoins: xpCost,
          userCoins: currentCoins
        },
        { status: 400 }
      );
    }

    const updatedUser = await tursoQueryOne("SELECT xpCoins FROM users WHERE id = ?", [auth.user.id]);
    const balanceAfter = Number(updatedUser?.xpCoins || (balanceBefore - xpCost));

    const unlockId = `unlock_${crypto.randomUUID()}`;
    const txId = `tx_unlock_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    // 4. Create permanent episode unlock record
    await tursoExecute(
      "INSERT INTO episode_unlocks (id, userId, episodeId, coinsPaid, unlockedAt) VALUES (?, ?, ?, ?, ?)",
      [unlockId, auth.user.id, id, xpCost, now]
    );

    // 5. Record Transaction Ledger
    await tursoExecute(
      "INSERT INTO xp_transactions (id, userId, type, amount, balanceBefore, balanceAfter, description, referenceId, createdAt) VALUES (?, ?, 'EPISODE_UNLOCK', ?, ?, ?, ?, ?, ?)",
      [txId, auth.user.id, -xpCost, balanceBefore, balanceAfter, `Unlocked Episode ${ep.number}: ${ep.title} (${ep.seriesTitle})`, unlockId, now]
    );

    return NextResponse.json({
      success: true,
      message: `✓ Unlocked for ${xpCost} XP Coins!`,
      xpCoins: balanceAfter,
      unlockedEpisodeId: id
    });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Episode unlock failed" }, { status: 500 });
  }
}
