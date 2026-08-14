import { NextResponse } from "next/server";
import { tursoQueryOne } from "../../../lib/db";

export async function GET() {
  const startTime = Date.now();
  try {
    // 1. Perform database latency ping
    await tursoQueryOne("SELECT 1 as ping", []);
    const latencyMs = Date.now() - startTime;

    // 2. Fetch today's errors count
    const todayISO = new Date().toISOString().slice(0, 10);
    const errorCountRow = await tursoQueryOne(
      "SELECT COUNT(*) as cnt FROM app_errors WHERE createdAt LIKE ?",
      [`${todayISO}%`]
    );

    const errorsToday = Number(errorCountRow?.cnt || 0);

    return NextResponse.json({
      status: "HEALTHY",
      database: "CONNECTED",
      latencyMs,
      errorsToday,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return NextResponse.json(
      {
        status: "UNHEALTHY",
        database: "DISCONNECTED",
        error: err?.message || "Database ping failure",
        latencyMs,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
