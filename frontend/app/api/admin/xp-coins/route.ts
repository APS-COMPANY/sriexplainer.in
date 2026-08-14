import { NextResponse } from "next/server";
import { verifyAuth } from "../../../../lib/auth";
import { tursoExecute, tursoQuery, tursoQueryOne } from "../../../../lib/db";

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  try {
    let sql = "SELECT id, name, email, role, xpCoins, createdAt FROM users";
    const args: any[] = [];

    if (q) {
      sql += " WHERE email LIKE ? OR name LIKE ? OR id LIKE ?";
      args.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    sql += " ORDER BY createdAt DESC LIMIT 2000";

    const users = await tursoQuery(sql, args);
    const countRow = await tursoQueryOne("SELECT COUNT(*) as count FROM users", []);
    const totalUsers = Number(countRow?.count || users.length);

    return NextResponse.json({ users, totalUsers });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Failed to search users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { userId, action, amount, note } = body;

    const MAX_SAFE_XP_GRANT = 1000000;
    const numAmount = Number(amount);
    if (
      typeof amount !== "number" ||
      isNaN(numAmount) ||
      !isFinite(numAmount) ||
      !Number.isInteger(numAmount) ||
      numAmount <= 0 ||
      numAmount > MAX_SAFE_XP_GRANT ||
      !Number.isSafeInteger(numAmount)
    ) {
      return NextResponse.json({ message: "Invalid XP Coin amount." }, { status: 400 });
    }

    if (!userId || !action) {
      return NextResponse.json({ message: "Invalid payload parameters" }, { status: 400 });
    }

    const targetIdStr = String(userId).trim();
    const user = await tursoQueryOne("SELECT id, name, email, xpCoins FROM users WHERE id = ? OR email = ?", [targetIdStr, targetIdStr]);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const targetUserId = String(user.id);
    const balanceBefore = Number(user.xpCoins || 0);
    let type = "ADMIN_GRANT";
    let delta = 0;

    if (action === "add" || action === "grant") {
      delta = numAmount;
      await tursoExecute(
        "UPDATE users SET xpCoins = COALESCE(CAST(xpCoins AS INTEGER), 0) + ? WHERE id = ?",
        [delta, targetUserId]
      );
      type = "ADMIN_GRANT";
    } else if (action === "remove" || action === "deduct") {
      delta = -numAmount;
      await tursoExecute(
        "UPDATE users SET xpCoins = MAX(0, COALESCE(CAST(xpCoins AS INTEGER), 0) - ?) WHERE id = ?",
        [numAmount, targetUserId]
      );
      type = "ADMIN_ADJUSTMENT";
    } else {
      return NextResponse.json({ message: "Invalid action" }, { status: 400 });
    }

    const updatedUser = await tursoQueryOne("SELECT id, name, email, xpCoins FROM users WHERE id = ?", [targetUserId]);
    const balanceAfter = Number(updatedUser?.xpCoins ?? (balanceBefore + delta));

    const txId = `tx_admin_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const adminRef = auth.user?.id || "sys";
    const desc = note ? `Admin Action (${action}): ${note}` : `Admin ${type === "ADMIN_GRANT" ? "Grant" : "Adjustment"} (${delta >= 0 ? "+" : ""}${delta} XP Coins)`;

    await tursoExecute(
      "INSERT INTO xp_transactions (id, userId, type, amount, balanceBefore, balanceAfter, description, referenceId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [txId, targetUserId, type, delta, balanceBefore, balanceAfter, desc, adminRef, now]
    );

    return NextResponse.json({
      success: true,
      message: type === "ADMIN_GRANT" ? `${numAmount} XP Coins added successfully.` : `${numAmount} XP Coins deducted successfully.`,
      user: {
        id: targetUserId,
        email: user.email,
        xpCoins: balanceAfter
      }
    });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Failed to update XP Coins." }, { status: 500 });
  }
}
