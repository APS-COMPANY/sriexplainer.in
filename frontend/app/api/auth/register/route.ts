import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { tursoQueryOne, tursoExecute } from "../../../../lib/db";
import { ADMIN_EMAILS, tokenFor, logSecurityEvent } from "../../../../lib/auth";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const ua = req.headers.get("user-agent") || "";
  let emailClean = "";

  try {
    const body = await req.json();
    const d = z.object({
      name: z.string().min(2, "Name must be at least 2 characters"),
      email: z.string().email("Please provide a valid email address"),
      password: z.string()
        .min(8, "Password must be at least 8 characters long")
        .regex(/[A-Za-z]/, "Password must contain at least one letter")
        .regex(/[0-9]/, "Password must contain at least one number")
    }).parse(body);

    emailClean = d.email.toLowerCase().trim();
    const existing = await tursoQueryOne("SELECT * FROM users WHERE email = ?", [emailClean]);
    if (existing) {
      await logSecurityEvent("DUPLICATE_REGISTRATION_ATTEMPT", emailClean, ip, ua, 400, "Account already exists.");
      return NextResponse.json({ message: "An account with this email already exists" }, { status: 400 });
    }

    const userId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(d.password.trim(), 12);
    const isAdmin = ADMIN_EMAILS.includes(emailClean);
    const role = isAdmin ? "admin" : "user";
    const now = new Date().toISOString();

    await tursoExecute(
      "INSERT INTO users (id, name, email, password, role, activeSessionId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [userId, d.name.trim(), emailClean, passwordHash, role, sessionId, now]
    );

    const token = tokenFor(userId, role, emailClean, sessionId);
    return NextResponse.json(
      {
        token,
        user: { id: userId, name: d.name.trim(), email: emailClean, role }
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err?.name === "ZodError") {
      const msg = err.errors?.[0]?.message || "Invalid registration details. Passwords must be at least 8 characters with letters and numbers.";
      await logSecurityEvent("INVALID_REGISTRATION_INPUT", emailClean, ip, ua, 400, msg);
      return NextResponse.json({ message: msg }, { status: 400 });
    }
    return NextResponse.json({ message: err?.message || "Registration failed" }, { status: 500 });
  }
}
