import { NextResponse } from "next/server";
import { tursoQueryOne, tursoExecute } from "../../../../lib/db";
import { verifyAuth } from "../../../../lib/auth";

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const row = await tursoQueryOne("SELECT value FROM contest_settings WHERE key = 'isActive'");
  const contestActive = row ? row.value === "1" : true;

  return NextResponse.json({ contestActive });
}

export async function POST(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const active = body.contestActive ? "1" : "0";

    await tursoExecute(
      "INSERT INTO contest_settings (key, value) VALUES ('isActive', ?) ON CONFLICT(key) DO UPDATE SET value = ?",
      [active, active]
    );

    return NextResponse.json({
      success: true,
      contestActive: active === "1",
      message: `Contest has been ${active === "1" ? "activated" : "closed"}.`
    });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Could not update contest status" }, { status: 500 });
  }
}
