import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "../../../../lib/auth";
import { tursoQuery, tursoQueryOne, tursoExecute } from "../../../../lib/db";
import { sendEpisodePublicationNotification } from "../../../../lib/telegram-notifier";

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const seriesId = searchParams.get("seriesId");

  let sql = "SELECT e.*, s.title as seriesTitle FROM episodes e JOIN series s ON e.seriesId = s.id";
  const params: any[] = [];

  if (seriesId) {
    sql += " WHERE e.seriesId = ?";
    params.push(seriesId);
  }

  sql += " ORDER BY e.createdAt DESC";
  const rows = await tursoQuery(sql, params);

  return NextResponse.json(rows.map((e: any) => {
    const acc = (e.access || "free").toLowerCase().trim();
    const isXp = acc === "xp_coins" || acc === "premium" || acc === "subscription";
    return {
      ...e,
      _id: e.id,
      number: Number(e.number || 1),
      quality: e.quality || "1080P",
      visibility: e.visibility || "public",
      access: isXp ? "xp_coins" : "free",
      xpCost: isXp ? Math.max(1, Number(e.xpCost || 5)) : 0
    };
  }));
}

export async function POST(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const seriesId = body.seriesId || body.series;
    if (!seriesId) {
      return NextResponse.json({ message: "Series selection is required" }, { status: 400 });
    }

    const d = z.object({
      number: z.number().min(1),
      title: z.string().min(1),
      rumbleEmbedUrl: z.string().min(1),
      duration: z.string().optional().default(""),
      quality: z.string().optional().default("1080P"),
      visibility: z.string().optional().default("public"),
      access: z.string().optional().default("free"),
      xpCost: z.number().optional().default(5),
      thumbnail: z.string().optional().default(""),
      scheduledReleaseAt: z.string().nullable().optional().default(null)
    }).parse(body);

    const episodeId = crypto.randomUUID();
    const now = new Date().toISOString();
    const rawAccess = (d.access || "free").toLowerCase().trim();
    const accessVal = (rawAccess === "premium" || rawAccess === "subscription" || rawAccess === "xp_coins") ? "xp_coins" : "free";
    const xpCostVal = accessVal === "xp_coins" ? Math.max(1, Number(d.xpCost || body.xpCost || 5)) : 0;
    const scheduledReleaseAt = d.scheduledReleaseAt ? new Date(d.scheduledReleaseAt).toISOString() : null;
    const upcomingDisplayMessage = body.upcomingDisplayMessage || "";

    await tursoExecute(`
      INSERT INTO episodes (id, seriesId, number, title, rumbleEmbedUrl, duration, quality, visibility, access, xpCost, releaseDate, thumbnail, scheduledReleaseAt, upcomingDisplayMessage, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [episodeId, seriesId, d.number, d.title.trim(), d.rumbleEmbedUrl.trim(), d.duration, d.quality, d.visibility, accessVal, xpCostVal, now, d.thumbnail, scheduledReleaseAt, upcomingDisplayMessage, now]);

    // Send Telegram Notification asynchronously if published immediately
    if (!scheduledReleaseAt || new Date(scheduledReleaseAt).getTime() <= Date.now()) {
      sendEpisodePublicationNotification(episodeId).catch((err) => {
        console.error("[Telegram Publication Alert Exception]:", err);
      });
    }

    const created = await tursoQueryOne("SELECT * FROM episodes WHERE id = ?", [episodeId]);
    return NextResponse.json({ ...created, _id: episodeId, access: accessVal, xpCost: xpCostVal }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Failed to create episode" }, { status: 400 });
  }
}
