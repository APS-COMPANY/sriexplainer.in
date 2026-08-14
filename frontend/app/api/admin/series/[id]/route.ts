/**
 * Admin Series Management Route Handler
 * Supports DELETE, PATCH, and PUT for updating series status (Ongoing / Completed) and metadata
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "../../../../../lib/auth";
import { tursoExecute, tursoQueryOne } from "../../../../../lib/db";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await verifyAuth(_req);
  if (!auth.isAdmin) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  await tursoExecute("DELETE FROM episodes WHERE seriesId = ?", [id]);
  await tursoExecute("DELETE FROM series WHERE id = ?", [id]);
  return NextResponse.json({ success: true, message: "Series deleted successfully" });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await verifyAuth(req);
  if (!auth.isAdmin) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const existing = await tursoQueryOne("SELECT * FROM series WHERE id = ?", [id]);
    if (!existing) {
      return NextResponse.json({ message: "Series not found" }, { status: 404 });
    }

    const title = body.title !== undefined ? body.title.trim() : existing.title;
    const description = body.description !== undefined ? body.description.trim() : (existing.description || "");
    const logo = body.logo !== undefined ? body.logo : (existing.logo || "");
    const thumbnail = body.thumbnail !== undefined ? body.thumbnail : (existing.thumbnail || "");
    const banner = body.banner !== undefined ? body.banner : (existing.banner || "");
    const status = body.status !== undefined ? body.status : (existing.status || "ongoing");
    const year = body.year !== undefined ? Number(body.year) : (existing.year || 2026);
    const language = body.language !== undefined ? body.language : (existing.language || "English");
    const rating = body.rating !== undefined ? body.rating : (existing.rating || "PG-13");
    const visibility = body.visibility !== undefined ? body.visibility : (existing.visibility || "public");
    const creator = body.creator !== undefined ? body.creator : (existing.creator || "");
    const type = body.type !== undefined ? body.type : (existing.type || "");

    let genresArr: string[] = [];
    if (body.genres !== undefined) {
      genresArr = typeof body.genres === "string" ? body.genres.split(",").map((s: string) => s.trim()).filter(Boolean) : body.genres;
    } else {
      try { genresArr = JSON.parse(existing.genres || "[]"); } catch { genresArr = existing.genre ? existing.genre.split(",").map((s: string) => s.trim()) : []; }
    }
    const genresJson = JSON.stringify(genresArr);
    const genreStr = genresArr.join(", ");

    const isUpcomingVal = (status.toLowerCase() === "upcoming") ? 1 : (body.isUpcoming !== undefined ? (body.isUpcoming ? 1 : 0) : (existing.isUpcoming ? 1 : 0));
    const upcomingMessage = body.upcomingMessage !== undefined ? body.upcomingMessage : (existing.upcomingMessage || "");
    const posterBadgesVal = body.posterBadges !== undefined
      ? (typeof body.posterBadges === "string" ? body.posterBadges : JSON.stringify(body.posterBadges))
      : existing.posterBadges;

    await tursoExecute(`
      UPDATE series
      SET title = ?, description = ?, logo = ?, thumbnail = ?, banner = ?, status = ?, year = ?, language = ?, rating = ?, visibility = ?, genres = ?, genre = ?, creator = ?, type = ?, isUpcoming = ?, upcomingMessage = ?, posterBadges = ?
      WHERE id = ?
    `, [title, description, logo, thumbnail, banner, status, year, language, rating, visibility, genresJson, genreStr, creator, type, isUpcomingVal, upcomingMessage, posterBadgesVal, id]);

    const updated = await tursoQueryOne("SELECT * FROM series WHERE id = ?", [id]);
    return NextResponse.json({ ...updated, _id: id, genres: genresArr });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Could not update series" }, { status: 400 });
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return PATCH(req, ctx);
}
