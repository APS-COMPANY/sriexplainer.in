import { NextResponse } from "next/server";
import { tursoQuery } from "../../../lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reqCategory = searchParams.get("category") || "";

    let catSettings: any[] = [];
    try {
      catSettings = await tursoQuery("SELECT * FROM hero_categories_settings");
    } catch {}

    const disabledCategories = new Set<string>();
    catSettings.forEach((cs) => {
      if (cs.isVisible === 0 || cs.isVisible === false) {
        disabledCategories.add(cs.category);
      }
    });

    if (reqCategory && disabledCategories.has(reqCategory)) {
      return NextResponse.json([]);
    }

    let rows: any[] = [];
    try {
      let sql = `
        SELECT s.*, ser.slug as seriesSlug, ser.title as seriesTitle, ser.description as seriesDesc, ser.banner as seriesBanner, ser.thumbnail as seriesThumbnail, ser.genres as seriesGenres
        FROM hero_slideshows s
        LEFT JOIN series ser ON s.seriesId = ser.id
        WHERE s.isSlotVisible = 1
      `;
      const params: any[] = [];

      if (reqCategory) {
        sql += " AND s.category = ?";
        params.push(reqCategory);
      }

      sql += " ORDER BY s.category ASC, s.slotIndex ASC";
      rows = await tursoQuery(sql, params);
    } catch {}

    const filtered = rows.filter((r) => !disabledCategories.has(r.category));

    if (filtered.length > 0) {
      const formatted = filtered.map((r) => {
        let genres = [];
        try { genres = JSON.parse(r.seriesGenres || "[]"); } catch {}

        const title = r.title && r.title.trim() ? r.title : (r.seriesTitle || "Featured Series");
        const description = r.description && r.description.trim() ? r.description : (r.seriesDesc || "");
        const heroImage = r.heroImage && r.heroImage.trim() ? r.heroImage : (r.seriesBanner || r.seriesThumbnail || "");

        return {
          id: r.id,
          _id: r.id,
          category: r.category,
          slotIndex: r.slotIndex,
          seriesId: r.seriesId,
          slug: r.seriesSlug || "",
          title,
          subtitle: r.subtitle || "",
          description,
          heroImage,
          thumbnail: r.seriesThumbnail || heroImage,
          banner: r.seriesBanner || heroImage,
          buttonText: r.buttonText || "Watch Now",
          buttonLink: r.buttonLink || (r.seriesSlug ? `/series/${r.seriesSlug}` : "#"),
          genres
        };
      });

      return NextResponse.json(formatted, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600"
        }
      });
    }

    // Fallback to top featured series from series table
    const seriesRows = await tursoQuery("SELECT * FROM series ORDER BY views DESC, createdAt DESC LIMIT 6");
    const fallback = seriesRows.map((s: any) => {
      let genres = [];
      try { genres = JSON.parse(s.genres || "[]"); } catch {}
      return {
        id: s.id,
        _id: s.id,
        seriesId: s.id,
        slug: s.slug || "",
        title: s.title,
        description: s.description || "",
        heroImage: s.banner || s.thumbnail || "",
        thumbnail: s.thumbnail || "",
        banner: s.banner || "",
        buttonText: "Watch Now",
        buttonLink: `/series/${s.slug || s.id}`,
        genres
      };
    });

    return NextResponse.json(fallback, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600"
      }
    });
  } catch (err: any) {
    return NextResponse.json([], { status: 200 });
  }
}
