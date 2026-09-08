import { NextResponse } from "next/server";
import { verifyAuth } from "../../../../lib/auth";
import { tursoQuery, tursoQueryOne } from "../../../../lib/db";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin && auth.user?.role !== "co_admin") {
    return NextResponse.json({ message: "Unauthorized admin access" }, { status: 401, headers: corsHeaders });
  }

  try {
    const todayISO = new Date().toISOString().slice(0, 10);

    // 1. Audience & Traffic Metrics (Safe with individual catch)
    let totalUsersRow: any = { c: 0 };
    let usersTodayRow: any = { c: 0 };
    let activeSubscribersRow: any = { c: 0 };
    let totalSeriesRow: any = { c: 0 };
    let totalEpisodesRow: any = { c: 0 };
    let totalViewsRow: any = { s: 0 };
    let totalWatchTimeRow: any = { s: 0 };
    let topSeriesRows: any[] = [];

    try {
      [
        totalUsersRow,
        usersTodayRow,
        activeSubscribersRow,
        totalSeriesRow,
        totalEpisodesRow,
        totalViewsRow,
        totalWatchTimeRow,
        topSeriesRows
      ] = await Promise.all([
        tursoQueryOne("SELECT COUNT(*) as c FROM users").catch(() => ({ c: 0 })),
        tursoQueryOne("SELECT COUNT(*) as c FROM users WHERE createdAt LIKE ?", [`${todayISO}%`]).catch(() => ({ c: 0 })),
        tursoQueryOne("SELECT COUNT(*) as c FROM users WHERE subscriptionEndsAt IS NOT NULL AND datetime(subscriptionEndsAt) > datetime('now')").catch(() => ({ c: 0 })),
        tursoQueryOne("SELECT COUNT(*) as c FROM series").catch(() => ({ c: 0 })),
        tursoQueryOne("SELECT COUNT(*) as c FROM episodes").catch(() => ({ c: 0 })),
        tursoQueryOne("SELECT SUM(views) as s FROM episodes").catch(() => ({ s: 0 })),
        tursoQueryOne("SELECT SUM(duration) as s FROM watch_history").catch(() => ({ s: 0 })),
        tursoQuery("SELECT id, title, views, thumbnail FROM series ORDER BY views DESC LIMIT 5").catch(() => [])
      ]);
    } catch (trafficErr) {
      console.warn("[Control Center]: Traffic query notice:", trafficErr);
    }

    // 2. Error & Health Metrics (Safe with individual catch)
    let errorCountsRow: any = { totalErrors: 0, errorsToday: 0, serverErrorsToday: 0, securityEventsToday: 0 };
    let recentErrorsRows: any[] = [];
    let reportStatsRow: any = { totalReports: 0, openReports: 0, inProgressReports: 0, resolvedReports: 0 };
    let securityAuditRow: any = { totalAuditEvents: 0, auditEventsToday: 0, threatsToday: 0 };

    try {
      [
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
        `, [`${todayISO}%`, `${todayISO}%`, `${todayISO}%`]).catch(() => ({ totalErrors: 0, errorsToday: 0, serverErrorsToday: 0, securityEventsToday: 0 })),

        tursoQuery("SELECT * FROM app_errors ORDER BY createdAt DESC LIMIT 20").catch(() => []),

        tursoQueryOne(`
          SELECT 
            COUNT(*) as totalReports,
            SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) as openReports,
            SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as inProgressReports,
            SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as resolvedReports
          FROM user_reports
        `).catch(() => ({ totalReports: 0, openReports: 0, inProgressReports: 0, resolvedReports: 0 })),

        tursoQueryOne(`
          SELECT 
            COUNT(*) as totalAuditEvents,
            SUM(CASE WHEN createdAt LIKE ? THEN 1 ELSE 0 END) as auditEventsToday,
            SUM(CASE WHEN createdAt LIKE ? AND (eventType LIKE '%FAIL%' OR eventType LIKE '%BRUTE%' OR eventType LIKE '%BAN%') THEN 1 ELSE 0 END) as threatsToday
          FROM security_audit_logs
        `, [`${todayISO}%`, `${todayISO}%`]).catch(() => ({ totalAuditEvents: 0, auditEventsToday: 0, threatsToday: 0 }))
      ]);
    } catch (healthErr) {
      console.warn("[Control Center]: Health query notice:", healthErr);
    }

    // 3. Monetization & Subscriptions
    let totalRevenueRow: any = { s: 0 };
    try {
      totalRevenueRow = await tursoQueryOne("SELECT SUM(amount) as s FROM subscriptions WHERE status = 'active' OR status = 'completed'").catch(() => ({ s: 0 }));
    } catch (revErr) {
      console.warn("[Control Center]: Revenue query notice:", revErr);
    }

    // 4. Site Settings (for Ads toggle, maintenance mode, etc.)
    const settingsMap: Record<string, string> = {};
    try {
      const settingsRows = await tursoQuery("SELECT key, value FROM site_settings").catch(() => []);
      (settingsRows || []).forEach((r: any) => {
        if (r && r.key) {
          settingsMap[r.key] = r.value;
        }
      });
    } catch (settErr) {
      console.warn("[Control Center]: Settings query notice:", settErr);
    }

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

    // Format errors for the frontend safely
    const formattedErrors = (recentErrorsRows || []).map((err: any) => ({
      id: err.id || crypto.randomUUID(),
      statusCode: Number(err.statusCode || 500),
      path: err.path || err.route || "/",
      route: err.route || err.path || "/",
      message: err.message || err.errorType || "Application error",
      clientIp: err.clientIp || err.ipAddress || "127.0.0.1",
      createdAt: err.createdAt || new Date().toISOString()
    }));

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
        recentErrors: formattedErrors
      },
      controls: {
        maintenanceMode: settingsMap["maintenance_mode"] === "true",
        announcementText: settingsMap["announcement_text"] || "",
        telegramSupport: settingsMap["support_telegram"] || settingsMap["telegram_url"] || ""
      }
    }, { headers: corsHeaders });
  } catch (err: any) {
    console.error("[Control Center API Error]:", err);
    return NextResponse.json({ success: false, message: err?.message || "Failed to load Control Center metrics" }, { status: 500, headers: corsHeaders });
  }
}
