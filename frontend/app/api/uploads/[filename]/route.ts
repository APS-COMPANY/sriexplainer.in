import { NextResponse } from "next/server";
import { tursoQueryOne } from "../../../../lib/db";

let sharpModule: any = null;
try {
  sharpModule = require("sharp");
} catch {}

export const runtime = "nodejs";

// In-memory LRU cache for optimized image buffers
const MAX_CACHE_ENTRIES = 250;
const imageCache = new Map<string, { buffer: Buffer; mimeType: string; etag: string }>();

function getFromCache(key: string) {
  const item = imageCache.get(key);
  if (item) {
    // Refresh position in map (LRU behavior)
    imageCache.delete(key);
    imageCache.set(key, item);
    return item;
  }
  return null;
}

function setToCache(key: string, data: { buffer: Buffer; mimeType: string; etag: string }) {
  if (imageCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = imageCache.keys().next().value;
    if (oldestKey) imageCache.delete(oldestKey);
  }
  imageCache.set(key, data);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const cleanFilename = decodeURIComponent(filename || "").trim().split("?")[0];

    if (!cleanFilename) {
      return new NextResponse("Filename is required", { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const rawParam = searchParams.get("raw");
    const widthParam = searchParams.get("w");
    const qualityParam = searchParams.get("q");

    const isRawRequested = rawParam === "1" || rawParam === "true";
    const requestedWidth = widthParam
      ? Math.min(Math.max(parseInt(widthParam, 10) || 0, 50), 1920)
      : (isRawRequested ? null : 400);
    const requestedQuality = qualityParam ? Math.min(Math.max(parseInt(qualityParam, 10) || 75, 40), 95) : 75;

    const acceptHeader = req.headers.get("accept") || "";
    const supportsWebp = acceptHeader.includes("image/webp");

    const cacheKey = `${cleanFilename}_w${requestedWidth || "orig"}_q${requestedQuality}_fmt${supportsWebp ? "webp" : "orig"}_raw${isRawRequested ? 1 : 0}`;

    // 1. Check in-memory cache
    const cached = getFromCache(cacheKey);
    if (cached) {
      const ifNoneMatch = req.headers.get("if-none-match");
      if (ifNoneMatch && ifNoneMatch === cached.etag) {
        return new NextResponse(null, { status: 304 });
      }

      return new NextResponse(new Uint8Array(cached.buffer), {
        status: 200,
        headers: {
          "Content-Type": cached.mimeType,
          "Content-Length": String(cached.buffer.length),
          "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
          "ETag": cached.etag,
          "Vary": "Accept, Accept-Encoding",
          "Access-Control-Allow-Origin": "*",
          "Cross-Origin-Resource-Policy": "cross-origin",
          "X-Image-Cache": "HIT"
        }
      });
    }

    // 2. Query original image data from database
    const row: any = await tursoQueryOne(
      "SELECT filename, mimeType, data FROM media_storage WHERE filename = ? OR id = ? LIMIT 1",
      [cleanFilename, cleanFilename]
    );

    if (!row || !row.data) {
      return new NextResponse("Image not found", { status: 404 });
    }

    const originalBuffer = Buffer.from(row.data, "base64");
    const originalMime = (row.mimeType || "image/jpeg").toLowerCase().trim();

    // Do not process SVGs or animated GIFs
    if (originalMime === "image/svg+xml" || originalMime === "image/gif" || isRawRequested) {
      const etag = `"${cleanFilename}-${originalBuffer.length}"`;
      const ifNoneMatch = req.headers.get("if-none-match");
      if (ifNoneMatch && ifNoneMatch === etag) {
        return new NextResponse(null, { status: 304 });
      }

      return new NextResponse(new Uint8Array(originalBuffer), {
        status: 200,
        headers: {
          "Content-Type": originalMime,
          "Content-Length": String(originalBuffer.length),
          "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
          "ETag": etag,
          "Access-Control-Allow-Origin": "*",
          "Cross-Origin-Resource-Policy": "cross-origin"
        }
      });
    }

    // 3. Process with sharp: Resize & WebP compression
    let processedBuffer = originalBuffer;
    let finalMime = originalMime;

    if (sharpModule) {
      try {
        let pipeline = sharpModule(originalBuffer);

        // Resize if requested or if original is excessively large for web display
        if (requestedWidth) {
          pipeline = pipeline.resize({
            width: requestedWidth,
            withoutEnlargement: true,
            fit: "inside"
          });
        }

        // Convert to WebP by default when supported or always for massive PNGs
        if (supportsWebp || originalMime === "image/png" || originalMime === "image/jpeg") {
          pipeline = pipeline.webp({
            quality: requestedQuality,
            effort: 6
          });
          finalMime = "image/webp";
        }

        processedBuffer = await pipeline.toBuffer();
      } catch (sharpErr: any) {
        console.warn("[Media Optimize Fallback]:", sharpErr?.message);
        processedBuffer = originalBuffer;
        finalMime = originalMime;
      }
    }

    const etag = `"${cleanFilename}-${processedBuffer.length}-${finalMime.replace(/[^a-z0-9]/gi, "")}"`;

    // Cache the processed result
    setToCache(cacheKey, {
      buffer: processedBuffer,
      mimeType: finalMime,
      etag
    });

    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304 });
    }

    return new NextResponse(new Uint8Array(processedBuffer), {
      status: 200,
      headers: {
        "Content-Type": finalMime,
        "Content-Length": String(processedBuffer.length),
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
        "ETag": etag,
        "Vary": "Accept, Accept-Encoding",
        "Access-Control-Allow-Origin": "*",
        "Cross-Origin-Resource-Policy": "cross-origin",
        "X-Image-Cache": "MISS"
      }
    });
  } catch (err: any) {
    console.error("[Media Serve Error]:", err?.message);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
