import { NextResponse } from "next/server";
import { tursoQueryOne } from "../../../../lib/db";

export async function GET() {
  try {
    const active = await tursoQueryOne(
      "SELECT * FROM site_announcements WHERE isActive = 1 ORDER BY createdAt DESC LIMIT 1"
    );
    return NextResponse.json(active || null);
  } catch (err: any) {
    return NextResponse.json(null);
  }
}
