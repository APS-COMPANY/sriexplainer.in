import { NextResponse } from "next/server";

export async function GET() {
  const content = `pubads-site-verification=2jUtIhorJ81IS3SH\ngoogle.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n`;
  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
