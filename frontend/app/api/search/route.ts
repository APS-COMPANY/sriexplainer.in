import { NextResponse } from "next/server";
import { tursoQuery } from "../../../lib/db";

async function formatSeries(row: any) {
  if (!row) return null;
  let genres = [];
  try { genres = JSON.parse(row.genres || "[]"); } catch {}
  if (!Array.isArray(genres) || genres.length === 0) {
    if (row.genre) genres = row.genre.split(",").map((s: string) => s.trim()).filter(Boolean);
  }

  let episodeCount = 0;
  let latestEpisodeNumber = 0;
  let latestEpisodeQuality = "1080P";

  try {
    const sId = String(row.id || row._id || "");
    const episodes = await tursoQuery(
      "SELECT number, quality, scheduledReleaseAt, isUpcoming, visibility FROM episodes WHERE seriesId = ? OR seriesId = ? ORDER BY CAST(number AS INTEGER) DESC, createdAt DESC",
      [sId, row.slug || sId]
    );

    const now = Date.now();
    const availableEpisodes = episodes.filter((ep: any) => {
      const isPrivate = (ep.visibility || "public").toLowerCase().trim() === "private";
      if (isPrivate) return false;
      const isFutureScheduled = ep.scheduledReleaseAt && new Date(ep.scheduledReleaseAt).getTime() > now;
      if (isFutureScheduled) return false;
      if (ep.isUpcoming === 1 || ep.isUpcoming === true) return false;
      return true;
    });

    episodeCount = availableEpisodes.length;
    if (episodeCount > 0) {
      const latestEp = availableEpisodes[0];
      latestEpisodeNumber = Number(latestEp.number || episodeCount);
      const rawQuality = (latestEp.quality || "1080P").toUpperCase().trim();
      latestEpisodeQuality = rawQuality || "1080P";
    }
  } catch {}

  return {
    ...row,
    _id: row.id,
    creator: row.creator || "",
    year: Number(row.year || 2026),
    views: Number(row.views || 0),
    thumbnail: row.thumbnail || "",
    banner: row.banner || "",
    episodeCount,
    latestEpisodeNumber,
    latestEpisodeQuality,
    latestQuality: latestEpisodeQuality,
    maxQuality: latestEpisodeQuality,
    genres,
    visibility: row.visibility || "public",
    isUpcoming: Boolean(row.isUpcoming),
    isMovie: Boolean(row.isMovie),
    featured: Boolean(row.featured),
    trending: Boolean(row.trending)
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").toLowerCase().trim();

  if (!q) {
    return NextResponse.json([]);
  }

  let sql = "SELECT * FROM series WHERE 1=1";
  const params: any[] = [];

  const tokens = q.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    sql += " AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(genre) LIKE ?)";
    const wildcard = `%${token}%`;
    params.push(wildcard, wildcard, wildcard);
  }

  sql += " ORDER BY createdAt DESC";

  const rows = await tursoQuery(sql, params);
  const formatted = await Promise.all(rows.map((row) => formatSeries(row)));
  return NextResponse.json(formatted);
}
