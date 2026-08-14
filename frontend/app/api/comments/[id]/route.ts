import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "../../../../lib/auth";
import { tursoQueryOne, tursoExecute } from "../../../../lib/db";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: commentId } = await params;
  const auth = await verifyAuth(req);

  const comment = await tursoQueryOne("SELECT * FROM episode_comments WHERE id = ?", [commentId]);
  if (!comment) {
    return NextResponse.json({ message: "Comment not found" }, { status: 404 });
  }

  // Only comment owner or Admin can delete comment
  if (!auth.isAdmin && comment.userId !== auth.user?.id) {
    return NextResponse.json({ message: "Access Denied" }, { status: 403 });
  }

  await tursoExecute("DELETE FROM episode_comments WHERE id = ? OR parentId = ?", [commentId, commentId]);
  await tursoExecute("DELETE FROM comment_likes WHERE commentId = ?", [commentId]);

  return NextResponse.json({ success: true, message: "Comment deleted" });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: commentId } = await params;
  const auth = await verifyAuth(req);

  try {
    const body = await req.json();
    const { content } = z.object({ content: z.string().min(1) }).parse(body);

    const comment = await tursoQueryOne("SELECT * FROM episode_comments WHERE id = ?", [commentId]);
    if (!comment) {
      return NextResponse.json({ message: "Comment not found" }, { status: 404 });
    }

    if (!auth.isAdmin && comment.userId !== auth.user?.id) {
      return NextResponse.json({ message: "Access Denied" }, { status: 403 });
    }

    const now = new Date().toISOString();
    await tursoExecute("UPDATE episode_comments SET content = ?, isEdited = 1, updatedAt = ? WHERE id = ?", [content.trim(), now, commentId]);

    const updated = await tursoQueryOne("SELECT * FROM episode_comments WHERE id = ?", [commentId]);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Could not update comment" }, { status: 400 });
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return PATCH(req, ctx);
}
