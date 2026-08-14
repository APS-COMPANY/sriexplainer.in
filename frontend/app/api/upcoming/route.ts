import { NextResponse } from "next/server";
import { tursoQuery } from "../../../lib/db";

export async function GET() {
  const nowISO = new Date().toISOString();

  // 1. Series flagged as upcoming or with status Upcoming
  const seriesRows = await tursoQuery("SELECT * FROM series WHERE LOWER(status) = 'upcoming' OR isUpcoming = 1 ORDER BY createdAt DESC LIMIT 20");

  // 2. Episodes with scheduled future release or flagged upcoming
  const episodeRows = await tursoQuery(`
    SELECT e.*, s.title as seriesTitle, s.slug as seriesSlug, s.thumbnail as seriesThumbnail, s.banner as seriesBanner, s.creator as seriesCreator, s.year as seriesYear 
    FROM episodes e 
    JOIN series s ON e.seriesId = s.id 
    WHERE (e.scheduledReleaseAt IS NOT NULL AND e.scheduledReleaseAt > ?) OR e.isUpcoming = 1 
    ORDER BY CASE WHEN e.scheduledReleaseAt IS NOT NULL THEN e.scheduledReleaseAt ELSE e.createdAt END ASC 
    LIMIT 20
  `, [nowISO]);

  const formattedSeries = seriesRows.map((s: any) => {
    let genresArr: string[] = [];
    try { genresArr = JSON.parse(s.genres || "[]"); } catch { genresArr = s.genre ? s.genre.split(",").map((x: string) => x.trim()) : []; }

    return {
      ...s,
      _id: s.id,
      status: s.status || "Upcoming",
      creator: s.creator || "",
      year: Number(s.year || 2026),
      genres: genresArr,
      thumbnail: s.thumbnail || s.banner || "",
      upcomingMessage: s.upcomingMessage || "",
      type: "series"
    };
  });

  const formattedEpisodes = episodeRows.map((e: any) => ({
    ...e,
    _id: e.id,
    thumbnail: e.thumbnail || e.seriesThumbnail || e.seriesBanner || "",
    type: "episode",
    scheduledReleaseAt: e.scheduledReleaseAt || null,
    upcomingDisplayMessage: e.upcomingDisplayMessage || "",
    releaseDate: e.scheduledReleaseAt || e.releaseDate || e.createdAt
  }));

  return NextResponse.json({
    series: formattedSeries,
    episodes: formattedEpisodes
  });
}
