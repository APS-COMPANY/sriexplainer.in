import { NextResponse } from "next/server";
import { tursoQueryOne, tursoQuery, tursoExecute } from "../../../../lib/db";
import { verifyAuth } from "../../../../lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await verifyAuth(_req);
  const isAdmin = Boolean(auth.isAdmin || auth.isMainAdmin || auth.user?.role === "admin");

  const s = await tursoQueryOne("SELECT * FROM series WHERE slug = ? OR id = ?", [slug, slug]);
  if (!s) {
    return NextResponse.json({ message: "Series not found" }, { status: 404 });
  }

  const episodes = await tursoQuery(
    "SELECT * FROM episodes WHERE seriesId = ? ORDER BY number ASC",
    [s.id]
  );

  let unlockedEpisodeIds = new Set<string>();
  if (auth.user) {
    const unlocks = await tursoQuery(
      "SELECT episodeId FROM episode_unlocks WHERE userId = ?",
      [auth.user.id]
    );
    unlockedEpisodeIds = new Set(unlocks.map((u: any) => String(u.episodeId)));
  }

  let genres = [];
  try { genres = JSON.parse(s.genres || "[]"); } catch {}

  const formattedSeries = {
    ...s,
    _id: s.id,
    year: Number(s.year || 2026),
    views: Number(s.views || 0),
    thumbnail: s.thumbnail || "",
    banner: s.banner || "",
    genres,
    visibility: s.visibility || "public",
    isUpcoming: Boolean(s.isUpcoming),
    upcomingMessage: s.upcomingMessage || "",
    isMovie: Boolean(s.isMovie),
    featured: Boolean(s.featured),
    trending: Boolean(s.trending)
  };

  const now = Date.now();
  const formattedEpisodes = episodes.map((ep) => {
    const isUpcoming = Boolean(
      ep.scheduledReleaseAt && new Date(ep.scheduledReleaseAt).getTime() > now
    );
    const accessLower = (ep.access || "free").toLowerCase().trim();
    const isXpCoins = accessLower === "xp_coins" || accessLower === "premium" || accessLower === "subscription";
    const xpCost = isXpCoins ? Math.max(1, Number(ep.xpCost || 5)) : 0;
    const isUnlocked = !isXpCoins || isAdmin || unlockedEpisodeIds.has(String(ep.id));

    return {
      ...ep,
      _id: ep.id,
      number: Number(ep.number || 1),
      rumbleEmbedUrl: isUnlocked ? (ep.rumbleEmbedUrl || "") : "",
      quality: ep.quality || "1080P",
      visibility: ep.visibility || "public",
      access: isXpCoins ? "xp_coins" : "free",
      xpCost,
      isUnlocked,
      isUpcoming,
      upcomingDisplayMessage: ep.upcomingDisplayMessage || ""
    };
  });

  return NextResponse.json({
    ...formattedSeries,
    series: formattedSeries,
    episodes: formattedEpisodes,
    isAdmin
  }, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate"
    }
  });
}
