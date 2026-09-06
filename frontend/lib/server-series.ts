import { tursoQuery } from "./db";

export interface SeriesQueryOptions {
  limit?: number;
  trending?: boolean;
  status?: string;
  sort?: string;
}

export async function getSeries(options: SeriesQueryOptions = {}): Promise<any[]> {
  try {
    const { limit = 12, trending, status, sort = "newest" } = options;

    let sql = "SELECT * FROM series WHERE 1=1";
    const params: any[] = [];

    if (status) {
      if (status.toLowerCase() === "upcoming") {
        sql += " AND (LOWER(status) = 'upcoming' OR isUpcoming = 1)";
      } else {
        sql += " AND LOWER(status) = ?";
        params.push(status.toLowerCase());
      }
    } else if (trending) {
      sql += " AND trending = 1";
    }

    if (sort === "popular") {
      sql += " ORDER BY views DESC, createdAt DESC";
    } else if (sort === "oldest") {
      sql += " ORDER BY createdAt ASC";
    } else {
      sql += " ORDER BY createdAt DESC";
    }

    if (limit > 0) {
      sql += ` LIMIT ${Math.min(limit, 100)}`;
    }

    const rows = await tursoQuery(sql, params);
    if (!rows || rows.length === 0) {
      return [];
    }

    const seriesIds = Array.from(new Set(rows.flatMap((r) => [String(r.id), String(r.slug)].filter(Boolean))));
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

    const episodesBySeries = new Map<string, any[]>();
    for (const ep of allEpisodes) {
      const sId = String(ep.seriesId);
      if (!episodesBySeries.has(sId)) {
        episodesBySeries.set(sId, []);
      }
      episodesBySeries.get(sId)!.push(ep);
    }

    const now = Date.now();
    return rows.map((row) => {
      let genres = [];
      try {
        genres = JSON.parse(row.genres || "[]");
      } catch {}
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
  } catch (err: any) {
    console.error("[getSeries Error]:", err?.message);
    return [];
  }
}
