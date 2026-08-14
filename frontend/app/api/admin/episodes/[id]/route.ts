import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "../../../../../lib/auth";
import { tursoExecute, tursoQueryOne } from "../../../../../lib/db";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await verifyAuth(_req);
  if (!auth.isAdmin) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  await tursoExecute("DELETE FROM episodes WHERE id = ?", [id]);
  return NextResponse.json({ success: true, message: "Episode deleted successfully" });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await verifyAuth(req);
  if (!auth.isAdmin) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const d = z.object({
      number: z.number().optional(),
      title: z.string().optional(),
      rumbleEmbedUrl: z.string().optional(),
      duration: z.string().optional(),
      quality: z.string().optional(),
      visibility: z.string().optional(),
      access: z.string().optional(),
      xpCost: z.number().optional(),
      thumbnail: z.string().optional(),
      scheduledReleaseAt: z.string().nullable().optional()
    }).parse(body);

    const existing = await tursoQueryOne("SELECT * FROM episodes WHERE id = ?", [id]);
    if (!existing) {
      return NextResponse.json({ message: "Episode not found" }, { status: 404 });
    }

    const number = d.number !== undefined ? d.number : existing.number;
    const title = d.title !== undefined ? d.title.trim() : existing.title;
    const rumbleEmbedUrl = d.rumbleEmbedUrl !== undefined ? d.rumbleEmbedUrl.trim() : existing.rumbleEmbedUrl;
    const duration = d.duration !== undefined ? d.duration : (existing.duration || "");
    const quality = d.quality !== undefined ? d.quality : (existing.quality || "1080P");
    const visibility = d.visibility !== undefined ? d.visibility : (existing.visibility || "public");
    const rawAccess = d.access !== undefined ? d.access.toLowerCase().trim() : (existing.access || "free");
    const access = (rawAccess === "premium" || rawAccess === "subscription" || rawAccess === "xp_coins") ? "xp_coins" : "free";
    const xpCost = access === "xp_coins" ? (d.xpCost !== undefined ? Math.max(1, d.xpCost) : Math.max(1, Number(existing.xpCost || 5))) : 0;
    const thumbnail = d.thumbnail !== undefined ? d.thumbnail : (existing.thumbnail || "");
    const scheduledReleaseAt = d.scheduledReleaseAt !== undefined
      ? (d.scheduledReleaseAt ? new Date(d.scheduledReleaseAt).toISOString() : null)
      : (existing.scheduledReleaseAt || null);
    const upcomingDisplayMessage = body.upcomingDisplayMessage !== undefined ? body.upcomingDisplayMessage : (existing.upcomingDisplayMessage || "");

    await tursoExecute(`
      UPDATE episodes
      SET number = ?, title = ?, rumbleEmbedUrl = ?, duration = ?, quality = ?, visibility = ?, access = ?, xpCost = ?, thumbnail = ?, scheduledReleaseAt = ?, upcomingDisplayMessage = ?
      WHERE id = ?
    `, [number, title, rumbleEmbedUrl, duration, quality, visibility, access, xpCost, thumbnail, scheduledReleaseAt, upcomingDisplayMessage, id]);

    const updated = await tursoQueryOne("SELECT * FROM episodes WHERE id = ?", [id]);
    return NextResponse.json({ ...updated, _id: id, access, xpCost });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Could not update episode" }, { status: 400 });
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return PATCH(req, ctx);
}
