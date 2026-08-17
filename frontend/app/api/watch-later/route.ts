import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "../../../lib/auth";
import { tursoQuery, tursoQueryOne, tursoExecute } from "../../../lib/db";

async function formatWatchLaterRow(row: any) {
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
    const episodes = await tursoQuery(
      "SELECT number, quality, scheduledReleaseAt, isUpcoming, visibility FROM episodes WHERE seriesId = ? ORDER BY CAST(number AS INTEGER) DESC, createdAt DESC",
      [row.id || row.seriesId]
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
  const auth = await verifyAuth(req);
  if (!auth.user) return NextResponse.json([], { status: 200 });

  const rows = await tursoQuery(
    "SELECT w.id as watchLaterId, s.* FROM watch_later w JOIN series s ON w.seriesId = s.id WHERE w.userId = ? ORDER BY w.createdAt DESC",
    [auth.user.id]
  );
  const formatted = await Promise.all(rows.map(formatWatchLaterRow));
  return NextResponse.json(formatted.filter(Boolean));
}

export async function POST(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.user) {
    return NextResponse.json({ message: auth.error || "Authentication required" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const d = z.object({ seriesId: z.string() }).parse(body);

    const existing = await tursoQueryOne(
      "SELECT * FROM watch_later WHERE userId = ? AND seriesId = ?",
      [auth.user.id, d.seriesId]
    );

    if (existing) {
      await tursoExecute("DELETE FROM watch_later WHERE id = ?", [existing.id]);
      return NextResponse.json({ saved: false });
    }

    await tursoExecute(
      "INSERT INTO watch_later (id, userId, seriesId, createdAt) VALUES (?, ?, ?, ?)",
      [crypto.randomUUID(), auth.user.id, d.seriesId, new Date().toISOString()]
    );
    return NextResponse.json({ saved: true });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Watch later update failed" }, { status: 400 });
  }
}
