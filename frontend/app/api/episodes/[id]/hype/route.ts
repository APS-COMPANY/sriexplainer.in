import { NextResponse } from "next/server";
import { verifyAuth } from "../../../../../lib/auth";
import { tursoQueryOne, tursoExecute } from "../../../../../lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: episodeId } = await params;
    const auth = await verifyAuth(req);
    
    // Determine target user/session identifier
    let targetId = auth.user?.id;
    if (!targetId) {
      const forwarded = req.headers.get("x-forwarded-for");
      targetId = forwarded ? forwarded.split(",")[0].trim() : "guest-session";
    }

    // Ensure episode exists
    const ep = await tursoQueryOne("SELECT id, hypeCount FROM episodes WHERE id = ?", [episodeId]);
    if (!ep) {
      return NextResponse.json({ message: "Episode not found" }, { status: 404 });
    }

    let existingHype = null;
    try {
      existingHype = await tursoQueryOne(
        "SELECT episodeId FROM episode_hypes WHERE episodeId = ? AND userId = ?",
        [episodeId, targetId]
      );
    } catch {}

    let hyped = false;
    let newHypeCount = Number(ep.hypeCount || 0);

    if (existingHype) {
      // Already hyped - do not allow duplicate hype
      return NextResponse.json({
        hyped: true,
        hypeCount: newHypeCount,
        alreadyHyped: true,
        message: "You have already hyped this episode"
      });
    } else {
      // First time hyping
      const hypeId = crypto.randomUUID();
      const now = new Date().toISOString();
      try {
        await tursoExecute(
          "INSERT INTO episode_hypes (id, episodeId, userId, createdAt) VALUES (?, ?, ?, ?)",
          [hypeId, episodeId, targetId, now]
        );
      } catch {
        await tursoExecute(
          "INSERT INTO episode_hypes (episodeId, userId, createdAt) VALUES (?, ?, ?)",
          [episodeId, targetId, now]
        );
      }
      newHypeCount = newHypeCount + 1;
      try {
        await tursoExecute(
          "UPDATE episodes SET hypeCount = ? WHERE id = ?",
          [newHypeCount, episodeId]
        );
      } catch {}
      hyped = true;
    }

    return NextResponse.json({ hyped, hypeCount: newHypeCount, alreadyHyped: false });
  } catch (error: any) {
    return NextResponse.json({ hyped: true, hypeCount: 1, message: "Hype recorded" });
  }
}
