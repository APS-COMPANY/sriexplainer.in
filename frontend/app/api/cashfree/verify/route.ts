import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "../../../../lib/auth";
import { tursoQueryOne, tursoExecute } from "../../../../lib/db";

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || "";
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || "";
const CASHFREE_ENV = (process.env.CASHFREE_ENVIRONMENT || "PRODUCTION").toUpperCase();

const CASHFREE_URL = CASHFREE_ENV === "PRODUCTION"
  ? "https://api.cashfree.com/pg/orders"
  : "https://sandbox.cashfree.com/pg/orders";

export async function POST(req: Request) {
  const auth = await verifyAuth(req);

  try {
    const body = await req.json();
    const { order_id } = z.object({ order_id: z.string() }).parse(body);

    // 1. Strict Idempotency Check: Ensure this order_id was not processed already
    const existingTx = await tursoQueryOne(
      "SELECT id, userId, amount, balanceAfter FROM xp_transactions WHERE referenceId = ? AND type = 'PURCHASE'",
      [order_id]
    );

    if (existingTx) {
      const u = await tursoQueryOne("SELECT xpCoins FROM users WHERE id = ?", [existingTx.userId]);
      return NextResponse.json({
        success: true,
        message: "Payment already verified.",
        xpCoins: Number(u?.xpCoins ?? existingTx.balanceAfter ?? 0),
        xpCoinsAdded: 0,
        alreadyVerified: true
      });
    }

    let targetUrl = `${CASHFREE_URL}/${order_id}`;
    let appId = CASHFREE_APP_ID;
    let secretKey = CASHFREE_SECRET_KEY;

    let res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "x-api-version": "2023-08-01",
        "x-client-id": appId,
        "x-client-secret": secretKey
      }
    });

    // Smart Sandbox Failover: If production API fails (KYC pending / test order), try Sandbox
    if (!res.ok) {
      const sandboxUrl = `https://sandbox.cashfree.com/pg/orders/${order_id}`;
      const sandboxAppId = process.env.CASHFREE_TEST_APP_ID || "";
      const sandboxSecretKey = process.env.CASHFREE_TEST_SECRET_KEY || "";
      
      const sandboxRes = await fetch(sandboxUrl, {
        method: "GET",
        headers: {
          "x-api-version": "2023-08-01",
          "x-client-id": sandboxAppId,
          "x-client-secret": sandboxSecretKey
        }
      });
      if (sandboxRes.ok) {
        res = sandboxRes;
      }
    }

    if (!res.ok) {
      return NextResponse.json({ message: "Failed to verify Cashfree payment status" }, { status: 400 });
    }

    const orderData = await res.json();
    if (orderData.order_status === "PAID") {
      const targetUserId = auth.user?.id || orderData.customer_details?.customer_id;
      if (!targetUserId) {
        return NextResponse.json({ message: "Unable to associate payment with user account" }, { status: 400 });
      }

      const user = await tursoQueryOne("SELECT id, name, email, xpCoins FROM users WHERE id = ?", [targetUserId]);
      if (!user) {
        return NextResponse.json({ message: "User account not found" }, { status: 404 });
      }

      const currentCoins = Number(user.xpCoins || 0);

      // 2. Determine package coin quantity based on verified Cashfree order_amount
      const orderAmount = Math.round(Number(orderData.order_amount || 29));
      let coinsToAdd = 60;
      if (orderAmount === 49) coinsToAdd = 110;
      else if (orderAmount === 99) coinsToAdd = 220;
      else if (orderAmount === 29) coinsToAdd = 60;
      else coinsToAdd = Math.round(orderAmount * 2.2);

      const balanceBefore = currentCoins;

      // 3. Atomic Database Credit (Race-condition protection)
      await tursoExecute(
        "UPDATE users SET xpCoins = COALESCE(CAST(xpCoins AS INTEGER), 0) + ? WHERE id = ?",
        [coinsToAdd, targetUserId]
      );

      const updatedUser = await tursoQueryOne("SELECT xpCoins FROM users WHERE id = ?", [targetUserId]);
      const balanceAfter = Number(updatedUser?.xpCoins ?? (balanceBefore + coinsToAdd));

      const txId = `tx_${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      // 4. Record Transaction Ledger
      await tursoExecute(
        "INSERT INTO xp_transactions (id, userId, type, amount, balanceBefore, balanceAfter, description, referenceId, createdAt) VALUES (?, ?, 'PURCHASE', ?, ?, ?, ?, ?, ?)",
        [txId, targetUserId, coinsToAdd, balanceBefore, balanceAfter, `Purchased ${coinsToAdd} XP Coins (₹${orderAmount})`, order_id, now]
      );

      return NextResponse.json({
        success: true,
        message: `✓ ${coinsToAdd} XP Coins added successfully!`,
        xpCoins: balanceAfter,
        xpCoinsAdded: coinsToAdd
      });
    }

    return NextResponse.json({ message: "Payment failed or incomplete. No XP Coins were credited." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Payment verification failed" }, { status: 500 });
  }
}
