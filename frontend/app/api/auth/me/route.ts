import { NextResponse } from "next/server";
import { verifyAuth } from "../../../../lib/auth";
import { tursoQueryOne } from "../../../../lib/db";

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.user) {
    return NextResponse.json({ message: auth.error || "Authentication required" }, { status: 401 });
  }

  const u = await tursoQueryOne("SELECT * FROM users WHERE id = ?", [auth.user.id]);
  if (!u) {
    return NextResponse.json({ message: "User account not found" }, { status: 404 });
  }

  const isSubscribed = Boolean(
    u.role === "admin" || u.role === "co_admin" ||
    (u.subscriptionEndsAt && new Date(u.subscriptionEndsAt).getTime() > Date.now())
  );

  const xpCoins = Number(u.xpCoins || 0);

  const payload = {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isMainAdmin: auth.isMainAdmin,
    avatar: u.avatar || "",
    subscriptionEndsAt: u.subscriptionEndsAt || null,
    isSubscribed,
    xpCoins,
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isMainAdmin: auth.isMainAdmin,
      avatar: u.avatar || "",
      subscriptionEndsAt: u.subscriptionEndsAt || null,
      isSubscribed,
      xpCoins
    }
  };

  return NextResponse.json(payload);
}
