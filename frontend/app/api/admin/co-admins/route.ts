import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth, ADMIN_EMAILS } from "../../../../lib/auth";
import { tursoQuery, tursoQueryOne, tursoExecute } from "../../../../lib/db";

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isMainAdmin) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const rows = await tursoQuery("SELECT id, name, email, role, avatar, createdAt FROM users WHERE role = 'co_admin' ORDER BY createdAt DESC");
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isMainAdmin) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { email } = z.object({ email: z.string().email() }).parse(body);
    const cleanEmail = email.toLowerCase().trim();

    if (ADMIN_EMAILS.includes(cleanEmail)) {
      return NextResponse.json({ message: "This email belongs to one of the two Main Admins." }, { status: 400 });
    }

    let targetUser = await tursoQueryOne("SELECT * FROM users WHERE email = ?", [cleanEmail]);

    if (!targetUser) {
      const newId = crypto.randomUUID();
      const now = new Date().toISOString();
      const { default: bcrypt } = await import("bcryptjs");
      const dummyPass = await bcrypt.hash(crypto.randomUUID(), 10);

      await tursoExecute(
        "INSERT INTO users (id, name, email, password, role, createdAt) VALUES (?, ?, ?, ?, 'co_admin', ?)",
        [newId, cleanEmail.split("@")[0], cleanEmail, dummyPass, now]
      );

      return NextResponse.json({
        success: true,
        message: `Co-Admin access granted to ${cleanEmail}! The user will have Co-Admin access upon sign-in.`,
        user: { id: newId, name: cleanEmail.split("@")[0], email: cleanEmail, role: "co_admin" }
      });
    }

    if (targetUser.role === "co_admin") {
      return NextResponse.json({ message: `User "${targetUser.name || cleanEmail}" is already a Co-Admin.` }, { status: 400 });
    }

    await tursoExecute("UPDATE users SET role = 'co_admin' WHERE id = ?", [targetUser.id]);

    return NextResponse.json({
      success: true,
      message: `User ${targetUser.name || cleanEmail} (${cleanEmail}) is now assigned as Co-Admin!`,
      user: { id: targetUser.id, name: targetUser.name, email: targetUser.email, role: "co_admin" }
    });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Failed to assign Co-Admin role" }, { status: 400 });
  }
}
