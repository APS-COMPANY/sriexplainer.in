import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import { AuthRequest, Role } from "./types";
import { getDb } from "./db";

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

export const tokenFor = (id: string, role: Role, email?: string, sessionId?: string) => 
  jwt.sign({ id, role, email, sessionId }, secret(), { expiresIn: "30d" });

export function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Authentication required" });
  try {
    const decoded = jwt.verify(token, secret()) as { id: string; role: Role; email?: string; sessionId?: string };
    req.user = decoded;

    let dbUser: any = null;
    try {
      dbUser = getDb().prepare("SELECT email, role, activeSessionId FROM users WHERE id = ?").get(decoded.id);
    } catch {}

    const userEmail = (dbUser?.email || decoded.email || "").toLowerCase().trim();
    const primaryAdmin = isPrimaryAdmin(userEmail);

    if (!primaryAdmin && dbUser && dbUser.activeSessionId) {
      if (decoded.sessionId && decoded.sessionId !== dbUser.activeSessionId) {
        return res.status(401).json({ message: "Your account was signed in on another device.", sessionExpired: true });
      }
    }

    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired session" });
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    try {
      const decoded = jwt.verify(token, secret()) as { id: string; role: Role; email?: string; sessionId?: string };
      req.user = decoded;
    } catch {
      // Ignored for optional auth
    }
  }
  next();
}

import crypto from "crypto";

export function logBackendSecurityEvent(
  eventType: string,
  email: string = "",
  ipAddress: string = "",
  userAgent: string = "",
  statusCode: number = 401,
  details: string = ""
) {
  try {
    const database = getDb();
    database.prepare(`
      INSERT INTO security_audit_logs (id, eventType, email, ipAddress, userAgent, details, statusCode, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      eventType,
      email,
      ipAddress,
      userAgent,
      details,
      statusCode,
      new Date().toISOString()
    );
  } catch (err) {
    console.error("[Backend Security Log Error]:", err);
  }
}

export function admin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  let dbUser: any = null;
  try {
    dbUser = getDb().prepare("SELECT email, role FROM users WHERE id = ?").get(req.user.id);
  } catch {}

  const userEmail = ((dbUser?.email || req.user.email) || "").toLowerCase().trim();
  const userRole = dbUser?.role || req.user.role;
  const isMainAdmin = ADMIN_EMAILS.includes(userEmail) || userRole === "admin";
  const isCoAdmin = userRole === "co_admin";
  const isAdmin = userRole === "admin" || isCoAdmin || isMainAdmin;

  if (!isAdmin) {
    console.warn(`[Security Audit Alert]: Unauthorized Admin access attempt by email="${userEmail}" role="${userRole}"`);
    logBackendSecurityEvent(
      "UNAUTHORIZED_ADMIN_ACCESS",
      userEmail,
      (req.headers["x-forwarded-for"] as string) || req.ip || "",
      req.headers["user-agent"] || "",
      403,
      `Attempted access to ${req.originalUrl || req.url}`
    );
    return res.status(403).json({ message: "Access Denied: You do not have permission to access the Admin Panel." });
  }
  
  next();
}

export function mainAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  let dbUser: any = null;
  try {
    dbUser = getDb().prepare("SELECT email, role FROM users WHERE id = ?").get(req.user.id);
  } catch {}

  const userEmail = ((dbUser?.email || req.user.email) || "").toLowerCase().trim();
  const userRole = dbUser?.role || req.user.role;
  const isMainAdmin = ADMIN_EMAILS.includes(userEmail) && userRole === "admin";

  if (!isMainAdmin) {
    console.warn(`[Security Audit Alert]: Unauthorized Main Admin operation attempt by email="${userEmail}" role="${userRole}"`);
    logBackendSecurityEvent(
      "UNAUTHORIZED_MAIN_ADMIN_OPERATION",
      userEmail,
      (req.headers["x-forwarded-for"] as string) || req.ip || "",
      req.headers["user-agent"] || "",
      403,
      `Attempted main admin operation on ${req.originalUrl || req.url}`
    );
    return res.status(403).json({ message: "Access Denied: Only Main Admins can perform this administrative operation." });
  }

  next();
}

export const isOfficialRumble = (url: string) => {
  if (!url || typeof url !== "string") return false;
  return url.includes("rumble.com/");
};

export const normalizeRumbleUrl = (url: string) => {
  if (!url) return "";
  let clean = url.trim();
  if (clean.includes("rumble.com/embed/")) {
    return clean;
  }
  // If full Rumble link like https://rumble.com/v3xyz-title.html
  // Extract video ID or return embed format
  const match = clean.match(/rumble\.com\/(?:embed\/)?([a-zA-Z0-9_\-]+)/);
  if (match && match[1]) {
    return `https://rumble.com/embed/${match[1]}/`;
  }
  return clean;
};
