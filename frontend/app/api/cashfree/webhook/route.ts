import { NextResponse } from "next/server";
import { tursoQueryOne, tursoExecute } from "../../../../lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const eventType = body?.type || body?.event_type;
    const data = body?.data;

    // Check if event is a Refund event from Cashfree Webhook
    if (eventType === "REFUND_STATUS_WEBHOOK" || eventType === "REFUND_SUCCESS" || data?.refund?.refund_status === "SUCCESS") {
      const orderId = data?.order?.order_id || data?.refund?.order_id;
      if (!orderId) {
        return NextResponse.json({ message: "Order ID missing from webhook payload" }, { status: 400 });
      }

      // 1. Idempotency Check: Verify if refund was already processed
      const existingRefund = await tursoQueryOne(
        "SELECT id FROM xp_transactions WHERE referenceId = ? AND type = 'REFUND'",
        [orderId]
      );

      if (existingRefund) {
        return NextResponse.json({ success: true, message: "Refund already processed" });
      }

      // 2. Find original PURCHASE transaction
      const purchaseTx = await tursoQueryOne(
        "SELECT * FROM xp_transactions WHERE referenceId = ? AND type = 'PURCHASE'",
        [orderId]
      );

      if (purchaseTx) {
        const targetUserId = purchaseTx.userId;
        const coinsGranted = Math.abs(Number(purchaseTx.amount || 0));

        if (coinsGranted > 0) {
          const user = await tursoQueryOne("SELECT id, xpCoins FROM users WHERE id = ?", [targetUserId]);
          if (user) {
            const balanceBefore = Number(user.xpCoins || 0);
            const balanceAfter = Math.max(0, balanceBefore - coinsGranted);

            await tursoExecute("UPDATE users SET xpCoins = ? WHERE id = ?", [balanceAfter, targetUserId]);
            await tursoExecute(
              "UPDATE payments SET status = 'refunded' WHERE razorpayOrderId = ? OR id = ?",
              [orderId, orderId]
            );

            const txId = `tx_refund_${crypto.randomUUID()}`;
            const now = new Date().toISOString();

            await tursoExecute(
              "INSERT INTO xp_transactions (id, userId, type, amount, balanceBefore, balanceAfter, description, referenceId, createdAt) VALUES (?, ?, 'REFUND', ?, ?, ?, ?, ?, ?)",
              [
                txId,
                targetUserId,
                -coinsGranted,
                balanceBefore,
                balanceAfter,
                `Reversed ${coinsGranted} XP Coins via Cashfree Refund Webhook for order: ${orderId}`,
                orderId,
                now
              ]
            );
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: "Webhook received" });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Webhook handling failed" }, { status: 500 });
  }
}
