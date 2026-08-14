import { NextResponse } from "next/server";
import { verifyAuth } from "../../../../lib/auth";
import { tursoQuery } from "../../../../lib/db";

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin && auth.user?.role !== "co_admin") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const seriesList = await tursoQuery("SELECT id, title, slug, description, thumbnail, banner, genre, views, createdAt FROM series", []);
    const episodeCountRes = await tursoQuery("SELECT COUNT(*) as cnt FROM episodes WHERE visibility = 'public'", []);
    const categoryCountRes = await tursoQuery("SELECT COUNT(*) as cnt FROM categories", []);

    const totalSeries = seriesList.length;
    const totalEpisodes = Number(episodeCountRes[0]?.cnt || 0);
    const totalCategories = Number(categoryCountRes[0]?.cnt || 0);
    const staticPagesCount = 6;
    const totalIndexedUrls = totalSeries + totalEpisodes + totalCategories + staticPagesCount;

    // Audit checks
    let seriesWithDesc = 0;
    let seriesWithThumbnail = 0;
    let seriesWithBanner = 0;
    let seriesWithGenre = 0;

    const missingMetaList: any[] = [];

    for (const s of seriesList) {
      const hasDesc = Boolean(s.description && s.description.trim().length >= 20);
      const hasThumb = Boolean(s.thumbnail && s.thumbnail.trim());
      const hasBanner = Boolean(s.banner && s.banner.trim());
      const hasGenre = Boolean(s.genre || (s.genres && s.genres !== "[]"));

      if (hasDesc) seriesWithDesc++;
      if (hasThumb) seriesWithThumbnail++;
      if (hasBanner) seriesWithBanner++;
      if (hasGenre) seriesWithGenre++;

      const issues: string[] = [];
      if (!hasDesc) issues.push("Short or missing description");
      if (!hasThumb) issues.push("Missing poster thumbnail");
      if (!hasBanner) issues.push("Missing hero banner");
      if (!hasGenre) issues.push("Missing genre category tag");

      if (issues.length > 0) {
        missingMetaList.push({
          id: s.id,
          title: s.title,
          slug: s.slug,
          issues
        });
      }
    }

    // Calculate SEO Score out of 100%
    let seoScore = 100;
    if (totalSeries > 0) {
      const descRatio = seriesWithDesc / totalSeries;
      const thumbRatio = seriesWithThumbnail / totalSeries;
      const bannerRatio = seriesWithBanner / totalSeries;
      const genreRatio = seriesWithGenre / totalSeries;

      const weightedScore = (descRatio * 40) + (thumbRatio * 30) + (bannerRatio * 15) + (genreRatio * 15);
      seoScore = Math.round(weightedScore);
    }

    return NextResponse.json({
      success: true,
      seoScore,
      totalIndexedUrls,
      metrics: {
        totalSeries,
        totalEpisodes,
        totalCategories,
        seriesWithDesc,
        seriesWithThumbnail,
        seriesWithBanner,
        seriesWithGenre
      },
      missingMetaList: missingMetaList.slice(0, 15),
      sitemapUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://sriexplainer.com"}/sitemap.xml`,
      robotsUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://sriexplainer.com"}/robots.txt`,
      lastAnalyzed: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Failed to analyze SEO stats" }, { status: 500 });
  }
}
