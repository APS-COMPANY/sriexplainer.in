import { NextResponse } from "next/server";
import { verifyAuth } from "../../../../lib/auth";
import { tursoExecute, tursoQuery } from "../../../../lib/db";

function normalizeTelegramInput(val: string): string {
  const trimmed = val.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("@")) {
    return `@${trimmed.replace(/^@+/, "")}`;
  }
  return `@${trimmed}`;
}

async function saveSettings(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin && auth.user?.role !== "co_admin") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();

    const updates: [string, string][] = [];

    // Partial update check - ONLY update keys that are explicitly passed in the body!
    if (body.siteLogo !== undefined || body.site_logo !== undefined) {
      const val = String(body.siteLogo ?? body.site_logo).trim();
      updates.push(["site_logo", val], ["siteLogo", val]);
    }

    if (body.siteBackground !== undefined || body.site_background !== undefined) {
      const val = String(body.siteBackground ?? body.site_background).trim();
      updates.push(["site_background", val], ["siteBackground", val]);
    }

    if (body.whatsappUrl !== undefined || body.whatsapp_url !== undefined) {
      const val = String(body.whatsappUrl ?? body.whatsapp_url).trim();
      updates.push(["whatsapp_url", val], ["whatsappUrl", val]);
    }

    if (body.telegramUrl !== undefined || body.telegram_url !== undefined || body.supportTelegram !== undefined || body.support_telegram !== undefined) {
      const raw = String(body.telegramUrl ?? body.telegram_url ?? body.supportTelegram ?? body.support_telegram).trim();
      const normalized = normalizeTelegramInput(raw);
      updates.push(
        ["telegram_url", normalized],
        ["telegramUrl", normalized],
        ["support_telegram", normalized],
        ["supportTelegram", normalized]
      );
    }

    if (body.aboutUs !== undefined || body.about_us !== undefined) {
      const val = String(body.aboutUs ?? body.about_us).trim();
      updates.push(["about_us", val], ["aboutUs", val]);
    }

    for (const [key, val] of updates) {
      await tursoExecute(
        "INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [key, val]
      );
    }

    // Fetch refreshed complete settings
    const rows = await tursoQuery("SELECT key, value FROM site_settings");
    const currentSettings: Record<string, string> = {};
    rows.forEach((r: any) => {
      currentSettings[r.key] = r.value;
    });

    return NextResponse.json({
      success: true,
      message: "Telegram setting saved successfully!",
      supportTelegram: currentSettings.supportTelegram || currentSettings.telegramUrl || currentSettings.telegram_url || "",
      settings: currentSettings
    });
  } catch (err: any) {
    console.error("[Settings API Error]:", err);
    return NextResponse.json({ message: err?.message || "Unable to save Telegram setting. Please try again." }, { status: 400 });
  }
}

export async function POST(req: Request) {
  return saveSettings(req);
}

export async function PUT(req: Request) {
  return saveSettings(req);
}

export async function PATCH(req: Request) {
  return saveSettings(req);
}

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin && auth.user?.role !== "co_admin") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const rows = await tursoQuery("SELECT key, value FROM site_settings");
  const settings: Record<string, string> = {
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

  return NextResponse.json(settings);
}
