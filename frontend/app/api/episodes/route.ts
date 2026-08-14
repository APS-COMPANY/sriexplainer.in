import { NextResponse } from "next/server";
import { verifyAuth } from "../../../lib/auth";
import { tursoQuery } from "../../../lib/db";

export async function GET(req: Request) {
  // Server-side Admin session & authorization check
  const auth = await verifyAuth(req);
  const isUserAdmin = Boolean(auth.isAdmin || auth.isMainAdmin || auth.user?.role === "admin");

  if (!isUserAdmin) {
    // Return generic 404 Not Found so no sensitive data or structure is disclosed
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const seriesId = searchParams.get("seriesId");
  const upcoming = searchParams.get("upcoming");

  const nowISO = new Date().toISOString();
  let sql = "SELECT e.*, s.title as seriesTitle, s.slug as seriesSlug, s.thumbnail as seriesThumbnail FROM episodes e JOIN series s ON e.seriesId = s.id";
  const params: any[] = [];

  if (upcoming === "true") {
    sql += " WHERE e.scheduledReleaseAt IS NOT NULL AND e.scheduledReleaseAt > ?";
    params.push(nowISO);
    sql += " ORDER BY e.scheduledReleaseAt ASC";
  } else if (seriesId) {
    sql += " WHERE e.seriesId = ?";
    params.push(seriesId);
    sql += " ORDER BY e.number ASC";
  } else {
    sql += " ORDER BY e.createdAt DESC";
  }

  const rows = await tursoQuery(sql, params);

  const formatted = rows.map((ep: any) => {
    const isUpcoming = Boolean(
      ep.scheduledReleaseAt && new Date(ep.scheduledReleaseAt).getTime() > Date.now()
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
}
