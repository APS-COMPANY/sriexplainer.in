import { NextResponse } from "next/server";
import { tursoQuery } from "../../../lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").toLowerCase().trim();
  const genre = searchParams.get("genre");
  const year = searchParams.get("year");
  const status = searchParams.get("status");
  const sort = searchParams.get("sort") || "newest";

  let sql = "SELECT * FROM series WHERE 1=1";
  const params: any[] = [];

  if (q) {
    const tokens = q.split(/\s+/).filter(Boolean);
    for (const token of tokens) {
      sql += " AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(genre) LIKE ?)";
      const wildcard = `%${token}%`;
      params.push(wildcard, wildcard, wildcard);
    }
  }

  if (genre) {
    sql += " AND LOWER(genre) LIKE ?";
    params.push(`%${genre.toLowerCase()}%`);
  }

  if (year) {
    sql += " AND year = ?";
    params.push(year);
  }

  if (status) {
    if (status.toLowerCase() === "upcoming") {
      sql += " AND (LOWER(status) = 'upcoming' OR isUpcoming = 1)";
    } else {
      sql += " AND LOWER(status) = ?";
      params.push(status.toLowerCase());
    }
  } else if (searchParams.get("upcoming") === "true") {
    sql += " AND (LOWER(status) = 'upcoming' OR isUpcoming = 1)";
  }

  if (sort === "popular") {
    sql += " ORDER BY views DESC, createdAt DESC";
  } else if (sort === "oldest") {
    sql += " ORDER BY createdAt ASC";
  } else {
    sql += " ORDER BY createdAt DESC";
  }

  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 0;
  if (limit > 0 && !isNaN(limit)) {
    sql += ` LIMIT ${Math.min(limit, 100)}`;
  }

  const rows = await tursoQuery(sql, params);
  if (!rows || rows.length === 0) {
    return NextResponse.json([], {
      headers: {
        "Cache-Control": "public, max-age=15, s-maxage=30, stale-while-revalidate=60"
      }
    });
  }

  // Batch query all episodes for these series in ONE single fast query (eliminates N+1 queries)
  const seriesIds = Array.from(new Set(rows.flatMap(r => [String(r.id), String(r.slug)].filter(Boolean))));
  const placeholders = seriesIds.map(() => "?").join(",");

  let allEpisodes: any[] = [];
  if (seriesIds.length > 0) {
    try {
      allEpisodes = await tursoQuery(
        `SELECT seriesId, number, quality, scheduledReleaseAt, isUpcoming, visibility FROM episodes WHERE seriesId IN (${placeholders}) ORDER BY CAST(number AS INTEGER) DESC, createdAt DESC`,
        seriesIds
      );
    } catch {}
  }

  // Map episodes by seriesId / seriesSlug for O(1) in-memory lookup
  const episodesBySeries = new Map<string, any[]>();
  for (const ep of allEpisodes) {
    const sId = String(ep.seriesId);
    if (!episodesBySeries.has(sId)) {
      episodesBySeries.set(sId, []);
    }
    episodesBySeries.get(sId)!.push(ep);
  }

  const now = Date.now();
  const formatted = rows.map((row) => {
    let genres = [];
    try { genres = JSON.parse(row.genres || "[]"); } catch {}
    if (!Array.isArray(genres) || genres.length === 0) {
      if (row.genre) genres = row.genre.split(",").map((s: string) => s.trim()).filter(Boolean);
    }

    const sId = String(row.id || row._id || "");
    const slug = String(row.slug || "");
    const episodes = episodesBySeries.get(sId) || episodesBySeries.get(slug) || [];

    const availableEpisodes = episodes.filter((ep: any) => {
      const isPrivate = (ep.visibility || "public").toLowerCase().trim() === "private";
      if (isPrivate) return false;
      const isFutureScheduled = ep.scheduledReleaseAt && new Date(ep.scheduledReleaseAt).getTime() > now;
      if (isFutureScheduled) return false;
      if (ep.isUpcoming === 1 || ep.isUpcoming === true) return false;
      return true;
    });

    const episodeCount = availableEpisodes.length;
    let latestEpisodeNumber = 0;
    let latestEpisodeQuality = "1080P";

    if (episodeCount > 0) {
      const latestEp = availableEpisodes[0];
      latestEpisodeNumber = Number(latestEp.number || episodeCount);
      const rawQuality = (latestEp.quality || "1080P").toUpperCase().trim();
      latestEpisodeQuality = rawQuality || "1080P";
    }

    return {
      ...row,
      _id: row.id,
      creator: row.creator || "",
      type: row.type || "",
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
  });

  return NextResponse.json(formatted, {
    headers: {
      "Cache-Control": "public, max-age=15, s-maxage=30, stale-while-revalidate=60"
    }
  });
}
