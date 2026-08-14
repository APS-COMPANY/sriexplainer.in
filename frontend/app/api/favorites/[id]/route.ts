import { NextResponse } from "next/server";
import { verifyAuth } from "../../../../lib/auth";
import { tursoQueryOne, tursoExecute } from "../../../../lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth(req);
  if (!auth.user) {
    return NextResponse.json({ message: auth.error || "Authentication required" }, { status: 401 });
  }

  const { id: seriesId } = await params;
  if (!seriesId) {
    return NextResponse.json({ message: "Series ID is required" }, { status: 400 });
  }

  try {
    const existing = await tursoQueryOne(
      "SELECT * FROM favorites WHERE userId = ? AND seriesId = ?",
      [auth.user.id, seriesId]
    );

    if (existing) {
      await tursoExecute("DELETE FROM favorites WHERE id = ?", [existing.id]);
      return NextResponse.json({ favorited: false, favorite: false, message: "Removed from favorites" });
    }

    const favId = crypto.randomUUID();
    await tursoExecute(
      "INSERT INTO favorites (id, userId, seriesId, createdAt) VALUES (?, ?, ?, ?)",
      [favId, auth.user.id, seriesId, new Date().toISOString()]
    );
    return NextResponse.json({ favorited: true, favorite: true, message: "Added to favorites" });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Favorite operation failed" }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth(req);
  if (!auth.user) {
    return NextResponse.json({ message: auth.error || "Authentication required" }, { status: 401 });
  }

  const { id: seriesId } = await params;
  try {
    await tursoExecute(
      "DELETE FROM favorites WHERE userId = ? AND seriesId = ?",
      [auth.user.id, seriesId]
    );
    return NextResponse.json({ favorited: false, favorite: false, message: "Removed from favorites" });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Failed to remove favorite" }, { status: 400 });
  }
}
