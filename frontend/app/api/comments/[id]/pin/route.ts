import { NextResponse } from "next/server";
import { verifyAuth } from "../../../../../lib/auth";
import { tursoQueryOne, tursoExecute } from "../../../../../lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: commentId } = await params;
  const auth = await verifyAuth(req);

  if (!auth.isAdmin) {
    return NextResponse.json({ message: "Access Denied: Admin privileges required to pin comments" }, { status: 403 });
  }

  const comment = await tursoQueryOne("SELECT * FROM episode_comments WHERE id = ?", [commentId]);
  if (!comment) {
    return NextResponse.json({ message: "Comment not found" }, { status: 404 });
  }

  const newPinState = comment.isPinned ? 0 : 1;
  await tursoExecute("UPDATE episode_comments SET isPinned = ? WHERE id = ?", [newPinState, commentId]);

  return NextResponse.json({ success: true, isPinned: Boolean(newPinState) });
}
