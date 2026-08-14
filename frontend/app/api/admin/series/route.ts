import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "../../../../lib/auth";
import { tursoQueryOne, tursoExecute } from "../../../../lib/db";

const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function POST(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const d = z.object({
      title: z.string().min(1),
      originalTitle: z.string().optional().default(""),
      type: z.string().optional().default("Series"),
      description: z.string().optional().default(""),
      genre: z.string().optional().default(""),
      genres: z.array(z.string()).optional(),
      creator: z.string().optional().default(""),
      year: z.union([z.string(), z.number()]).optional().default("2026"),
      status: z.string().optional().default("Completed"),
      country: z.string().optional().default(""),
      thumbnail: z.string().optional().default(""),
      banner: z.string().optional().default(""),
      featured: z.boolean().optional().default(false),
      trending: z.boolean().optional().default(false)
    }).parse(body);

    const seriesId = crypto.randomUUID();
    let baseSlug = slug(d.title);
    let finalSlug = baseSlug;

    const existingSlug = await tursoQueryOne("SELECT id FROM series WHERE slug = ?", [finalSlug]);
    if (existingSlug) {
      finalSlug = `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`;
    }

    const now = new Date().toISOString();
    const genresArr = d.genres ? d.genres : (d.genre ? d.genre.split(",").map((s) => s.trim()).filter(Boolean) : []);
    const genresJson = JSON.stringify(genresArr);
    const genreStr = genresArr.join(", ");
    const creatorVal = body.creator !== undefined ? body.creator : (d.creator || "");

    const isUpcoming = body.isUpcoming !== undefined ? (body.isUpcoming ? 1 : 0) : ((d.status || "").toLowerCase() === "upcoming" ? 1 : 0);
    const upcomingMessage = body.upcomingMessage || "";
    const posterBadgesJson = body.posterBadges ? (typeof body.posterBadges === "string" ? body.posterBadges : JSON.stringify(body.posterBadges)) : null;

    await tursoExecute(`
      INSERT INTO series (id, title, originalTitle, slug, type, description, genre, genres, creator, year, status, logo, thumbnail, banner, featured, trending, isUpcoming, upcomingMessage, posterBadges, views, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `, [
      seriesId, d.title.trim(), d.originalTitle, finalSlug, d.type,
      d.description, genreStr, genresJson, creatorVal, String(d.year), d.status,
      body.logo || "", d.thumbnail, d.banner, d.featured ? 1 : 0, d.trending ? 1 : 0, isUpcoming, upcomingMessage, posterBadgesJson, now
    ]);

    const created = await tursoQueryOne("SELECT * FROM series WHERE id = ?", [seriesId]);
    return NextResponse.json({ ...created, _id: seriesId, genres: genresArr }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Failed to create series" }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { id, ...updateData } = body;
    if (!id) return NextResponse.json({ message: "Series ID required" }, { status: 400 });

    const s = await tursoQueryOne("SELECT * FROM series WHERE id = ?", [id]);
    if (!s) return NextResponse.json({ message: "Series not found" }, { status: 404 });

    const title = updateData.title ? updateData.title.trim() : s.title;
    const description = updateData.description !== undefined ? updateData.description : s.description;
    const thumbnail = updateData.thumbnail !== undefined ? updateData.thumbnail : s.thumbnail;
    const banner = updateData.banner !== undefined ? updateData.banner : s.banner;
    const featured = updateData.featured !== undefined ? (updateData.featured ? 1 : 0) : s.featured;
    const trending = updateData.trending !== undefined ? (updateData.trending ? 1 : 0) : s.trending;
    const creator = updateData.creator !== undefined ? updateData.creator : (s.creator || "");
    const type = updateData.type !== undefined ? updateData.type : (s.type || "");
    const genreStr = updateData.genres ? JSON.stringify(updateData.genres) : (updateData.genre || s.genre);
    const posterBadgesVal = updateData.posterBadges !== undefined 
      ? (typeof updateData.posterBadges === "string" ? updateData.posterBadges : JSON.stringify(updateData.posterBadges))
      : s.posterBadges;

    await tursoExecute(`
      UPDATE series
      SET title = ?, description = ?, thumbnail = ?, banner = ?, featured = ?, trending = ?, genre = ?, creator = ?, type = ?, posterBadges = ?
      WHERE id = ?
    `, [title, description, thumbnail, banner, featured, trending, genreStr, creator, type, posterBadgesVal, id]);

    const updated = await tursoQueryOne("SELECT * FROM series WHERE id = ?", [id]);
    return NextResponse.json({ ...updated, _id: id });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Failed to update series" }, { status: 400 });
  }
}
