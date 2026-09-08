import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    versionCode: 20,
    versionName: "1.2.3",
    downloadUrl: "https://github.com/APS-COMPANY/sriexplainer.in/releases/download/v1.2.3/SriExplainer.apk",
    fallbackUrl: "https://sriexplainer.in/sriexplainer.apk",
    changeLog: "• Instant AdMob rendering with smart fallbacks\n• Added test device optimizations\n• Video player streaming & stability enhancements",
    forceUpdate: false
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120"
    }
  });
}
