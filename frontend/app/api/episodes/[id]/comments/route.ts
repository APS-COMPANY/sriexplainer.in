import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "../../../../../lib/auth";
import { tursoQuery, tursoQueryOne, tursoExecute } from "../../../../../lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: episodeId } = await params;
  const auth = await verifyAuth(req);
  const currentUserId = auth.user?.id || "";

  const { searchParams } = new URL(req.url);
  const sort = searchParams.get("sort") || "newest";

  let orderBy = "c.createdAt DESC";
  if (sort === "oldest") orderBy = "c.createdAt ASC";
  if (sort === "top") orderBy = "c.likesCount DESC, c.createdAt DESC";

  const sql = `
    SELECT c.*, u.name as userName, u.avatar as userAvatar, u.role as userRole
    FROM episode_comments c
    LEFT JOIN users u ON c.userId = u.id
    WHERE c.episodeId = ? AND c.isHidden = 0
    ORDER BY ${orderBy}
  `;

  const rows = await tursoQuery(sql, [episodeId]);

  let userLikes = new Set<string>();
  if (currentUserId) {
    const likes = await tursoQuery("SELECT commentId FROM comment_likes WHERE userId = ?", [currentUserId]);
    likes.forEach((l) => userLikes.add(l.commentId));
  }

  const commentMap = new Map<string, any>();
  const topComments: any[] = [];

  rows.forEach((r) => {
    const formatted = {
      id: r.id,
      episodeId: r.episodeId,
      userId: r.userId || "",
      parentId: r.parentId || null,
      content: r.content,
      likesCount: Number(r.likesCount || 0),
      isPinned: Boolean(r.isPinned),
      isHidden: Boolean(r.isHidden),
      isEdited: Boolean(r.isEdited),
      userLiked: userLikes.has(r.id),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      user: {
        id: r.userId || "",
        name: r.userName || r.guestName || "Guest User",
        avatar: r.userAvatar || "",
        role: r.userRole || "user"
      },
      replies: []
    };
    commentMap.set(r.id, formatted);
  });

  rows.forEach((r) => {
    const c = commentMap.get(r.id);
    if (r.parentId && commentMap.has(r.parentId)) {
      commentMap.get(r.parentId).replies.push(c);
    } else if (!r.parentId) {
      topComments.push(c);
    }
  });

  topComments.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

  return NextResponse.json(topComments);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: episodeId } = await params;
  const auth = await verifyAuth(req);

  try {
    const body = await req.json();
    const d = z.object({
      content: z.string().min(1, "Comment text is required"),
      parentId: z.string().optional().nullable(),
      guestName: z.string().optional().default("Guest User")
    }).parse(body);

    const commentId = crypto.randomUUID();
    const now = new Date().toISOString();
    const userId = auth.user?.id || "";
    const guestName = auth.user ? auth.user.name : (d.guestName.trim() || "Guest User");

    await tursoExecute(`
      INSERT INTO episode_comments (id, episodeId, userId, guestName, parentId, content, likesCount, isPinned, isHidden, isEdited, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?)
    `, [commentId, episodeId, userId, guestName, d.parentId || null, d.content.trim(), now, now]);

    const created = await tursoQueryOne("SELECT * FROM episode_comments WHERE id = ?", [commentId]);
    return NextResponse.json({
      ...created,
      id: commentId,
      user: {
        id: userId,
        name: guestName,
        avatar: auth.user?.avatar || "",
        role: auth.user?.role || "user"
      },
      replies: [],
      userLiked: false
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Could not post comment" }, { status: 400 });
  }
}
