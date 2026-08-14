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
    const { subscriptionId, days } = z.object({
      subscriptionId: z.string(),
      days: z.number().default(30)
    }).parse(body);

    const sub = await tursoQueryOne("SELECT * FROM subscriptions WHERE id = ?", [subscriptionId]);
    if (!sub) {
      return NextResponse.json({ message: "Subscription not found" }, { status: 404 });
    }

    const currentExpiry = sub.endsAt ? new Date(sub.endsAt) : new Date();
    const baseTime = currentExpiry.getTime() > Date.now() ? currentExpiry.getTime() : Date.now();
    const newExpiry = new Date(baseTime + (days || 30) * 86400000);

    await tursoExecute("UPDATE subscriptions SET endsAt = ?, status = 'active' WHERE id = ?", [newExpiry.toISOString(), subscriptionId]);

    return NextResponse.json({
      success: true,
      message: `Subscription extended by ${days || 30} days!`
    });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Failed to extend subscription" }, { status: 400 });
  }
}
