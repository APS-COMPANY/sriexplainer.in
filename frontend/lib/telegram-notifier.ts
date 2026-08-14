import { tursoQueryOne, tursoExecute } from "./db";

export async function sendEpisodePublicationNotification(episodeId: string): Promise<boolean> {
  if (!episodeId) return false;

  try {
    // 1. Check duplicate notification status
    const existingNotification = await tursoQueryOne(
      "SELECT status FROM episode_notifications WHERE episodeId = ? AND status = 'SENT'",
      [episodeId]
    );

    if (existingNotification) {
      console.log(`[Telegram Notifier]: Episode ${episodeId} notification already sent. Skipping.`);
      return true;
    }

    // 2. Load Episode and Series details from database
    const ep = await tursoQueryOne(
      `SELECT e.*, s.title as seriesTitle, s.slug as seriesSlug, s.thumbnail as seriesThumbnail, s.banner as seriesBanner
       FROM episodes e
       JOIN series s ON e.seriesId = s.id
       WHERE e.id = ?`,
      [episodeId]
    );

    if (!ep) {
      console.warn(`[Telegram Notifier]: Episode ${episodeId} not found in database.`);
      return false;
    }

    // 3. Verify episode publication availability (do not notify if scheduled for future)
    if (ep.scheduledReleaseAt && new Date(ep.scheduledReleaseAt).getTime() > Date.now()) {
      console.log(`[Telegram Notifier]: Episode ${episodeId} is scheduled for future release (${ep.scheduledReleaseAt}). Waiting.`);
      return false;
    }

    // 4. Configure Telegram Bot Credentials (server-side only)
    let botToken = process.env.TELEGRAM_BOT_TOKEN || "8918133716:AAEGfbAu7iHcXxozhTGnpYv1AQvanL4jvYQ";
    let chatId = process.env.TELEGRAM_CHAT_ID || "-1003922901910";

    if (!botToken || !chatId) {
      const tokenSetting = await tursoQueryOne("SELECT value FROM site_settings WHERE key IN ('telegramBotToken', 'telegram_bot_token') LIMIT 1");
      const chatSetting = await tursoQueryOne("SELECT value FROM site_settings WHERE key IN ('telegramChatId', 'telegram_chat_id') LIMIT 1");
      if (tokenSetting?.value) botToken = tokenSetting.value;
      if (chatSetting?.value) chatId = chatSetting.value;
    }

    if (!botToken || !chatId) {
      console.warn("[Telegram Notifier]: Missing bot token or chat ID.");
      return false;
    }

    const cleanToken = botToken.trim();
    const cleanChatId = chatId.trim();

    // 5. Build Watch URL and Poster Image URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sri-explainer-web.vercel.app";
    const watchUrl = `${baseUrl.replace(/\/+$/, "")}/watch/${ep.id}`;

    const rawImg = ep.thumbnail || ep.seriesThumbnail || ep.seriesBanner || "";
    let photoUrl = "";
    if (rawImg) {
      if (rawImg.startsWith("http://") || rawImg.startsWith("https://")) {
        photoUrl = rawImg;
      } else {
        const cleanPath = rawImg.startsWith("/") ? rawImg : `/${rawImg}`;
        photoUrl = `${baseUrl.replace(/\/+$/, "")}${cleanPath.startsWith("/api/uploads/") ? cleanPath : `/api/uploads${cleanPath.replace(/^\/uploads\//, "/")}`}`;
      }
    }

    // 6. Format Message
    const accessLower = String(ep.access || "public").toLowerCase().trim();
    const isXpCoins = accessLower === "xp_coins" || accessLower === "premium" || accessLower === "subscription";
    const xpCost = Math.max(1, Number(ep.xpCost || 5));

    const seriesTitle = ep.seriesTitle || "Series";
    const epNumber = ep.number || 1;
    const epTitle = ep.title || `Episode ${epNumber}`;

    let messageText = "";
    if (isXpCoins) {
      messageText = `🎬 *NEW EPISODE*\n\n*${seriesTitle}*\nEpisode ${epNumber} — ${epTitle}\n\n💎 *${xpCost} XP COINS*\n\nWatch Now: ${watchUrl}`;
    } else {
      messageText = `🎬 *NEW FREE EPISODE*\n\n*${seriesTitle}*\nEpisode ${epNumber} — ${epTitle}\n\n🟢 *FREE*\n\nWatch Now: ${watchUrl}`;
    }

    // 7. Attempt Send (sendPhoto with fallback to sendMessage)
    let sendSuccess = false;

    if (photoUrl) {
      try {
        const photoRes = await fetch(`https://api.telegram.org/bot${cleanToken}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: cleanChatId,
            photo: photoUrl,
            caption: messageText,
            parse_mode: "Markdown"
          })
        });
        const photoData = await photoRes.json();
        if (photoRes.ok && photoData.ok) {
          sendSuccess = true;
        }
      } catch (photoErr) {
        console.warn("[Telegram Notifier]: sendPhoto failed, falling back to sendMessage:", photoErr);
      }
    }

    if (!sendSuccess) {
      const msgRes = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: cleanChatId,
          text: messageText,
          parse_mode: "Markdown"
        })
      });
      const msgData = await msgRes.json();
      if (msgRes.ok && msgData.ok) {
        sendSuccess = true;
      } else {
        console.error("[Telegram Notifier Error]: sendMessage failed:", msgData);
      }
    }

    // 8. Record Delivery Status for Duplicate Protection
    const nowIso = new Date().toISOString();
    const notifId = `tn_${crypto.randomUUID()}`;

    if (sendSuccess) {
      await tursoExecute(
        `INSERT OR REPLACE INTO episode_notifications (id, episodeId, notificationType, status, sentAt)
         VALUES (?, ?, ?, 'SENT', ?)`,
        [notifId, episodeId, isXpCoins ? "XP_COINS_EPISODE" : "FREE_EPISODE", nowIso]
      );
      console.log(`[Telegram Notifier]: Publication notification successfully delivered for episode ${episodeId}`);
      return true;
    } else {
      await tursoExecute(
        `INSERT OR REPLACE INTO episode_notifications (id, episodeId, notificationType, status, sentAt)
         VALUES (?, ?, ?, 'FAILED', ?)`,
        [notifId, episodeId, isXpCoins ? "XP_COINS_EPISODE" : "FREE_EPISODE", nowIso]
      ).catch(() => {});
      return false;
    }
  } catch (err: any) {
    console.error("[Telegram Notifier Exception]:", err);
    return false;
  }
}
