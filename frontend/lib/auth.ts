import jwt from "jsonwebtoken";
import { tursoQueryOne } from "./db";

export const ADMIN_EMAILS = [
  "appua26145@gmail.com",
  "dddr04268@gmail.com"
];

export function isPrimaryAdmin(email?: string): boolean {
  if (!email || typeof email !== "string") return false;
  const clean = email.toLowerCase().trim();
  const admins = ADMIN_EMAILS.map(e => e.toLowerCase().trim());
  if (process.env.ADMIN_EMAIL) {
    process.env.ADMIN_EMAIL.split(",").forEach((x) => {
      const c = x.trim().toLowerCase();
      if (c && !admins.includes(c)) admins.push(c);
    });
  }
  return admins.includes(clean);
}

const secret = () => process.env.JWT_SECRET || "development-secret-change-me";

export function tokenFor(id: string, role: string, email?: string, sessionId?: string) {
  return jwt.sign({ id, role, email, sessionId }, secret(), { expiresIn: "30d" });
}

export interface AuthResult {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    isMainAdmin: boolean;
    avatar?: string;
    subscriptionEndsAt?: string | null;
  } | null;
  isAdmin: boolean;
  isMainAdmin: boolean;
  isCoAdmin: boolean;
  error?: string;
}

export async function verifyAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "").trim();

  if (!token) {
    return { user: null, isAdmin: false, isMainAdmin: false, isCoAdmin: false, error: "Authentication required" };
  }

  try {
    const decoded = jwt.verify(token, secret()) as { id: string; role: string; email?: string; sessionId?: string };
    const dbUser = await tursoQueryOne("SELECT * FROM users WHERE id = ?", [decoded.id]);

    if (!dbUser) {
      return { user: null, isAdmin: false, isMainAdmin: false, isCoAdmin: false, error: "User not found" };
    }

    const emailClean = (dbUser.email || decoded.email || "").toLowerCase().trim();
    const primaryAdmin = isPrimaryAdmin(emailClean);

    // Single-device restriction: Check if activeSessionId matches (Primary Admins exempt)
    if (!primaryAdmin && dbUser.activeSessionId) {
      if (decoded.sessionId && decoded.sessionId !== dbUser.activeSessionId) {
        return { user: null, isAdmin: false, isMainAdmin: false, isCoAdmin: false, error: "Your account was signed in on another device." };
      }
    }

    const isCoAdmin = dbUser.role === "co_admin";
    const isMainAdmin = primaryAdmin || (dbUser.role === "admin" && !isCoAdmin);
    const isAdmin = dbUser.role === "admin" || dbUser.role === "co_admin" || isMainAdmin || isCoAdmin;

    return {
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        isMainAdmin,
        avatar: dbUser.avatar || "",
        subscriptionEndsAt: dbUser.subscriptionEndsAt || null
      },
      isAdmin,
      isMainAdmin,
      isCoAdmin
    };
  } catch {
    return { user: null, isAdmin: false, isMainAdmin: false, isCoAdmin: false, error: "Invalid or expired session" };
  }
}

export async function logSecurityEvent(
  eventType: string,
  email: string = "",
  ipAddress: string = "",
  userAgent: string = "",
  statusCode: number = 401,
  details: string = ""
) {
  try {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const { tursoExecute } = await import("./db");
    await tursoExecute(
      `INSERT INTO security_audit_logs (id, eventType, email, ipAddress, userAgent, details, statusCode, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, eventType, email, ipAddress, userAgent, details, statusCode, createdAt]
    );
  } catch (err) {
    console.error("[Security Audit Log Failure]:", err);
  }
}

export async function isRateLimitedOrLocked(ipAddress: string, email: string): Promise<boolean> {
  try {
    const { tursoQuery } = await import("./db");
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const attempts = await tursoQuery(
      `SELECT COUNT(*) as cnt FROM security_audit_logs 
       WHERE (email = ? OR ipAddress = ?) 
       AND eventType IN ('FAILED_LOGIN', 'BRUTE_FORCE_ATTEMPT') 
       AND createdAt >= ?`,
      [email, ipAddress, fifteenMinsAgo]
    );
    const count = Number(attempts[0]?.cnt || 0);
    return count >= 5;
  } catch {
    return false;
  }
}

