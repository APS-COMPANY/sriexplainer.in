import { NextResponse } from "next/server";
import { verifyAuth } from "../../../../lib/auth";
import { tursoQuery } from "../../../../lib/db";

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin && auth.user?.role !== "co_admin") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "ALL";

    let query = "SELECT * FROM user_reports ORDER BY createdAt DESC LIMIT 100";
    let params: any[] = [];

    if (status !== "ALL") {
      query = "SELECT * FROM user_reports WHERE status = ? ORDER BY createdAt DESC LIMIT 100";
      params = [status];
    }

    const reports = await tursoQuery(query, params);

    return NextResponse.json({
      success: true,
      reports
    });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Failed to fetch reports" }, { status: 500 });
  }
}
