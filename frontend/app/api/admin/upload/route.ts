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
      return NextResponse.json({ message: "A media file (image) is required" }, { status: 400 });
    }

    // Maximum 10MB limit
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ message: "File size exceeds 10MB limit" }, { status: 400 });
    }

    // Whitelist allowed image MIME types
    const ALLOWED_MIMES: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/svg+xml": "svg"
    };

    const mimeType = (file.type || "").toLowerCase().trim();
    const ext = ALLOWED_MIMES[mimeType];
    if (!ext) {
      return NextResponse.json({ message: "Only image files (JPG, PNG, WebP, GIF, SVG) are allowed" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");
    const filename = `${crypto.randomUUID()}.${ext}`;
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
