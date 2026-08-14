import type { MetadataRoute } from "next";
import { tursoQuery } from "../lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://sriexplainer.com").replace(/\/$/, "");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 }
  ];

  try {
    // 1. Dynamic Series Routes
    const seriesRows = await tursoQuery("SELECT slug, createdAt FROM series WHERE visibility = 'public'", []);
    const seriesRoutes: MetadataRoute.Sitemap = seriesRows.map((s) => ({
      url: `${baseUrl}/series/${s.slug}`,
      lastModified: s.createdAt ? new Date(s.createdAt) : new Date(),
      changeFrequency: "weekly",
      priority: 0.85
    }));

    // 2. Dynamic Category Routes
    const categoryRows = await tursoQuery("SELECT slug, createdAt FROM categories", []);
    const categoryRoutes: MetadataRoute.Sitemap = categoryRows.map((c) => ({
      url: `${baseUrl}/${c.slug}`,
      lastModified: c.createdAt ? new Date(c.createdAt) : new Date(),
      changeFrequency: "weekly",
      priority: 0.75
    }));

    // 3. Dynamic Episode Routes
    const episodeRows = await tursoQuery("SELECT id, createdAt FROM episodes WHERE visibility = 'public'", []);
    const episodeRoutes: MetadataRoute.Sitemap = episodeRows.map((e) => ({
      url: `${baseUrl}/watch?v=${e.id}`,
      lastModified: e.createdAt ? new Date(e.createdAt) : new Date(),
      changeFrequency: "weekly",
      priority: 0.8
    }));

    return [...staticRoutes, ...seriesRoutes, ...categoryRoutes, ...episodeRoutes];
  } catch (err) {
    console.error("[Dynamic Sitemap Notice]:", err);
    return staticRoutes;
  }
}
