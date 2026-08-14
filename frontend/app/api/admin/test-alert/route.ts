import { NextResponse } from "next/server";
import { verifyAuth } from "../../../../lib/auth";
import { sendTelegramMonitoringAlert } from "../../../../lib/monitoring";

export async function POST(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin && auth.user?.role !== "co_admin") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const res = await sendTelegramMonitoringAlert(
      "🧪 Test Alert Received!",
      "This is a test notification from your **Sri Explainer Custom Monitoring System**. Your monitoring and alert setup is working perfectly!"
    );

    if (!res.success) {
      return NextResponse.json({ message: res.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "✓ Test alert sent successfully to your Telegram!"
    });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Failed to trigger test alert" }, { status: 500 });
  }
}
