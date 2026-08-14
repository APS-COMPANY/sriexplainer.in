import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "../../../../../lib/auth";
import { tursoQueryOne, tursoExecute } from "../../../../../lib/db";

export async function POST(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin && auth.user?.role !== "co_admin") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { email, days } = z.object({
      email: z.string().email(),
      days: z.number().default(30)
    }).parse(body);

    const user = await tursoQueryOne("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [email.trim()]);
    if (!user) {
      return NextResponse.json(
        { message: `User with email "${email}" not found. Please ask the user to register an account on Sri Explainer first.` },
        { status: 400 }
      );
    }

    const subId = crypto.randomUUID();
    const now = new Date();
    const endsAt = new Date(now.getTime() + days * 86400000);

    // Cancel previous active subscriptions for this user
    await tursoExecute("UPDATE subscriptions SET status = 'cancelled' WHERE userId = ? AND status = 'active'", [user.id]);

    // Insert new Admin Granted Premium Subscription
    await tursoExecute(`
      INSERT INTO subscriptions (id, userId, plan, amount, startsAt, endsAt, status, paymentId, createdAt)
      VALUES (?, ?, ?, 0, ?, ?, 'active', 'ADMIN_GRANTED', ?)
    `, [subId, user.id, `Admin Granted VIP (${days} Days)`, now.toISOString(), endsAt.toISOString(), now.toISOString()]);

    return NextResponse.json({
      success: true,
      message: `Premium access (${days} Days) successfully granted to ${user.name} (${email})!`
    });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Failed to grant premium access" }, { status: 400 });
  }
}
