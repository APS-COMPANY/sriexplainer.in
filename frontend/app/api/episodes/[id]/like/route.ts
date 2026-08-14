import { NextResponse } from "next/server";
import { verifyAuth } from "../../../../../lib/auth";
import { tursoQueryOne, tursoExecute } from "../../../../../lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: episodeId } = await params;
    const auth = await verifyAuth(req);
    
    if (!auth.user) {
      return NextResponse.json(
        { message: "Authentication required to like episodes" },
        { status: 401 }
      );
    }

    const userId = auth.user.id;

    // Ensure episode exists
    const ep = await tursoQueryOne("SELECT id FROM episodes WHERE id = ?", [episodeId]);
    if (!ep) {
      return NextResponse.json({ message: "Episode not found" }, { status: 404 });
    }

    const existingLike = await tursoQueryOne(
      "SELECT episodeId FROM episode_likes WHERE episodeId = ? AND userId = ?",
      [episodeId, userId]
    );

    let liked = false;
    if (existingLike) {
      // Toggle OFF: Remove existing like
      await tursoExecute(
        "DELETE FROM episode_likes WHERE episodeId = ? AND userId = ?",
        [episodeId, userId]
      );
      liked = false;
    } else {
      // Toggle ON: Create new like
      const likeId = `like_${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      try {
        await tursoExecute(
          "INSERT OR IGNORE INTO episode_likes (id, episodeId, userId, createdAt) VALUES (?, ?, ?, ?)",
          [likeId, episodeId, userId, now]
        );
      } catch {
        await tursoExecute(
          "INSERT OR IGNORE INTO episode_likes (episodeId, userId, createdAt) VALUES (?, ?, ?)",
          [episodeId, userId, now]
        );
      }
      liked = true;
    }

    // Recalculate exact active unique likes count from database
    const countRow = await tursoQueryOne(
      "SELECT COUNT(*) as cnt FROM episode_likes WHERE episodeId = ?",
      [episodeId]
    );
    const likesCount = Number(countRow?.cnt || 0);

    // Synchronize likesCount on episodes table
    await tursoExecute(
      "UPDATE episodes SET likesCount = ? WHERE id = ?",
      [likesCount, episodeId]
    );

    return NextResponse.json({ liked, likesCount });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to toggle episode like" },
      { status: 500 }
    );
  }
}
