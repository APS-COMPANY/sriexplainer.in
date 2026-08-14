import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { tursoQueryOne, tursoExecute } from "../../../../lib/db";
import { ADMIN_EMAILS, tokenFor } from "../../../../lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let email = body.email;
    let name = body.name || "Google User";
    let avatar = body.avatar || "";

    if (!email && body.credential) {
      try {
        const decoded: any = jwt.decode(body.credential);
        if (decoded && decoded.email) {
          email = decoded.email;
          if (decoded.name) name = decoded.name;
          if (decoded.picture) avatar = decoded.picture;
        }
      } catch {}
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ message: "Valid Google email address required" }, { status: 400 });
    }

    const emailClean = email.toLowerCase().trim();
    let u = await tursoQueryOne("SELECT * FROM users WHERE email = ?", [emailClean]);
    const isAdmin = ADMIN_EMAILS.includes(emailClean);
    const role = isAdmin ? "admin" : "user";
    const now = new Date().toISOString();

    const sessionId = crypto.randomUUID();
    if (!u) {
      const userId = crypto.randomUUID();
      const randomPass = await bcrypt.hash(crypto.randomUUID(), 10);
      await tursoExecute(
        "INSERT INTO users (id, name, email, password, avatar, role, activeSessionId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [userId, String(name).trim(), emailClean, randomPass, avatar, role, sessionId, now]
      );
      u = { id: userId, name: String(name).trim(), email: emailClean, role };
    } else {
      await tursoExecute("UPDATE users SET activeSessionId = ? WHERE id = ?", [sessionId, u.id]);
      if (isAdmin && u.role !== "admin") {
        await tursoExecute("UPDATE users SET role = 'admin' WHERE id = ?", [u.id]);
        u.role = "admin";
      }
      if (avatar && (!u.avatar || u.avatar === "")) {
        await tursoExecute("UPDATE users SET avatar = ? WHERE id = ?", [avatar, u.id]);
        u.avatar = avatar;
      }
    }

    const token = tokenFor(u.id, u.role, emailClean, sessionId);
    return NextResponse.json({
      token,
      user: { id: u.id, name: u.name, email: u.email, role: u.role, avatar: u.avatar || "" }
    });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Google authentication failed" }, { status: 500 });
  }
}
