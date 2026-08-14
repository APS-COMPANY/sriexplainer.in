import { NextResponse } from "next/server";
import { verifyAuth } from "../../../../../lib/auth";
import { tursoQueryOne, tursoExecute } from "../../../../../lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: episodeId } = await params;
    const auth = await verifyAuth(req);
    const userId = auth.user?.id || "";

    const body = await req.json().catch(() => ({}));
    const sessionId = (body.sessionId || req.headers.get("x-session-id") || "").trim();

    if (!sessionId) {
      return NextResponse.json({ message: "Session ID required to record view event" }, { status: 400 });
    }

    // Ensure episode exists
    const ep = await tursoQueryOne("SELECT id, seriesId, views FROM episodes WHERE id = ?", [episodeId]);
    if (!ep) {
      return NextResponse.json({ message: "Episode not found" }, { status: 404 });
    }

    // Check if view event already recorded for this playback session
    const existingEvent = await tursoQueryOne(
      "SELECT episodeId FROM episode_view_events WHERE episodeId = ? AND sessionId = ?",
      [episodeId, sessionId]
    );

    if (existingEvent) {
      return NextResponse.json({
        recorded: false,
        views: Number(ep.views || 0),
        message: "View already recorded for this playback session"
      });
    }

    // Record view event idempotently
    const eventId = `ve_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    try {
      await tursoExecute(
        "INSERT OR IGNORE INTO episode_view_events (id, episodeId, userId, sessionId, createdAt) VALUES (?, ?, ?, ?, ?)",
        [eventId, episodeId, userId, sessionId, now]
      );
    } catch {
      await tursoExecute(
        "INSERT OR IGNORE INTO episode_view_events (episodeId, userId, sessionId, createdAt) VALUES (?, ?, ?, ?)",
        [episodeId, userId, sessionId, now]
      );
    }

    // Increment episode views
    await tursoExecute(
      "UPDATE episodes SET views = COALESCE(views, 0) + 1 WHERE id = ?",
      [episodeId]
    );

    // Increment series total views
    if (ep.seriesId) {
      await tursoExecute(
        "UPDATE series SET views = COALESCE(views, 0) + 1 WHERE id = ?",
        [ep.seriesId]
      );
    }

    const updatedEp = await tursoQueryOne("SELECT views FROM episodes WHERE id = ?", [episodeId]);
    const updatedViews = Number(updatedEp?.views || 0);

    return NextResponse.json({ recorded: true, views: updatedViews });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to record episode view event" },
      { status: 500 }
    );
  }
}
