import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { tursoQueryOne, tursoExecute } from "../../../../lib/db";
import { ADMIN_EMAILS, tokenFor, logSecurityEvent, isRateLimitedOrLocked } from "../../../../lib/auth";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const ua = req.headers.get("user-agent") || "";
  let emailClean = "";

  try {
    const body = await req.json();
    const d = z.object({
      email: z.string().email(),
      password: z.string().min(1)
    }).parse(body);

    emailClean = d.email.toLowerCase().trim();

    // Check anti-brute force lockout (5 failed attempts within 15 minutes)
    const isLocked = await isRateLimitedOrLocked(ip, emailClean);
    if (isLocked) {
      await logSecurityEvent("BRUTE_FORCE_ATTEMPT", emailClean, ip, ua, 429, "Too many failed login attempts; account temporarily locked.");
      return NextResponse.json({ 
        message: "Too many failed login attempts. Account temporarily locked for 15 minutes to preserve security." 
      }, { status: 429 });
    }

    const u = await tursoQueryOne("SELECT * FROM users WHERE email = ?", [emailClean]);

    if (!u || !(await bcrypt.compare(d.password.trim(), u.password))) {
      await logSecurityEvent("FAILED_LOGIN", emailClean, ip, ua, 401, "Invalid email or password attempt.");
      return NextResponse.json({ message: "Incorrect email or password" }, { status: 401 });
    }

    let role = u.role;
    if (ADMIN_EMAILS.includes(emailClean) && u.role !== "admin") {
      role = "admin";
      await tursoExecute("UPDATE users SET role = 'admin' WHERE id = ?", [u.id]);
    }

    const sessionId = crypto.randomUUID();
    await tursoExecute("UPDATE users SET activeSessionId = ? WHERE id = ?", [sessionId, u.id]);

    // Record login history asynchronously
    tursoExecute(
      "INSERT INTO login_history (id, userId, ipAddress, userAgent, createdAt) VALUES (?, ?, ?, ?, ?)",
      [crypto.randomUUID(), u.id, ip, ua, new Date().toISOString()]
    ).catch(() => {});

    const token = tokenFor(u.id, role, emailClean, sessionId);
    return NextResponse.json({
      token,
      user: { id: u.id, name: u.name, email: u.email, role }
    });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      await logSecurityEvent("MALFORMED_AUTH_INPUT", emailClean, ip, ua, 400, "Validation error during login.");
      return NextResponse.json({ message: "Please check your email and password format" }, { status: 400 });
    }
    return NextResponse.json({ message: err?.message || "Login failed" }, { status: 500 });
  }
}
