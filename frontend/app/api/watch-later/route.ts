import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "../../../lib/auth";
import { tursoQuery, tursoQueryOne, tursoExecute } from "../../../lib/db";

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.user) return NextResponse.json([], { status: 200 });

  const rows = await tursoQuery(
    "SELECT w.id as watchLaterId, s.* FROM watch_later w JOIN series s ON w.seriesId = s.id WHERE w.userId = ? ORDER BY w.createdAt DESC",
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
