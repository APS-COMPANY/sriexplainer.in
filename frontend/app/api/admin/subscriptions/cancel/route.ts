import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "../../../../../lib/auth";
import { tursoExecute } from "../../../../../lib/db";

export async function POST(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin && auth.user?.role !== "co_admin") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { subscriptionId } = z.object({ subscriptionId: z.string() }).parse(body);

    await tursoExecute("UPDATE subscriptions SET status = 'cancelled' WHERE id = ?", [subscriptionId]);

    return NextResponse.json({
      success: true,
      message: "Subscription cancelled successfully"
    });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Failed to cancel subscription" }, { status: 400 });
  }
}
