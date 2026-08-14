import { NextResponse } from "next/server";
import { tursoQuery } from "../../../lib/db";

export async function GET() {
  const rows = await tursoQuery("SELECT key, value FROM site_settings");
  const settings: Record<string, string> = {
    site_title: "SRI EXPLAINER",
    site_logo: "",
    siteLogo: "",
    site_background: "",
    siteBackground: "",
    whatsapp_url: "https://whatsapp.com",
    whatsappUrl: "https://whatsapp.com",
    telegram_url: "",
    telegramUrl: "",
    support_telegram: "",
    supportTelegram: ""
  };

  rows.forEach((r: any) => {
    settings[r.key] = r.value;
  });

  const telegramVal = settings.supportTelegram || settings.support_telegram || settings.telegramUrl || settings.telegram_url || "";

  return NextResponse.json({
    ...settings,
    siteLogo: settings.siteLogo || settings.site_logo || "",
    siteBackground: settings.siteBackground || settings.site_background || "",
    whatsappUrl: settings.whatsappUrl || settings.whatsapp_url || "",
    telegramUrl: telegramVal,
    supportTelegram: telegramVal,
    aboutUs: settings.aboutUs || settings.about_us || "About Us content coming soon."
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30"
    }
  });
}
