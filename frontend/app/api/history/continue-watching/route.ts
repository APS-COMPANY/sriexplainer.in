import { NextResponse } from "next/server";
import { verifyAuth } from "../../../../lib/auth";
import { tursoQuery } from "../../../../lib/db";

export async function GET(req: Request) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.user) return NextResponse.json([]);

    const rows = await tursoQuery(`
      SELECT 
        h.*, 
        e.id as epId, e.title as episodeTitle, e.number as episodeNumber, e.thumbnail as episodeThumbnail, e.duration as episodeDuration,
        s.id as seriesId, s.title as seriesTitle, s.slug as seriesSlug, s.thumbnail as seriesThumbnail, s.banner as seriesBanner
      FROM watch_history h
      JOIN episodes e ON h.episodeId = e.id
      JOIN series s ON e.seriesId = s.id
      WHERE h.userId = ? AND (h.completed = 0 OR h.completed IS NULL) AND (h.percentage > 0 OR h.progress > 0) AND (h.percentage < 95 OR h.progress < 95)
      ORDER BY h.updatedAt DESC
      LIMIT 20
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
        completed: false,
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
          duration: r.episodeDuration || "",
          seriesTitle: r.seriesTitle || "Story Explainer",
          seriesSlug: r.seriesSlug || ""
        }
      };
    });

    return NextResponse.json(formatted);
  } catch {
    return NextResponse.json([]);
  }
}
