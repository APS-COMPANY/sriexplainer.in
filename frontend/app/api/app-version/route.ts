import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    versionCode: 18,
    versionName: "1.2.1",
    downloadUrl: "https://github.com/APS-COMPANY/sriexplainer.in/releases/download/v1.2.1/SriExplainer.apk",
    fallbackUrl: "https://sriexplainer.in/sriexplainer.apk",
    changeLog: "• In-App Automatic Updates enabled!\n• Added My Watchlist & Bookmarks\n• Added In-App Episode Comments & Discussions\n• Added Release Radar notification bell\n• Enhanced video player controls & auto-healing",
    forceUpdate: false
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120"
    }
  });
}
