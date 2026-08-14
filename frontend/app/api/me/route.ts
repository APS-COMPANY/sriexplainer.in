import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { verifyAuth } from "../../../lib/auth";
import { tursoQueryOne, tursoExecute } from "../../../lib/db";

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.user) {
    return NextResponse.json({ message: auth.error || "Authentication required" }, { status: 401 });
  }

  const u = await tursoQueryOne("SELECT * FROM users WHERE id = ?", [auth.user.id]);
  if (!u) return NextResponse.json({ message: "User not found" }, { status: 404 });

  const isSubscribed = Boolean(
    u.role === "admin" || u.role === "co_admin" ||
    (u.subscriptionEndsAt && new Date(u.subscriptionEndsAt).getTime() > Date.now())
  );

  const xpCoins = Number(u.xpCoins || 0);

  return NextResponse.json({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone || "",
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
      phone: u.phone || "",
      role: u.role,
      isMainAdmin: auth.isMainAdmin,
      avatar: u.avatar || "",
      subscriptionEndsAt: u.subscriptionEndsAt || null,
      isSubscribed,
      xpCoins
    }
  });
}

export async function PUT(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.user) {
    return NextResponse.json({ message: auth.error || "Authentication required" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Change Password Action
    if (body.currentPassword && body.newPassword) {
      const d = z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6)
      }).parse(body);

      const u = await tursoQueryOne("SELECT * FROM users WHERE id = ?", [auth.user.id]);
      if (!u) return NextResponse.json({ message: "User not found" }, { status: 404 });

      if (!(await bcrypt.compare(d.currentPassword, u.password))) {
        return NextResponse.json({ message: "Incorrect current password" }, { status: 400 });
      }

      const newHash = await bcrypt.hash(d.newPassword.trim(), 10);
      await tursoExecute("UPDATE users SET password = ? WHERE id = ?", [newHash, auth.user.id]);
      return NextResponse.json({ message: "Password updated successfully!" });
    }

    // Profile Details Update Action
    const d = z.object({
      name: z.string().min(2).optional(),
      phone: z.string().optional()
    }).parse(body);

    const u = await tursoQueryOne("SELECT * FROM users WHERE id = ?", [auth.user.id]);
    if (!u) return NextResponse.json({ message: "User not found" }, { status: 404 });

    const updatedName = d.name && d.name.trim() ? d.name.trim() : u.name;
    const updatedPhone = d.phone !== undefined ? d.phone.trim() : (u.phone || "");

    await tursoExecute(
      "UPDATE users SET name = ?, phone = ? WHERE id = ?",
      [updatedName, updatedPhone, u.id]
    );

    return NextResponse.json({
      message: "Profile details updated successfully!",
      user: { ...u, name: updatedName, phone: updatedPhone }
    });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Profile update failed" }, { status: 400 });
  }
}
