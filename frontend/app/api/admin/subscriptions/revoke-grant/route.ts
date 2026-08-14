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
    const { email } = z.object({ email: z.string().email() }).parse(body);

    const user = await tursoQueryOne("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [email.trim()]);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 400 });
    }

    await tursoExecute("UPDATE subscriptions SET status = 'cancelled' WHERE userId = ? AND paymentId = 'ADMIN_GRANTED'", [user.id]);

    return NextResponse.json({
      success: true,
      message: `Admin Granted Premium entitlement revoked for ${email}`
    });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Failed to revoke admin premium" }, { status: 400 });
  }
}
