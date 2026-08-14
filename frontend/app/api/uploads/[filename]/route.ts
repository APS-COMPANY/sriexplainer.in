import { NextResponse } from "next/server";
import { tursoQueryOne } from "../../../../lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;

  try {
    const row = await tursoQueryOne(
      "SELECT filename, mimeType, data FROM media_storage WHERE filename = ? OR id = ?",
      [filename, filename]
    );

    if (row && row.data) {
      const buffer = Buffer.from(String(row.data), "base64");
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": row.mimeType || "image/png",
          "Cache-Control": "public, max-age=31536000, immutable"
        }
      });
    }
  } catch (err: any) {
    console.error("[Media Storage Fetch Error]:", err.message);
  }

  return NextResponse.json({ message: "Image not found" }, { status: 404 });
}
