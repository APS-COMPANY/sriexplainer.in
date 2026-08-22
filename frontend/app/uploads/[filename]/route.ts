import { NextResponse } from "next/server";
import { tursoQueryOne } from "../../../lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const cleanFilename = decodeURIComponent(filename || "").trim().split("?")[0];

    if (!cleanFilename) {
      return new NextResponse("Filename is required", { status: 400 });
    }

    const row: any = await tursoQueryOne(
      "SELECT filename, mimeType, data FROM media_storage WHERE filename = ? OR id = ? LIMIT 1",
      [cleanFilename, cleanFilename]
    );

    if (row && row.data) {
      const buffer = Buffer.from(row.data, "base64");
      const mimeType = row.mimeType || "image/jpeg";

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Length": String(buffer.length),
          "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
          "Access-Control-Allow-Origin": "*",
          "Cross-Origin-Resource-Policy": "cross-origin"
        }
      });
    }

    return new NextResponse("Image not found", { status: 404 });
  } catch (err: any) {
    console.error("[Media Serve Error]:", err?.message);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
