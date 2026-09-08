import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    versionCode: 22,
    versionName: "1.2.5",
    downloadUrl: "https://github.com/APS-COMPANY/sriexplainer.in/releases/download/v1.2.5/SriExplainer.apk",
    fallbackUrl: "https://sriexplainer.in/sriexplainer.apk",
    changeLog: "• Clean auto-hiding banner space (no black bar when empty)\n• Live Google AdMob monetization active worldwide\n• Video player streaming & stability enhancements",
    forceUpdate: false
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120"
    }
  });
}
