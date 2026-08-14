import { NextResponse } from "next/server";
import { verifyAuth } from "../../../../lib/auth";
import { tursoQuery, tursoExecute } from "../../../../lib/db";

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin && auth.user?.role !== "co_admin") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    // 1. Report counts
    const reportsSummary = await tursoQuery(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) as openCount,
        SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as inProgressCount,
        SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as resolvedCount,
        SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closedCount
      FROM user_reports
    `, []);

    const reportStats = reportsSummary[0] || {
      total: 0,
      openCount: 0,
      inProgressCount: 0,
      resolvedCount: 0,
      closedCount: 0
    };

    // 2. Application Error stats (Filtered for Today)
    const todayISO = new Date().toISOString().slice(0, 10);
    const errorSummary = await tursoQuery(`
      SELECT 
        COUNT(*) as totalErrors,
        SUM(CASE WHEN createdAt LIKE ? THEN 1 ELSE 0 END) as errorsToday,
        SUM(CASE WHEN statusCode >= 500 AND createdAt LIKE ? THEN 1 ELSE 0 END) as serverErrorsToday,
        SUM(CASE WHEN (statusCode = 401 OR statusCode = 403) AND createdAt LIKE ? THEN 1 ELSE 0 END) as securityEventsToday
      FROM app_errors
    `, [`${todayISO}%`, `${todayISO}%`, `${todayISO}%`]);

    const errorStats = errorSummary[0] || {
      totalErrors: 0,
      errorsToday: 0,
      serverErrorsToday: 0,
      securityEventsToday: 0
    };

    // 3. Query Security Audit Logs (Filtered for actual threats vs general logins)
    const securityAuditSummary = await tursoQuery(`
      SELECT 
        COUNT(*) as totalAuditEvents,
        SUM(CASE WHEN createdAt LIKE ? THEN 1 ELSE 0 END) as auditEventsToday,
        SUM(CASE WHEN createdAt LIKE ? AND (eventType LIKE '%FAIL%' OR eventType LIKE '%BRUTE%' OR eventType LIKE '%BAN%') THEN 1 ELSE 0 END) as securityThreatsToday
      FROM security_audit_logs
    `, [`${todayISO}%`, `${todayISO}%`]);

    const auditCount = Number(securityAuditSummary[0]?.totalAuditEvents || 0);
    const auditToday = Number(securityAuditSummary[0]?.auditEventsToday || 0);
    const securityThreatsToday = Number(securityAuditSummary[0]?.securityThreatsToday || 0);
    const totalSecurityEvents = Number(errorStats.securityEventsToday || 0) + securityThreatsToday;

    // 4. Recent 20 errors, reports, and security audit events
    const recentErrors = await tursoQuery("SELECT * FROM app_errors ORDER BY createdAt DESC LIMIT 20", []);
    const recentReports = await tursoQuery("SELECT * FROM user_reports ORDER BY createdAt DESC LIMIT 20", []);
    const recentSecurityLogs = await tursoQuery("SELECT * FROM security_audit_logs ORDER BY createdAt DESC LIMIT 20", []);

    // 5. Active User Count & Series Count from database
    const usersCountRes = await tursoQuery("SELECT COUNT(*) as activeUsers FROM users", []);
    const seriesCountRes = await tursoQuery("SELECT COUNT(*) as totalSeries FROM series", []);
    const episodesCountRes = await tursoQuery("SELECT COUNT(*) as totalEpisodes FROM episodes", []);

    const activeUsers = Number(usersCountRes[0]?.activeUsers || 0);
    const totalSeries = Number(seriesCountRes[0]?.totalSeries || 0);
    const totalEpisodes = Number(episodesCountRes[0]?.totalEpisodes || 0);

    // Calculate Health Status accurately
    const openCount = Number(reportStats.openCount || 0);
    const errorsToday = Number(errorStats.errorsToday || 0);
    const serverErrorsToday = Number(errorStats.serverErrorsToday || 0);

    let healthStatus: "HEALTHY" | "DEGRADED" | "CRITICAL" = "HEALTHY";
    if (serverErrorsToday > 15 || openCount > 25 || securityThreatsToday > 20) {
      healthStatus = "CRITICAL";
    } else if (serverErrorsToday > 3 || errorsToday > 15 || openCount > 10 || securityThreatsToday > 10) {
      healthStatus = "DEGRADED";
    }

    return NextResponse.json({
      success: true,
      healthStatus,
      stats: {
        totalReports: Number(reportStats.total || 0),
        openReports: openCount,
        inProgressReports: Number(reportStats.inProgressCount || 0),
        resolvedReports: Number(reportStats.resolvedCount || 0),
        closedReports: Number(reportStats.closedCount || 0),
        errorsToday,
        totalErrors: Number(errorStats.totalErrors || 0),
        serverErrors: serverErrorsToday,
        securityEvents: totalSecurityEvents,
        securityEventsToday: auditToday,
        activeUsers,
        totalSeries,
        totalEpisodes
      },
      recentErrors,
      recentReports,
      recentSecurityLogs,
      lastRefreshed: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Failed to fetch health analytics" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin && auth.user?.role !== "co_admin") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const { action } = await req.json().catch(() => ({ action: "clear_errors" }));
    if (action === "clear_errors" || action === "clear_all") {
      await tursoExecute("DELETE FROM app_errors", []);
      return NextResponse.json({ success: true, message: "Application error logs cleared successfully!" });
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Failed to clear error logs" }, { status: 500 });
  }
}

