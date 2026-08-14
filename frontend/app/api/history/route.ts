import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "../../../lib/auth";
import { tursoQuery, tursoQueryOne, tursoExecute } from "../../../lib/db";

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.user) return NextResponse.json([], { status: 200 });

  const rows = await tursoQuery(`
    SELECT 
      h.*, 
      e.id as epId, e.title as episodeTitle, e.number as episodeNumber, e.thumbnail as episodeThumbnail, 
      s.id as seriesId, s.title as seriesTitle, s.slug as seriesSlug, s.thumbnail as seriesThumbnail, s.banner as seriesBanner
    FROM watch_history h
    JOIN episodes e ON h.episodeId = e.id
    JOIN series s ON e.seriesId = s.id
    WHERE h.userId = ?
    ORDER BY h.updatedAt DESC
  `, [auth.user.id]);

  const formatted = rows.map((r: any) => {
    const pct = Math.round(Number(r.percentage || r.progress || 0));
    const episodeId = String(r.episodeId || r.epId);
    const thumb = r.episodeThumbnail || r.seriesThumbnail || r.seriesBanner || "";

    return {
      id: r.id,
      _id: r.id,
      userId: r.userId,
      episodeId: episodeId,
      progress: pct,
      percentage: pct,
      currentPosition: Number(r.currentPosition || 0),
      duration: Number(r.duration || 0),
      completed: Boolean(r.completed || pct >= 90),
      updatedAt: r.updatedAt,
      episodeTitle: r.episodeTitle || "Episode",
      episodeNumber: Number(r.episodeNumber || 1),
      episodeThumbnail: thumb,
      seriesTitle: r.seriesTitle || "Story Explainer",
      seriesSlug: r.seriesSlug || "",
      seriesThumbnail: r.seriesThumbnail || "",
      seriesBanner: r.seriesBanner || "",
      episode: {
        id: episodeId,
        _id: episodeId,
        number: Number(r.episodeNumber || 1),
        title: r.episodeTitle || "Episode",
        thumbnail: thumb,
        seriesTitle: r.seriesTitle || "Story Explainer",
        seriesSlug: r.seriesSlug || ""
      }
    };
  });

  return NextResponse.json(formatted);
}

export async function POST(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.user) {
    return NextResponse.json({ message: auth.error || "Authentication required" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const d = z.object({
      episodeId: z.string(),
      progress: z.number().optional().default(0),
      currentPosition: z.number().optional().default(0),
      duration: z.number().optional().default(0),
      completed: z.boolean().optional().default(false)
    }).parse(body);

    const now = new Date().toISOString();
    const existing = await tursoQueryOne(
      "SELECT * FROM watch_history WHERE userId = ? AND episodeId = ?",
      [auth.user.id, d.episodeId]
    );

    const percentage = d.duration > 0 ? Math.min(100, (d.currentPosition / d.duration) * 100) : d.progress;

    if (existing) {
      await tursoExecute(`
        UPDATE watch_history
        SET progress = ?, currentPosition = ?, duration = ?, percentage = ?, completed = ?, updatedAt = ?
        WHERE id = ?
      `, [d.progress, d.currentPosition, d.duration, percentage, d.completed ? 1 : 0, now, existing.id]);
    } else {
      await tursoExecute(`
        INSERT INTO watch_history (id, userId, episodeId, progress, currentPosition, duration, percentage, completed, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [crypto.randomUUID(), auth.user.id, d.episodeId, d.progress, d.currentPosition, d.duration, percentage, d.completed ? 1 : 0, now]);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "History update failed" }, { status: 400 });
  }
}
