import { NextResponse } from "next/server";
import { verifyAuth } from "../../../../lib/auth";
import { tursoQuery } from "../../../../lib/db";

function escapeCsv(field: any): string {
  if (field === null || field === undefined) return '""';
  let str = String(field).trim();
  // Prevent Excel formula injection vulnerability
  if (/^[-+=@]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

function buildCsvRow(fields: any[]): string {
  return fields.map(escapeCsv).join(",");
}

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin && auth.user?.role !== "co_admin") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const todayISO = new Date().toISOString();
    const todayDate = todayISO.slice(0, 10);

    // 1. Executive Summary Queries
    const userCountRes = await tursoQuery("SELECT COUNT(*) as cnt FROM users", []);
    const subCountRes = await tursoQuery("SELECT COUNT(*) as cnt FROM subscriptions WHERE status = 'active'", []);
    const revRes = await tursoQuery("SELECT SUM(amount) as totalRev FROM subscriptions WHERE status = 'active'", []);
    const auditRes = await tursoQuery("SELECT COUNT(*) as cnt FROM security_audit_logs", []);
    const reportRes = await tursoQuery("SELECT COUNT(*) as cnt FROM user_reports WHERE status = 'OPEN'", []);

    const totalUsers = Number(userCountRes[0]?.cnt || 0);
    const activeSubs = Number(subCountRes[0]?.cnt || 0);
    const totalRev = Number(revRes[0]?.totalRev || 0);
    const totalSecurityEvents = Number(auditRes[0]?.cnt || 0);
    const openReports = Number(reportRes[0]?.cnt || 0);

    // 2. Query Detailed Tables
    const users = await tursoQuery("SELECT id, name, email, role, phone, subscriptionEndsAt, createdAt FROM users ORDER BY createdAt DESC", []);
    const subs = await tursoQuery("SELECT id, userId, plan, amount, status, startsAt, endsAt, createdAt FROM subscriptions ORDER BY createdAt DESC", []);
    const auditLogs = await tursoQuery("SELECT id, eventType, email, ipAddress, userAgent, details, statusCode, createdAt FROM security_audit_logs ORDER BY createdAt DESC LIMIT 500", []);
    const series = await tursoQuery("SELECT id, title, type, genre, year, status, views, rating, createdAt FROM series ORDER BY views DESC", []);
    const reports = await tursoQuery("SELECT id, userEmail, issueType, description, pageRoute, status, createdAt FROM user_reports ORDER BY createdAt DESC", []);

    const lines: string[] = [];

    // Header & Executive Summary Section
    lines.push(buildCsvRow(["=== SRI EXPLAINER DAILY DATA COLLECTION REPORT ==="]));
    lines.push(buildCsvRow(["Generated At", todayISO]));
    lines.push("");
    lines.push(buildCsvRow(["--- EXECUTIVE SUMMARY STATS ---"]));
    lines.push(buildCsvRow(["Metric", "Value"]));
    lines.push(buildCsvRow(["Total Registered Users", totalUsers]));
    lines.push(buildCsvRow(["Active VIP Subscriptions", activeSubs]));
    lines.push(buildCsvRow(["Total Revenue (INR)", `INR ${totalRev.toFixed(2)}`]));
    lines.push(buildCsvRow(["Total Security Events Tracked", totalSecurityEvents]));
    lines.push(buildCsvRow(["Open User Support Complaints", openReports]));
    lines.push("");

    // Section 1: User Directory
    lines.push(buildCsvRow(["--- 1. USER DIRECTORY ---"]));
    lines.push(buildCsvRow(["User ID", "Full Name", "Email Address", "System Role", "Phone Number", "Subscription Expiry", "Account Created At"]));
    for (const u of users) {
      lines.push(buildCsvRow([
        u.id || "",
        u.name || "",
        u.email || "",
        u.role || "user",
        u.phone || "",
        u.subscriptionEndsAt || "N/A",
        u.createdAt || ""
      ]));
    }
    lines.push("");

    // Section 2: Subscriptions & Financials
    lines.push(buildCsvRow(["--- 2. SUBSCRIPTIONS & REVENUE ---"]));
    lines.push(buildCsvRow(["Subscription ID", "User ID", "Plan Name", "Amount (INR)", "Payment Status", "Start Date", "End Date", "Recorded At"]));
    for (const s of subs) {
      lines.push(buildCsvRow([
        s.id || "",
        s.userId || "",
        s.plan || "Monthly Premium",
        s.amount || 39,
        s.status || "active",
        s.startsAt || "",
        s.endsAt || "",
        s.createdAt || ""
      ]));
    }
    lines.push("");

    // Section 3: Security Audit Log
    lines.push(buildCsvRow(["--- 3. SECURITY AUDIT LOGS ---"]));
    lines.push(buildCsvRow(["Audit Log ID", "Event Type", "Email Attempted", "IP Address", "User Agent", "HTTP Status", "Security Details", "Timestamp"]));
    for (const a of auditLogs) {
      lines.push(buildCsvRow([
        a.id || "",
        a.eventType || "",
        a.email || "",
        a.ipAddress || "",
        a.userAgent || "",
        a.statusCode || 401,
        a.details || "",
        a.createdAt || ""
      ]));
    }
    lines.push("");

    // Section 4: Content Views & Series Performance
    lines.push(buildCsvRow(["--- 4. CONTENT PERFORMANCE & VIEWS ---"]));
    lines.push(buildCsvRow(["Series ID", "Title", "Content Type", "Genre", "Release Year", "Status", "Total View Count", "Rating", "Added Date"]));
    for (const item of series) {
      lines.push(buildCsvRow([
        item.id || "",
        item.title || "",
        item.type || "Series",
        item.genre || "",
        item.year || "",
        item.status || "ongoing",
        item.views || 0,
        item.rating || "PG-13",
        item.createdAt || ""
      ]));
    }
    lines.push("");

    // Section 5: System Issue Reports
    lines.push(buildCsvRow(["--- 5. SYSTEM ISSUE REPORTS & COMPLAINTS ---"]));
    lines.push(buildCsvRow(["Report ID", "User Email", "Issue Category", "Description", "Page Route", "Current Status", "Submitted Date"]));
    for (const r of reports) {
      lines.push(buildCsvRow([
        r.id || "",
        r.userEmail || "",
        r.issueType || "",
        r.description || "",
        r.pageRoute || "",
        r.status || "OPEN",
        r.createdAt || ""
      ]));
    }

    // UTF-8 BOM Prefix for Excel native opening without syntax errors
    const utf8BOM = "\uFEFF";
    const csvData = utf8BOM + lines.join("\r\n");

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sri_explainer_daily_report_${todayDate}.csv"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
      }
    });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Failed to generate Excel report" }, { status: 500 });
  }
}
