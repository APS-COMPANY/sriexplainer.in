import { NextResponse } from "next/server";
import { verifyAuth } from "../../../../../lib/auth";
import { tursoExecute } from "../../../../../lib/db";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await verifyAuth(_req);
  if (!auth.isAdmin) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  await tursoExecute("DELETE FROM site_announcements WHERE id = ?", [id]);
  return NextResponse.json({ success: true, message: "Announcement deleted" });
}
