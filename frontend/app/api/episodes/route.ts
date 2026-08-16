import { NextResponse } from "next/server";
import { verifyAuth } from "../../../lib/auth";
import { tursoQuery } from "../../../lib/db";

export async function GET(req: Request) {
  try {
    const auth = await verifyAuth(req);
    const isUserAdmin = Boolean(auth.isAdmin || auth.isMainAdmin || auth.user?.role === "admin");

    const { searchParams } = new URL(req.url);
    const seriesId = searchParams.get("seriesId");
    const upcoming = searchParams.get("upcoming");

    const nowISO = new Date().toISOString();
    let sql = "SELECT e.*, s.title as seriesTitle, s.slug as seriesSlug, s.thumbnail as seriesThumbnail FROM episodes e JOIN series s ON e.seriesId = s.id";
    const params: any[] = [];
    const conditions: string[] = [];

    if (!isUserAdmin) {
      conditions.push("(e.visibility = 'public' OR e.visibility IS NULL OR e.visibility = '')");
    }

    if (upcoming === "true") {
      conditions.push("(e.scheduledReleaseAt IS NOT NULL AND e.scheduledReleaseAt > ?)");
      params.push(nowISO);
    } else if (seriesId) {
      conditions.push("e.seriesId = ?");
      params.push(seriesId);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    if (upcoming === "true") {
      sql += " ORDER BY CASE WHEN e.scheduledReleaseAt IS NOT NULL THEN e.scheduledReleaseAt ELSE e.createdAt END ASC";
    } else if (seriesId) {
      sql += " ORDER BY e.number ASC";
    } else {
      sql += " ORDER BY e.createdAt DESC";
    }

    let rows: any[] = [];
    try {
      rows = await tursoQuery(sql, params);
    } catch (queryErr) {
      console.warn("[Episodes Query Fallback]:", queryErr);
      try {
        if (seriesId) {
          rows = await tursoQuery("SELECT * FROM episodes WHERE seriesId = ? ORDER BY number ASC", [seriesId]);
        } else {
          rows = await tursoQuery("SELECT * FROM episodes ORDER BY createdAt DESC LIMIT 50");
        }
      } catch {
        rows = [];
      }
    }

    const formatted = rows.map((ep: any) => {
      const isUpcoming = Boolean(
        (ep.scheduledReleaseAt && new Date(ep.scheduledReleaseAt).getTime() > Date.now()) || ep.isUpcoming
      );

      const accessLower = (ep.access || "free").toLowerCase().trim();
      const isXpCoins = accessLower === "xp_coins" || accessLower === "premium" || accessLower === "subscription";
      const xpCost = isXpCoins ? Math.max(1, Number(ep.xpCost || 5)) : 0;

      return {
        ...ep,
        _id: ep.id,
        number: Number(ep.number || 1),
        quality: ep.quality || "1080P",
        visibility: ep.visibility || "public",
        access: isXpCoins ? "xp_coins" : "free",
        xpCost,
        isUpcoming,
        upcomingDisplayMessage: ep.upcomingDisplayMessage || ""
      };
    });

    return NextResponse.json(formatted);
  } catch (err: any) {
    console.error("[Episodes API Route Error]:", err);
    return NextResponse.json([]);
  }
}
