import { NextResponse } from "next/server";
import { verifyAuth } from "../../../../lib/auth";
import { tursoQuery } from "../../../../lib/db";

async function ensureFirewallTables() {
  try {
    await tursoQuery(`
      CREATE TABLE IF NOT EXISTS ip_bans (
        ipAddress TEXT PRIMARY KEY,
        reason TEXT NOT NULL,
        attackType TEXT NOT NULL,
        payload TEXT DEFAULT '',
        bannedAt TEXT NOT NULL,
        expiresAt TEXT DEFAULT NULL
      )
    `, []);
    await tursoQuery(`
      CREATE TABLE IF NOT EXISTS security_audit_logs (
        id TEXT PRIMARY KEY,
        eventType TEXT NOT NULL,
        email TEXT DEFAULT '',
        ipAddress TEXT DEFAULT '',
        userAgent TEXT DEFAULT '',
        details TEXT DEFAULT '',
        statusCode INTEGER DEFAULT 401,
        createdAt TEXT NOT NULL
      )
    `, []);
  } catch (e) {
    console.error("[Firewall Table Ensure Error]:", e);
  }
}

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin && auth.user?.role !== "co_admin") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    await ensureFirewallTables();

    const bannedIps = await tursoQuery(`
      SELECT ipAddress, reason, attackType, payload, bannedAt, expiresAt
      FROM ip_bans
      ORDER BY bannedAt DESC
      LIMIT 100
    `, []);

    const attackLogs = await tursoQuery(`
      SELECT id, eventType, email, ipAddress, userAgent, details, statusCode, createdAt
      FROM security_audit_logs
      ORDER BY createdAt DESC
      LIMIT 100
    `, []);

    return NextResponse.json({
      status: "active",
      shield: "NASA Cyber Shield Automated Firewall",
      bannedIps: bannedIps || [],
      attackLogs: attackLogs || []
    });
  } catch (err: any) {
    console.error("[Firewall GET Error]:", err);
    return NextResponse.json({ message: "Failed to fetch firewall logs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    await ensureFirewallTables();
    const body = await req.json();
    const { action, ipAddress, reason } = body;

    if (!ipAddress || typeof ipAddress !== "string") {
      return NextResponse.json({ message: "IP address is required" }, { status: 400 });
    }

    if (action === "ban") {
      const now = new Date().toISOString();
      await tursoQuery(`
        INSERT INTO ip_bans (ipAddress, reason, attackType, payload, bannedAt)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(ipAddress) DO UPDATE SET
          reason = excluded.reason,
          bannedAt = excluded.bannedAt
      `, [ipAddress.trim(), reason || "Manual Admin Ban", "MANUAL_ADMIN_BAN", "Banned by Admin Panel", now]);

      await tursoQuery(`
        INSERT INTO security_audit_logs (id, eventType, email, ipAddress, userAgent, details, statusCode, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        "MANUAL_IP_BAN",
        auth.user?.email || "ADMIN",
        ipAddress.trim(),
        "Admin Dashboard",
        `Manually Banned IP: ${reason || "No reason specified"}`,
        403,
        now
      ]);

      return NextResponse.json({ message: `IP Address ${ipAddress} successfully banned!` });
    }

    if (action === "test_autoban") {
      const testIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;
      const attackType = "SQL Injection Probe";
      const payloadSnippet = "GET /api/episodes?id=' UNION SELECT 1,2,3--";
      const now = new Date().toISOString();

      await tursoQuery(`
        INSERT INTO ip_bans (ipAddress, reason, attackType, payload, bannedAt)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(ipAddress) DO UPDATE SET
          reason = excluded.reason,
          attackType = excluded.attackType,
          payload = excluded.payload,
          bannedAt = excluded.bannedAt
      `, [testIp, "Triggered attack signature: SQL Injection", attackType, payloadSnippet, now]);

      await tursoQuery(`
        INSERT INTO security_audit_logs (id, eventType, email, ipAddress, userAgent, details, statusCode, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        "NASA_SHIELD_AUTO_BAN_TEST",
        "SYSTEM_FIREWALL",
        testIp,
        "NASA Cyber Defense",
        `TEST AUTO-BAN: ${attackType}`,
        403,
        now
      ]);

      // Trigger Telegram Alert
      const botToken = process.env.TELEGRAM_BOT_TOKEN || "8918133716:AAEGfbAu7iHcXxozhTGnpYv1AQvanL4jvYQ";
      const chatId = process.env.TELEGRAM_CHAT_ID || "-1003922901910";

      if (botToken && chatId) {
        const msg = 
          `🚨 *NASA-LEVEL CYBER DEFENSE ALERT* 🚨\n\n` +
          `🛑 *ATTACK BLOCKED & IP AUTO-BANNED!*\n` +
          `🌐 *Attacker IP:* \`${testIp}\`\n` +
          `⚠️ *Attack Type:* ${attackType}\n` +
          `📝 *Reason:* Triggered signature SQL Injection\n` +
          `🔍 *Payload:* \`${payloadSnippet}\`\n` +
          `🕒 *Time:* ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST\n` +
          `🛡️ *Status:* Permanently Blocked by NASA Shield`;

        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "Markdown" })
        }).catch((e) => console.error("[NASA Shield Telegram Alert Error]:", e));
      }

      return NextResponse.json({ message: `🧪 NASA Cyber Shield Auto-Ban triggered for test IP ${testIp}! Telegram alert sent!` });
    }

    if (action === "unban") {
      await tursoQuery("DELETE FROM ip_bans WHERE ipAddress = ?", [ipAddress.trim()]);
      return NextResponse.json({ message: `IP Address ${ipAddress} successfully unbanned!` });
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("[Firewall POST Error]:", err);
    return NextResponse.json({ message: err?.message || "Failed to update firewall status" }, { status: 500 });
  }
}
