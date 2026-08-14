import { NextResponse } from "next/server";
import { verifyAuth } from "../../../../lib/auth";
import { tursoQueryOne } from "../../../../lib/db";
import { sendEpisodePublicationNotification } from "../../../../lib/telegram-notifier";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ep = await tursoQueryOne(
    `SELECT e.*, s.title as seriesTitle, s.slug as seriesSlug, s.visibility as seriesVisibility 
     FROM episodes e 
     JOIN series s ON e.seriesId = s.id 
     WHERE e.id = ?`,
    [id]
  );

  if (!ep) {
    return NextResponse.json({ message: "Episode not found" }, { status: 404 });
  }

  const seriesVis = (ep.seriesVisibility || "public").toLowerCase().trim();
  const epVis = (ep.visibility || "public").toLowerCase().trim();
  const epAccess = (ep.access || "free").toLowerCase().trim();
  
  const isXpCoinsRequired = epAccess === "xp_coins" || epAccess === "premium" || epAccess === "subscription";
  const xpCost = isXpCoinsRequired ? Math.max(1, Number(ep.xpCost || 5)) : 0;
  const isPrivateOnly = seriesVis === "private" || epVis === "private";

  const auth = await verifyAuth(req);
  const isUserAdmin = Boolean(auth.isAdmin || auth.isMainAdmin || auth.user?.role === "admin");
  
  let isUnlocked = !isXpCoinsRequired;
  let userCoins = 0;
  let userLiked = false;
  let userHyped = false;

  if (auth.user) {
    const userDb = await tursoQueryOne("SELECT xpCoins FROM users WHERE id = ?", [auth.user.id]);
    userCoins = Number(userDb?.xpCoins || 0);

    if (isXpCoinsRequired) {
      const unlockRow = await tursoQueryOne(
        "SELECT id FROM episode_unlocks WHERE userId = ? AND episodeId = ?",
        [auth.user.id, id]
      );
      if (unlockRow) isUnlocked = true;
    }

    try {
      const likedRow = await tursoQueryOne("SELECT episodeId FROM episode_likes WHERE userId = ? AND episodeId = ?", [auth.user.id, id]);
      if (likedRow) userLiked = true;
      const hypedRow = await tursoQueryOne("SELECT episodeId FROM episode_hypes WHERE userId = ? AND episodeId = ?", [auth.user.id, id]);
      if (hypedRow) userHyped = true;
    } catch {}
  }

  const isScheduledFuture = Boolean(
    ep.scheduledReleaseAt && new Date(ep.scheduledReleaseAt).getTime() > Date.now()
  );

  if (isScheduledFuture && !isUserAdmin) {
    return NextResponse.json(
      { message: "This episode is scheduled for release soon and is not available yet.", isUpcoming: true, scheduledReleaseAt: ep.scheduledReleaseAt, restricted: true },
      { status: 403 }
    );
  }

  // Trigger Telegram Publication Alert if release time has arrived
  if (!isScheduledFuture) {
    sendEpisodePublicationNotification(id).catch(() => {});
  }

  if (isPrivateOnly && !isUserAdmin) {
    return NextResponse.json(
      { message: "This video is restricted and can only be viewed by an administrator.", isPrivate: true, restricted: true },
      { status: 403 }
    );
  }

  if (isXpCoinsRequired && !isUserAdmin && !isUnlocked) {
    return NextResponse.json(
      {
        message: `This episode requires ${xpCost} XP Coins to unlock.`,
        paywall: true,
        isXpCoinsRequired: true,
        xpCost,
        isUnlocked: false,
        userCoins,
        errorStatus: 403
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    ...ep,
    _id: ep.id,
    number: Number(ep.number || 1),
    quality: ep.quality || "1080P",
    visibility: ep.visibility || "public",
    access: isXpCoinsRequired ? "xp_coins" : "free",
    xpCost: isXpCoinsRequired ? xpCost : 0,
    isUnlocked: !isXpCoinsRequired || isUnlocked || isUserAdmin,
    views: Number(ep.views || 0),
    likesCount: Number(ep.likesCount || 0),
    hypeCount: Number(ep.hypeCount || 0),
    userLiked,
    userHyped
  });
}
