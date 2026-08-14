import { NextResponse } from "next/server";
import { verifyAuth } from "../../../../../lib/auth";
import { tursoQueryOne, tursoExecute } from "../../../../../lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: commentId } = await params;
  const auth = await verifyAuth(req);

  if (!auth.user) {
    return NextResponse.json({ message: "Authentication required to like comments" }, { status: 401 });
  }

  const userId = auth.user.id;
  const existingLike = await tursoQueryOne("SELECT * FROM comment_likes WHERE commentId = ? AND userId = ?", [commentId, userId]);

  if (existingLike) {
    // Unlike
    await tursoExecute("DELETE FROM comment_likes WHERE commentId = ? AND userId = ?", [commentId, userId]);
    await tursoExecute("UPDATE episode_comments SET likesCount = MAX(0, likesCount - 1) WHERE id = ?", [commentId]);
    return NextResponse.json({ liked: false });
  } else {
    // Like
    const likeId = crypto.randomUUID();
    const now = new Date().toISOString();
    await tursoExecute("INSERT INTO comment_likes (id, commentId, userId, createdAt) VALUES (?, ?, ?, ?)", [likeId, commentId, userId, now]);
    await tursoExecute("UPDATE episode_comments SET likesCount = likesCount + 1 WHERE id = ?", [commentId]);
    return NextResponse.json({ liked: true });
  }
}
