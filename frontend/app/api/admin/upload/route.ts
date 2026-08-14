import { NextResponse } from "next/server";
import { verifyAuth } from "../../../../lib/auth";
import { tursoExecute } from "../../../../lib/db";

export async function POST(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("image") as File || formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ message: "A media file (image or video) is required" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");
    const ext = file.name ? file.name.split(".").pop() || "png" : "png";
    const filename = `${crypto.randomUUID()}.${ext}`;
    const mimeType = file.type || "image/png";
    const now = new Date().toISOString();

    await tursoExecute(
      "INSERT INTO media_storage (id, filename, mimeType, data, createdAt) VALUES (?, ?, ?, ?, ?)",
      [filename, filename, mimeType, base64Data, now]
    );

    return NextResponse.json({
      filename,
      url: `/api/uploads/${filename}`,
      path: `/api/uploads/${filename}`
    });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Media upload failed" }, { status: 500 });
  }
}
