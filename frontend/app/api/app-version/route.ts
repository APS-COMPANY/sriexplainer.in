import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    versionCode: 21,
    versionName: "1.2.4",
    downloadUrl: "https://github.com/APS-COMPANY/sriexplainer.in/releases/download/v1.2.4/SriExplainer.apk",
    fallbackUrl: "https://sriexplainer.in/sriexplainer.apk",
    changeLog: "• Live Google AdMob monetization active worldwide\n• Optimized banner & video interstitial ad delivery\n• Video player streaming & stability enhancements",
    forceUpdate: false
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120"
    }
  });
}
