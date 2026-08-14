import { tursoExecute, tursoQueryOne } from "./db";

export type AppErrorPayload = {
  errorMessage: string;
  stackTrace?: string;
  path?: string;
  statusCode?: number;
};

/**
 * Log an error into Turso DB (app_errors table) and optionally trigger Telegram Alert
 */
export async function logAppError(payload: AppErrorPayload) {
  try {
    const errorId = crypto.randomUUID();
    const now = new Date().toISOString();
    const statusCode = payload.statusCode || 500;

    await tursoExecute(
      `INSERT INTO app_errors (id, errorMessage, stackTrace, path, statusCode, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        errorId,
        payload.errorMessage || "Unknown Application Error",
        payload.stackTrace || "",
        payload.path || "",
        statusCode,
        now
      ]
    );

    // If server 500 error, trigger instant alert
    if (statusCode >= 500) {
      await sendTelegramMonitoringAlert(
        "🚨 Server Error Alert",
        `*Path:* \`${payload.path || "N/A"}\`\n*Error:* ${payload.errorMessage}\n*Status Code:* ${statusCode}`
      );
    }

    return errorId;
  } catch (err) {
    console.error("Failed to store app error in database:", err);
    return null;
  }
}

/**
 * Send an automated Telegram alert using TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID (env or settings table)
 */
export async function sendTelegramMonitoringAlert(title: string, message: string) {
  try {
    let botToken = process.env.TELEGRAM_BOT_TOKEN || "8918133716:AAEGfbAu7iHcXxozhTGnpYv1AQvanL4jvYQ";
    let chatId = process.env.TELEGRAM_CHAT_ID || "-1003922901910";

    // Fallback: check settings table in database if env vars not set
    if (!botToken || !chatId) {
      const botTokenSetting = await tursoQueryOne(
        "SELECT value FROM settings WHERE key IN ('telegramBotToken', 'telegram_bot_token') LIMIT 1",
        []
      );
      const chatIdSetting = await tursoQueryOne(
        "SELECT value FROM settings WHERE key IN ('telegramChatId', 'telegram_chat_id') LIMIT 1",
        []
      );

      if (botTokenSetting?.value) botToken = botTokenSetting.value;
      if (chatIdSetting?.value) chatId = chatIdSetting.value;
    }

    if (!botToken || !chatId) {
      return { success: false, message: "Telegram Bot Token or Chat ID not configured." };
    }

    const cleanToken = botToken.trim();
    const cleanChatId = chatId.trim();
    const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;

    const fullMessage = `⚡ *SRI EXPLAINER MONITORING SYSTEM*\n\n*${title}*\n\n${message}\n\n⏰ _${new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })} IST_`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: fullMessage,
        parse_mode: "Markdown"
      })
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { success: false, message: data.description || "Telegram API request failed." };
    }

    return { success: true, message: "Telegram alert sent successfully!" };
  } catch (err: any) {
    return { success: false, message: err?.message || "Failed to send Telegram alert." };
  }
}
