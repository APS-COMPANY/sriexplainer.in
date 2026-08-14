import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "../../../lib/auth";
import { tursoQuery, tursoQueryOne, tursoExecute } from "../../../lib/db";

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.user) return NextResponse.json([], { status: 200 });

  const rows = await tursoQuery(
    "SELECT f.id as favId, s.* FROM favorites f JOIN series s ON f.seriesId = s.id WHERE f.userId = ? ORDER BY f.createdAt DESC",
    [auth.user.id]
  );
  return NextResponse.json(rows);
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
      "SELECT * FROM favorites WHERE userId = ? AND seriesId = ?",
      [auth.user.id, d.seriesId]
    );

    if (existing) {
      await tursoExecute("DELETE FROM favorites WHERE id = ?", [existing.id]);
      return NextResponse.json({ favorited: false, favorite: false, message: "Removed from favorites" });
    }

    const favId = crypto.randomUUID();
    await tursoExecute(
      "INSERT INTO favorites (id, userId, seriesId, createdAt) VALUES (?, ?, ?, ?)",
      [favId, auth.user.id, d.seriesId, new Date().toISOString()]
    );
    return NextResponse.json({ favorited: true, favorite: true, message: "Added to favorites" });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Favorite operation failed" }, { status: 400 });
  }
}
