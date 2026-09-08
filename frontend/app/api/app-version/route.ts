import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    versionCode: 19,
    versionName: "1.2.2",
    downloadUrl: "https://github.com/APS-COMPANY/sriexplainer.in/releases/download/v1.2.2/SriExplainer.apk",
    fallbackUrl: "https://sriexplainer.in/sriexplainer.apk",
    changeLog: "• Integrated Google AdMob monetization\n• Added Home Banner Ads\n• Added Episode Interstitial Video Ads\n• Video player streaming & stability enhancements",
    forceUpdate: false
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120"
    }
  });
}
