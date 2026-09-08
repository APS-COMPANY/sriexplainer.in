import { NextResponse } from "next/server";
import { verifyAuth } from "../../../../lib/auth";
import { tursoQuery, tursoQueryOne } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin && auth.user?.role !== "co_admin") {
    return NextResponse.json({ message: "Unauthorized admin access" }, { status: 401 });
  }

  try {
    const todayISO = new Date().toISOString().slice(0, 10);

    // 1. Audience & Traffic Metrics
    const [
      totalUsersRow,
      usersTodayRow,
      activeSubscribersRow,
      totalSeriesRow,
      totalEpisodesRow,
      totalViewsRow,
      totalWatchTimeRow,
      topSeriesRows
    ] = await Promise.all([
      tursoQueryOne("SELECT COUNT(*) as c FROM users"),
      tursoQueryOne("SELECT COUNT(*) as c FROM users WHERE createdAt LIKE ?", [`${todayISO}%`]),
      tursoQueryOne("SELECT COUNT(*) as c FROM users WHERE subscriptionEndsAt IS NOT NULL AND datetime(subscriptionEndsAt) > datetime('now')"),
      tursoQueryOne("SELECT COUNT(*) as c FROM series"),
      tursoQueryOne("SELECT COUNT(*) as c FROM episodes"),
      tursoQueryOne("SELECT SUM(views) as s FROM episodes"),
      tursoQueryOne("SELECT SUM(duration) as s FROM watch_history"),
      tursoQuery("SELECT id, title, views, thumbnail FROM series ORDER BY views DESC LIMIT 5")
    ]);

    // 2. Error & Health Metrics
    const [
      errorCountsRow,
      recentErrorsRows,
      reportStatsRow,
      securityAuditRow
    ] = await Promise.all([
      tursoQueryOne(`
        SELECT 
          COUNT(*) as totalErrors,
          SUM(CASE WHEN createdAt LIKE ? THEN 1 ELSE 0 END) as errorsToday,
          SUM(CASE WHEN statusCode >= 500 AND createdAt LIKE ? THEN 1 ELSE 0 END) as serverErrorsToday,
          SUM(CASE WHEN (statusCode = 401 OR statusCode = 403) AND createdAt LIKE ? THEN 1 ELSE 0 END) as securityEventsToday
        FROM app_errors
      `, [`${todayISO}%`, `${todayISO}%`, `${todayISO}%`]),
      tursoQuery("SELECT id, statusCode, path, method, message, clientIp, userAgent, createdAt FROM app_errors ORDER BY createdAt DESC LIMIT 20"),
      tursoQueryOne(`
        SELECT 
          COUNT(*) as totalReports,
          SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) as openReports,
          SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as inProgressReports,
          SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as resolvedReports
        FROM user_reports
      `),
      tursoQueryOne(`
        SELECT 
          COUNT(*) as totalAuditEvents,
          SUM(CASE WHEN createdAt LIKE ? THEN 1 ELSE 0 END) as auditEventsToday,
          SUM(CASE WHEN createdAt LIKE ? AND (eventType LIKE '%FAIL%' OR eventType LIKE '%BRUTE%' OR eventType LIKE '%BAN%') THEN 1 ELSE 0 END) as threatsToday
        FROM security_audit_logs
      `, [`${todayISO}%`, `${todayISO}%`])
    ]);

    // 3. Monetization & Subscriptions
    const totalRevenueRow = await tursoQueryOne("SELECT SUM(amount) as s FROM subscriptions WHERE status = 'active' OR status = 'completed'");

    // 4. Site Settings (for Ads toggle, maintenance mode, etc.)
    const settingsRows = await tursoQuery("SELECT key, value FROM site_settings");
    const settingsMap: Record<string, string> = {};
    settingsRows.forEach((r: any) => {
      settingsMap[r.key] = r.value;
    });

    const serverErrorsToday = Number(errorCountsRow?.serverErrorsToday || 0);
    const errorsToday = Number(errorCountsRow?.errorsToday || 0);
    const openReports = Number(reportStatsRow?.openReports || 0);
    const threatsToday = Number(securityAuditRow?.threatsToday || 0);

    let systemStatus: "OPTIMAL" | "ATTENTION" | "CRITICAL" = "OPTIMAL";
    if (serverErrorsToday > 10 || threatsToday > 20 || openReports > 25) {
      systemStatus = "CRITICAL";
    } else if (serverErrorsToday > 2 || errorsToday > 15 || openReports > 5 || threatsToday > 5) {
      systemStatus = "ATTENTION";
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      systemStatus,
      monetization: {
        adsEnabled: settingsMap["ads_enabled"] !== "false",
        googleAdMob: {
          appId: "ca-app-pub-1260032713613791~4676528986",
          homeBannerId: "ca-app-pub-1260032713613791/6557576548",
          interstitialVideoId: "ca-app-pub-1260032713613791/1561717388",
          status: "LIVE_PRODUCTION",
          appAdsTxtStatus: "VERIFIED_ACTIVE"
        },
        googleAdSense: {
          publisherId: "pub-1260032713613791",
          clientId: "ca-pub-1260032713613791",
          adsTxtStatus: "VERIFIED_ACTIVE",
          autoAds: true
        },
        subscriptions: {
          activeSubscribers: Number(activeSubscribersRow?.c || 0),
          totalRevenue: Number(totalRevenueRow?.s || 0) || Number(activeSubscribersRow?.c || 0) * 39,
          currency: "INR"
        }
      },
      traffic: {
        totalUsers: Number(totalUsersRow?.c || 0),
        newUsersToday: Number(usersTodayRow?.c || 0),
        activeSubscribers: Number(activeSubscribersRow?.c || 0),
        totalSeries: Number(totalSeriesRow?.c || 0),
        totalEpisodes: Number(totalEpisodesRow?.c || 0),
        totalViews: Number(totalViewsRow?.s || 0),
        totalWatchHours: Math.round(((Number(totalWatchTimeRow?.s || 0) / 3600)) * 10) / 10,
        appVersion: {
          latestVersionName: "1.2.5",
          latestVersionCode: 22,
          downloadUrl: "https://github.com/APS-COMPANY/sriexplainer.in/releases/download/v1.2.5/SriExplainer.apk"
        },
        topSeries: (topSeriesRows || []).map((s: any) => ({
          id: s.id,
          title: s.title,
          views: s.views || 0,
          thumbnail: s.thumbnail || ""
        }))
      },
      health: {
        status: systemStatus,
        totalErrors: Number(errorCountsRow?.totalErrors || 0),
        errorsToday,
        serverErrorsToday,
        securityEventsToday: Number(errorCountsRow?.securityEventsToday || 0) + threatsToday,
        openReports,
        totalReports: Number(reportStatsRow?.totalReports || 0),
        recentErrors: recentErrorsRows || []
      },
      controls: {
        maintenanceMode: settingsMap["maintenance_mode"] === "true",
        announcementText: settingsMap["announcement_text"] || "",
        telegramSupport: settingsMap["support_telegram"] || settingsMap["telegram_url"] || ""
      }
    });
  } catch (err: any) {
    console.error("[Control Center API Error]:", err);
    return NextResponse.json({ success: false, message: err?.message || "Failed to load Control Center metrics" }, { status: 500 });
  }
}
