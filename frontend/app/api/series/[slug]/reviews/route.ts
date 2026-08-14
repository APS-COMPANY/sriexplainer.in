import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "../../../../../lib/auth";
import { tursoQuery, tursoQueryOne, tursoExecute } from "../../../../../lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  try {
    const series = await tursoQueryOne(
      "SELECT id FROM series WHERE slug = ? OR id = ?",
      [slug, slug]
    );

    if (!series) {
      return NextResponse.json({ message: "Series not found" }, { status: 404 });
    }

    const seriesId = series.id;

    const rows = await tursoQuery(
      `SELECT r.*, u.name as userName, u.avatar as userAvatar 
       FROM reviews r 
       JOIN users u ON r.userId = u.id 
       WHERE r.seriesId = ? 
       ORDER BY r.createdAt DESC`,
      [seriesId]
    );

    const totalReviews = rows.length;
    let sumRating = 0;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    rows.forEach((r: any) => {
      const rat = Math.min(5, Math.max(1, Number(r.rating || 5)));
      distribution[rat] = (distribution[rat] || 0) + 1;
      sumRating += rat;
    });

    const averageRating = totalReviews > 0 ? sumRating / totalReviews : 5.0;

    return NextResponse.json({
      totalReviews,
      averageRating,
      ratingDistribution: distribution,
      reviews: rows.map((r: any) => ({
        ...r,
        rating: Number(r.rating || 5),
        upvotes: Number(r.upvotes || 0),
        userName: r.userName || "User",
        userAvatar: r.userAvatar || ""
      }))
    });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await verifyAuth(req);
  if (!auth.user) {
    return NextResponse.json({ message: auth.error || "Authentication required to submit review" }, { status: 401 });
  }

  try {
    const series = await tursoQueryOne(
      "SELECT id FROM series WHERE slug = ? OR id = ?",
      [slug, slug]
    );

    if (!series) {
      return NextResponse.json({ message: "Series not found" }, { status: 404 });
    }

    const body = await req.json();
    const d = z.object({
      rating: z.number().min(1).max(5),
      comment: z.string().min(2)
    }).parse(body);

    const reviewId = `rev_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    await tursoExecute(
      "INSERT INTO reviews (id, seriesId, userId, rating, comment, upvotes, createdAt) VALUES (?, ?, ?, ?, ?, 0, ?)",
      [reviewId, series.id, auth.user.id, d.rating, d.comment.trim(), now]
    );

    const created = await tursoQueryOne(
      "SELECT r.*, u.name as userName, u.avatar as userAvatar FROM reviews r JOIN users u ON r.userId = u.id WHERE r.id = ?",
      [reviewId]
    );

    return NextResponse.json({
      success: true,
      message: "Your review has been posted!",
      review: created
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Failed to submit review" }, { status: 400 });
  }
}
