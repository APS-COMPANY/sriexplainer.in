import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "../../../../../lib/auth";
import { tursoQueryOne, tursoExecute } from "../../../../../lib/db";

export async function POST(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin && !auth.isMainAdmin && auth.user?.role !== "admin") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { order_id, reason } = z.object({
      order_id: z.string().min(1),
      reason: z.string().optional()
    }).parse(body);

    // 1. Check if a REFUND transaction already exists (Strict Idempotency)
    const existingRefund = await tursoQueryOne(
      "SELECT id FROM xp_transactions WHERE referenceId = ? AND type = 'REFUND'",
      [order_id]
    );

    if (existingRefund) {
      return NextResponse.json({
        success: true,
        message: "Payment purchase has already been refunded.",
        alreadyRefunded: true
      });
    }

    // 2. Find original PURCHASE transaction
    const purchaseTx = await tursoQueryOne(
      "SELECT * FROM xp_transactions WHERE referenceId = ? AND type = 'PURCHASE'",
      [order_id]
    );

    if (!purchaseTx) {
      return NextResponse.json(
        { message: `No verified XP Coin purchase found matching Order ID: ${order_id}` },
        { status: 404 }
      );
    }

    const targetUserId = purchaseTx.userId;
    const coinsGranted = Math.abs(Number(purchaseTx.amount || 0));

    if (coinsGranted <= 0) {
      return NextResponse.json({ message: "Invalid original purchase coin amount" }, { status: 400 });
    }

    const user = await tursoQueryOne("SELECT id, name, email, xpCoins FROM users WHERE id = ?", [targetUserId]);
    if (!user) {
      return NextResponse.json({ message: "Associated user account not found" }, { status: 404 });
    }

    const balanceBefore = Number(user.xpCoins || 0);
    const balanceAfter = Math.max(0, balanceBefore - coinsGranted);

    // 3. Atomic Database Balance Reversal
    await tursoExecute("UPDATE users SET xpCoins = ? WHERE id = ?", [balanceAfter, targetUserId]);

    // 4. Update payments status to refunded
    await tursoExecute(
      "UPDATE payments SET status = 'refunded' WHERE razorpayOrderId = ? OR id = ?",
      [order_id, order_id]
    );

    const txId = `tx_refund_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    // 5. Record Immutable Refund Transaction Ledger
    await tursoExecute(
      "INSERT INTO xp_transactions (id, userId, type, amount, balanceBefore, balanceAfter, description, referenceId, createdAt) VALUES (?, ?, 'REFUND', ?, ?, ?, ?, ?, ?)",
      [
        txId,
        targetUserId,
        -coinsGranted,
        balanceBefore,
        balanceAfter,
        `Reversed ${coinsGranted} XP Coins for refunded order: ${order_id}${reason ? ` (${reason})` : ''}`,
        order_id,
        now
      ]
    );

    return NextResponse.json({
      success: true,
      message: `✓ Reversed ${coinsGranted} XP Coins for user ${user.email || targetUserId}.`,
      refundedCoins: coinsGranted,
      previousBalance: balanceBefore,
      newBalance: balanceAfter,
      userEmail: user.email
    });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Refund processing failed" }, { status: 500 });
  }
}
