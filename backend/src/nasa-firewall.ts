import { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { triggerRealtimeBackup } from "./telegram-db";

// Memory cache for banned IPs to ensure ultra-fast 0ms rejection
const bannedIpCache = new Set<string>();

// Pre-load banned IPs into memory cache
export function loadBannedIpsIntoMemory() {
  try {
    const rows = db.prepare("SELECT ipAddress FROM ip_bans").all() as { ipAddress: string }[];
    bannedIpCache.clear();
    rows.forEach((r) => bannedIpCache.add(r.ipAddress));
    console.log(`[NASA Cyber Shield]: Loaded ${bannedIpCache.size} banned IPs into memory guard.`);
  } catch (err) {
    console.error("[NASA Cyber Shield]: Failed to load banned IPs:", err);
  }
}

// Attack Signature Patterns (Regex)
const ATTACK_SIGNATURES = [
  { name: "SQL Injection Probe", pattern: /(\b(UNION(\s+ALL)?\s+SELECT|DROP\s+TABLE|DELETE\s+FROM|INSERT\s+INTO|ALTER\s+TABLE|INFORMATION_SCHEMA|SLEEP\s*\(|BENCHMARK\s*\(|WAITFOR\s+DELAY|PG_SLEEP)\b|' OR '1'='1|' OR 1=1|--|\/\*|\*\/)/i },
  { name: "Cross-Site Scripting (XSS)", pattern: /(<script[\s>]|javascript:|onerror\s*=|onload\s*=|document\.cookie|<iframe|<object|<embed|eval\s*\(|document\.location)/i },
  { name: "Directory Traversal / Path Injection", pattern: /(\.\.\/|\.\.\\|\/etc\/passwd|\/etc\/shadow|c:\\boot\.ini|\/proc\/self\/environ)/i },
  { name: "Command & Remote Shell Injection", pattern: /(;\s*cat\s+|\|\s*nc\s+|\|\s*bash\s+|system\s*\(|exec\s*\(|passthru\s*\(|shell_exec\s*\(|cmd\.exe)/i }
];

// Helper to extract real IP address behind proxies
export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "127.0.0.1";
}

// Ban IP in Database and Memory + Send Realtime Telegram Security Alert
export async function banIpAddress(ip: string, reason: string, attackType: string, payloadSnippet: string = "") {
  if (!ip || ip === "127.0.0.1" || ip === "::1") return;

  bannedIpCache.add(ip);
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO ip_bans (ipAddress, reason, attackType, payload, bannedAt)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(ipAddress) DO UPDATE SET
        reason = excluded.reason,
        attackType = excluded.attackType,
        payload = excluded.payload,
        bannedAt = excluded.bannedAt
    `).run(ip, reason, attackType, payloadSnippet.slice(0, 300), now);

    // Also log in security audit logs
    db.prepare(`
      INSERT INTO security_audit_logs (id, eventType, email, ipAddress, userAgent, details, statusCode, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      "NASA_SHIELD_AUTO_BAN",
      "SYSTEM_FIREWALL",
      ip,
      "NASA Cyber Defense",
      `AUTO-BANNED: ${attackType} - ${reason}`,
      403,
      now
    );

    console.warn(`[NASA Cyber Shield]: 🛑 AUTO-BANNED MALICIOUS IP: ${ip} | Type: ${attackType}`);

    // Send Telegram Bot Security Attack Alert
    const botToken = process.env.TELEGRAM_BOT_TOKEN || "8918133716:AAEGfbAu7iHcXxozhTGnpYv1AQvanL4jvYQ";
    const chatId = process.env.TELEGRAM_CHAT_ID || "-1003922901910";

    if (botToken && chatId) {
      const msg = 
        `🚨 *NASA-LEVEL CYBER DEFENSE ALERT* 🚨\n\n` +
        `🛑 *ATTACK BLOCKED & IP AUTO-BANNED!*\n` +
        `🌐 *Attacker IP:* \`${ip}\`\n` +
        `⚠️ *Attack Type:* ${attackType}\n` +
        `📝 *Reason:* ${reason}\n` +
        `🔍 *Payload:* \`${payloadSnippet.slice(0, 150) || "N/A"}\`\n` +
        `🕒 *Time:* ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST\n` +
        `🛡️ *Status:* Permanently Blocked by NASA Shield`;

      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "Markdown" })
      }).catch((e) => console.error("[NASA Shield Telegram Alert Error]:", e));
    }
  } catch (err) {
    console.error("[NASA Shield Ban Error]:", err);
  }
}

// Unban IP Address
export function unbanIpAddress(ip: string) {
  bannedIpCache.delete(ip);
  try {
    db.prepare("DELETE FROM ip_bans WHERE ipAddress = ?").run(ip);
    console.log(`[NASA Cyber Shield]: Unbanned IP: ${ip}`);
    return true;
  } catch (err) {
    console.error("[NASA Shield Unban Error]:", err);
    return false;
  }
}

// Check if IP is banned
export function isIpBanned(ip: string): boolean {
  return bannedIpCache.has(ip);
}

// Express Middleware: NASA Cyber Shield Firewall Protection
export function nasaCyberShieldMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);

  // 1. Instant Rejection for Banned IPs (0ms overhead)
  if (bannedIpCache.has(ip)) {
    return res.status(403).json({
      error: "ACCESS DENIED: Your IP address has been permanently flagged and auto-banned by NASA Cyber Defense Shield.",
      ip,
      shield: "NASA Automated Cyber Defense"
    });
  }

  // 2. Scan Request URL, Query, and Body for Malicious Attack Signatures
  const fullUrl = req.originalUrl || req.url || "";
  const bodyStr = req.body ? JSON.stringify(req.body) : "";
  const queryStr = req.query ? JSON.stringify(req.query) : "";
  const requestContent = `${fullUrl} ${queryStr} ${bodyStr}`;

  for (const sig of ATTACK_SIGNATURES) {
    if (sig.pattern.test(requestContent)) {
      // Malicious attack payload detected! Instant Auto-Ban!
      banIpAddress(ip, `Triggered attack pattern: ${sig.name}`, sig.name, requestContent);

      return res.status(403).json({
        error: `ACCESS DENIED: Malicious attack payload (${sig.name}) detected by NASA Shield. Your IP has been auto-banned.`,
        ip,
        attackType: sig.name
      });
    }
  }

  next();
}
