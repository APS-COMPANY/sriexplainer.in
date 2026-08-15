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
  let maxQuality = "1080P";

  try {
    const episodes = await tursoQuery("SELECT quality FROM episodes WHERE seriesId = ?", [row.id]);
    episodeCount = episodes.length;

    if (episodeCount > 0) {
      const qualities = episodes.map((q: any) => (q.quality || "1080P").toUpperCase());
      if (qualities.some((q: string) => q.includes("4K") || q.includes("2160P"))) maxQuality = "4K";
      else if (qualities.some((q: string) => q.includes("2K") || q.includes("1440P"))) maxQuality = "2K";
      else if (qualities.some((q: string) => q.includes("1080P") || q.includes("FULL HD"))) maxQuality = "1080P";
      else if (qualities.some((q: string) => q.includes("720P"))) maxQuality = "720P";
      else if (qualities.some((q: string) => q.includes("480P"))) maxQuality = "480P";
      else if (qualities.some((q: string) => q.includes("360P"))) maxQuality = "360P";
      else if (qualities.length > 0) maxQuality = qualities[0];
    }
  } catch {}

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
    maxQuality,
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

  const rows = await tursoQuery(sql, params);
  const formatted = await Promise.all(rows.map((row) => formatSeries(row)));
  return NextResponse.json(formatted, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate"
    }
  });
}
