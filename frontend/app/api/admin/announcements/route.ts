import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "../../../../lib/auth";
import { tursoQuery, tursoQueryOne, tursoExecute } from "../../../../lib/db";

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const rows = await tursoQuery("SELECT * FROM site_announcements ORDER BY createdAt DESC");
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const d = z.object({
      message: z.string().min(1),
      link: z.string().optional().default(""),
      bgColor: z.string().optional().default("brand"),
      isActive: z.boolean().optional().default(true)
    }).parse(body);

    // Deactivate previous active announcements
    if (d.isActive) {
      await tursoExecute("UPDATE site_announcements SET isActive = 0");
    }

    const annId = crypto.randomUUID();
    const now = new Date().toISOString();

    await tursoExecute(
      "INSERT INTO site_announcements (id, message, link, bgColor, isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
      [annId, d.message.trim(), d.link.trim(), d.bgColor, d.isActive ? 1 : 0, now]
    );

    const created = await tursoQueryOne("SELECT * FROM site_announcements WHERE id = ?", [annId]);
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Broadcast failed" }, { status: 400 });
  }
}
