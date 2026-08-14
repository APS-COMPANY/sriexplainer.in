import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "../../../../lib/auth";
import { tursoQueryOne, tursoExecute } from "../../../../lib/db";

export async function POST(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.user) {
    return NextResponse.json({ message: auth.error || "Authentication required" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const d = z.object({
      episodeId: z.string(),
      currentPosition: z.number().optional().default(0),
      duration: z.number().optional().default(0),
      progress: z.number().optional().default(0)
    }).parse(body);

    const now = new Date().toISOString();
    const existing = await tursoQueryOne(
      "SELECT * FROM watch_history WHERE userId = ? AND episodeId = ?",
      [auth.user.id, d.episodeId]
    );

    let percentage = d.progress;
    if (d.duration > 0 && d.currentPosition > 0) {
      percentage = Math.min(100, Math.round((d.currentPosition / d.duration) * 100));
    }
    const isCompleted = percentage >= 90 ? 1 : 0;

    if (existing) {
      await tursoExecute(`
        UPDATE watch_history
        SET currentPosition = ?, duration = ?, percentage = ?, progress = ?, completed = ?, updatedAt = ?
        WHERE id = ?
      `, [d.currentPosition, d.duration, percentage, percentage, isCompleted, now, existing.id]);
    } else {
      await tursoExecute(`
        INSERT INTO watch_history (id, userId, episodeId, currentPosition, duration, percentage, progress, completed, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [crypto.randomUUID(), auth.user.id, d.episodeId, d.currentPosition, d.duration, percentage, percentage, isCompleted, now]);
    }

    return NextResponse.json({ success: true, percentage, completed: Boolean(isCompleted) });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Progress sync failed" }, { status: 400 });
  }
}
