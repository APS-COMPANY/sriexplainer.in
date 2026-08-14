"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getToken } from "../../../lib/api";
import { ChevronLeft, ChevronRight, Heart, Share2, Play, ShieldAlert, Sparkles, Lock, Zap, Clock, ThumbsUp, ThumbsDown, Download, Flame, Bookmark, ListPlus, Check, MoreHorizontal } from "lucide-react";
import { EpisodeComments } from "../../../components/comments";
import { RumblePlayer } from "../../../components/rumble-player";
import { LiveCountdown } from "../../../components/live-countdown";
import { showSuccess, showWarning } from "../../../components/notification-provider";
import { UpcomingMarquee } from "../../../components/content";

import { saveOfflineEpisode, getOfflineEpisode, removeOfflineEpisode } from "../../../lib/offline-storage";

export default function Watch() {
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const [savedProgress, setSavedProgress] = useState<number>(0);
  const [isFavorited, setIsFavorited] = useState<boolean>(false);
  const [isWatchLater, setIsWatchLater] = useState<boolean>(false);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isDisliked, setIsDisliked] = useState<boolean>(false);
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);
  const [downloadingProgress, setDownloadingProgress] = useState<number | null>(null);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [isHyped, setIsHyped] = useState<boolean>(false);
  const [hypeCount, setHypeCount] = useState<number>(0);
  const [historySaved, setHistorySaved] = useState<boolean>(false);
  const [stableIframeUrl, setStableIframeUrl] = useState<string>("");
  const [showReplay, setShowReplay] = useState<boolean>(false);
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false);
  const hasRecordedViewRef = useRef<boolean>(false);
  const playSessionIdRef = useRef<string>("");
  if (!playSessionIdRef.current) {
    playSessionIdRef.current = `ps_${crypto.randomUUID()}`;
  }

  const handlePlayStart = async () => {
    if (hasRecordedViewRef.current || !id) return;
    hasRecordedViewRef.current = true;
    try {
      await api.post(`/episodes/${id}/view`, {
        sessionId: playSessionIdRef.current
      });
      queryClient.invalidateQueries({ queryKey: ["admin-episodes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
    } catch {}
  };

  // Load episode details with instant offline IndexedDB fallback
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["episode", id],
    queryFn: async () => {
      if (!id) throw new Error("No episode ID");

      // 1. Check IndexedDB offline storage immediately
      const offlineItem = await getOfflineEpisode(id);

      // If offline, return IndexedDB cached episode instantly
      if (typeof window !== "undefined" && !navigator.onLine && offlineItem) {
        return {
          _id: offlineItem.episodeId,
          id: offlineItem.episodeId,
          number: offlineItem.number || 1,
          title: offlineItem.title,
          duration: offlineItem.duration || "Watch Offline",
          rumbleEmbedUrl: offlineItem.rumbleEmbedUrl || offlineItem.embedUrl || "",
          embedUrl: offlineItem.embedUrl || offlineItem.rumbleEmbedUrl || "",
          thumbnail: offlineItem.thumbnail,
          access: "free",
          isOfflinePlay: true,
          series: {
            id: offlineItem.seriesId || "",
            _id: offlineItem.seriesId || "",
            title: offlineItem.seriesTitle,
            slug: offlineItem.seriesSlug || "",
            thumbnail: offlineItem.thumbnail
          }
        };
      }

      try {
        // Race API request against a 1.2s timeout if offlineItem exists
        const fetchPromise = api.get(`/episodes/${id}`).then((res) => res.data);
        if (offlineItem) {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Network timeout - using offline cache")), 1200)
          );
          return await Promise.race([fetchPromise, timeoutPromise]);
        }
        return await fetchPromise;
      } catch (err: any) {
        // Fallback to IndexedDB offline item if API fails or times out
        if (offlineItem) {
          return {
            _id: offlineItem.episodeId,
            id: offlineItem.episodeId,
            number: offlineItem.number || 1,
            title: offlineItem.title,
            duration: offlineItem.duration || "Watch Offline",
            rumbleEmbedUrl: offlineItem.rumbleEmbedUrl || offlineItem.embedUrl || "",
            embedUrl: offlineItem.embedUrl || offlineItem.rumbleEmbedUrl || "",
            thumbnail: offlineItem.thumbnail,
            access: "free",
            isOfflinePlay: true,
            series: {
              id: offlineItem.seriesId || "",
              _id: offlineItem.seriesId || "",
              title: offlineItem.seriesTitle,
              slug: offlineItem.seriesSlug || "",
              thumbnail: offlineItem.thumbnail
            }
          };
        }

        if (err.response?.status === 403) {
          return {
            errorStatus: 403,
            isUpcoming: err.response.data?.isUpcoming,
            scheduledReleaseAt: err.response.data?.scheduledReleaseAt,
            isPrivate: err.response.data?.isPrivate,
            restricted: err.response.data?.restricted,
            paywall: err.response.data?.paywall,
            message: err.response.data?.message,
            isXpCoinsRequired: err.response.data?.isXpCoinsRequired,
            xpCost: err.response.data?.xpCost,
            userCoins: typeof err.response.data?.userCoins === "number" ? err.response.data.userCoins : null
          };
        }
        throw err;
      }
    },
    enabled: !!id,
    staleTime: 0,
    gcTime: 0,
  });

  // Calculate stable iframe URL once when data is loaded
  useEffect(() => {
    if (!data || data.errorStatus || stableIframeUrl) return;

    const baseRumbleUrl = data.rumbleEmbedUrl || data.embedUrl || "";
    if (!baseRumbleUrl) return;

    let startSec = 0;
    if (data.savedProgress?.currentPosition && data.savedProgress.currentPosition > 0) {
      startSec = Math.round(data.savedProgress.currentPosition);
    } else {
      const local = localStorage.getItem(`sri_watch_progress_${id}`);
      if (local && Number(local) > 0 && Number(local) < 90) {
        startSec = Math.round((Number(local) / 100) * 1200);
      }
    }

    setSavedProgress(data.savedProgress?.percentage || (startSec ? Math.round((startSec / 1200) * 100) : 0));

    const finalUrl = startSec > 0
      ? `${baseRumbleUrl}${baseRumbleUrl.includes("?") ? "&" : "?"}start=${startSec}`
      : baseRumbleUrl;

    setStableIframeUrl(finalUrl);
  }, [data, id, stableIframeUrl]);

  // Watch history sync: Saved in localStorage locally during playback, and synced to server ONLY on unmount/leave
  const lastPercentRef = useRef<number>(savedProgress);
  useEffect(() => {
    if (!id || !data || data.errorStatus) return;

    // Immediately save initial entry to local storage
    const initialPercent = Math.max(5, lastPercentRef.current || 5);
    localStorage.setItem(`sri_watch_progress_${id}`, String(initialPercent));

    // Cleanup: When leaving the page, sync progress to backend once if authenticated
    return () => {
      const finalPercent = lastPercentRef.current || initialPercent;
      localStorage.setItem(`sri_watch_progress_${id}`, String(finalPercent));

      if (typeof window !== "undefined" && getToken() && navigator.onLine && !data.isOfflinePlay) {
        const payload = {
          episodeId: id,
          currentPosition: Math.round((finalPercent / 100) * 1200),
          duration: 1200,
          progress: finalPercent
        };
        // Use sendBeacon or non-blocking async post
        try {
          navigator.sendBeacon?.("/api/history/progress", JSON.stringify(payload));
        } catch {
          api.post("/history/progress", payload).catch(() => {});
        }
      }
    };
  }, [id, data]);

  const handleReplay = () => {
    const baseRumbleUrl = data?.rumbleEmbedUrl || data?.embedUrl || "";
    setStableIframeUrl("");
    setTimeout(() => {
      setStableIframeUrl(baseRumbleUrl);
      setSavedProgress(0);
      setShowReplay(false);
      localStorage.removeItem(`sri_watch_progress_${id}`);
      lastPercentRef.current = 0;
    }, 100);
  };

  // Load like, hype, My List, Watch Later, and IndexedDB Download initial state
  useEffect(() => {
    if (data && !data.errorStatus && id) {
      try {
        const localHyped = typeof window !== "undefined" && localStorage.getItem(`sri_episode_hyped_${id}`) === "true";
        setIsLiked(Boolean(data.userLiked));
        setIsHyped(typeof data.userHyped === "boolean" ? data.userHyped : localHyped);
        setLikesCount(Number(data.likesCount || 0));
        setHypeCount(data.hypeCount ?? (localHyped ? 1 : 0));
      } catch {}

      // Check if episode is saved in IndexedDB offline storage
      getOfflineEpisode(id).then((saved) => {
        if (saved) setIsDownloaded(true);
      }).catch(() => {});

      // Only perform online API checks if network is available
      if (typeof window !== "undefined" && navigator.onLine) {
        const sId = data.seriesId || data.series?._id || data.series?.id;
        if (sId) {
          api.get("/favorites").then((res) => {
            const list = Array.isArray(res.data) ? res.data : [];
            const isFav = list.some((f: any) => f.id === sId || f._id === sId || f.seriesId === sId || f.series?.id === sId || f.series?._id === sId);
            setIsFavorited(isFav);
          }).catch(() => {});

          api.get("/watch-later").then((res) => {
            const list = Array.isArray(res.data) ? res.data : [];
            const isSaved = list.some((w: any) => w.id === sId || w._id === sId || w.seriesId === sId || w.series?.id === sId || w.series?._id === sId);
            setIsWatchLater(isSaved);
          }).catch(() => {});
        }
      }
    }
  }, [data, id]);

  const toggleFavorite = async () => {
    const targetSeriesId = data?.seriesId || data?.series?._id || data?.series?.id;
    if (!targetSeriesId) return;
    try {
      const res = await api.post(`/favorites/${targetSeriesId}`);
      const isFav = Boolean(res.data?.favorited ?? res.data?.favorite);
      setIsFavorited(isFav);
      showSuccess(isFav ? "Added to My List! 📋" : "Removed from My List.");
      queryClient.invalidateQueries({ queryKey: ["my-list-page"] });
      queryClient.invalidateQueries({ queryKey: ["user-favorites"] });
    } catch (err: any) {
      if (err?.response?.status === 401) {
        showWarning("Please sign in to add series to My List.");
      } else {
        showWarning(err?.response?.data?.message || "Could not update My List.");
      }
    }
  };

  const toggleWatchLater = async () => {
    const targetSeriesId = data?.seriesId || data?.series?._id || data?.series?.id;
    if (!targetSeriesId) return;
    try {
      const res = await api.post("/watch-later", { seriesId: targetSeriesId });
      const isSaved = Boolean(res.data?.saved);
      setIsWatchLater(isSaved);
      showSuccess(isSaved ? "Added to Watch Later! ⏰" : "Removed from Watch Later.");
      queryClient.invalidateQueries({ queryKey: ["watch-later"] });
      queryClient.invalidateQueries({ queryKey: ["watch-later-profile"] });
    } catch (err: any) {
      if (err?.response?.status === 401) {
        showWarning("Please sign in to save to Watch Later.");
      } else {
        showWarning(err?.response?.data?.message || "Could not update Watch Later.");
      }
    }
  };

  const formatCount = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return num.toString();
  };

  const toggleDislike = () => {
    if (isDisliked) {
      setIsDisliked(false);
    } else {
      setIsDisliked(true);
      if (isLiked) {
        setIsLiked(false);
        setLikesCount((prev) => Math.max(0, prev - 1));
      }
      showSuccess("Feedback received.");
    }
  };

  const handleDownload = async () => {
    if (!id || !data) return;

    if (isDownloaded) {
      if (window.confirm("This episode is saved offline. Would you like to remove it from My Downloads?")) {
        await removeOfflineEpisode(id);
        setIsDownloaded(false);
        showSuccess("Removed episode from offline downloads.");
      }
      return;
    }

    try {
      setDownloadingProgress(50);
      const epData = {
        episodeId: id,
        seriesId: data.seriesId || data.series?._id || data.series?.id || "",
        seriesSlug: series.slug || "",
        number: Number(data.number || 1),
        title: data.title || "Episode",
        seriesTitle: series.title || "Sri Explainer",
        thumbnail: data.thumbnail || series.thumbnail || "",
        duration: data.duration || "Watch Offline",
        rumbleEmbedUrl: data.rumbleEmbedUrl || data.embedUrl || "",
        embedUrl: data.embedUrl || "",
        downloadedAt: new Date().toISOString(),
      };

      const saved = await saveOfflineEpisode(epData);
      setDownloadingProgress(null);
      if (saved) {
        setIsDownloaded(true);
        showSuccess("Episode encrypted & saved for offline watch! ⬇️");
      } else {
        showWarning("Offline storage save encountered an issue.");
      }
    } catch (err: any) {
      setDownloadingProgress(null);
      showWarning("Could not complete offline download.");
    }
  };

  const toggleLike = async () => {
    if (!id) return;
    try {
      const res = await api.post(`/episodes/${id}/like`);
      if (res.data && typeof res.data.likesCount === "number") {
        const nextLiked = Boolean(res.data.liked);
        setIsLiked(nextLiked);
        if (nextLiked) setIsDisliked(false);
        setLikesCount(res.data.likesCount);
        showSuccess(nextLiked ? "Episode liked! 👍" : "Like removed.");
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        showWarning("Please sign in to like episodes.");
      } else {
        showWarning(err.response?.data?.message || "Could not update like status.");
      }
    }
  };

  const toggleHype = async () => {
    if (!id) return;
    if (isHyped) {
      showWarning("You have already hyped this episode! 🔥");
      return;
    }

    setIsHyped(true);
    const newCount = hypeCount + 1;
    setHypeCount(newCount);
    localStorage.setItem(`sri_episode_hyped_${id}`, "true");
    showSuccess("🔥 Episode Hyped! Let's go!");

    try {
      const res = await api.post(`/episodes/${id}/hype`);
      if (res.data && typeof res.data.hypeCount === "number") {
        setHypeCount(res.data.hypeCount);
        setIsHyped(true);
      }
    } catch {}
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: data?.title || "Sri Explainer",
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      showSuccess("Episode link copied to clipboard!");
    }
  };

  if (isLoading) {
    return (
      <main className="shell py-20 text-center text-zinc-400 min-h-[70vh] grid place-items-center">
        <div className="space-y-4">
          <div className="h-12 w-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-semibold text-zinc-300">Loading video player...</p>
        </div>
      </main>
    );
  }

  // 0. Upcoming Scheduled Episode Callout
  if (data?.isUpcoming) {
    const marqueeMsg = data?.upcomingDisplayMessage?.trim() || `EPISODE ${data?.number || 1} IS UPCOMING • RELEASES SOON •`;

    return (
      <main className="shell py-16 text-center min-h-[70vh] grid place-items-center">
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-[#0E0E0E] via-[#1F1400] to-[#0E0E0E] p-8 sm:p-12 max-w-xl text-center space-y-6 shadow-2xl">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 mx-auto shadow-lg">
            <Clock size={32} />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black uppercase tracking-wider">
            <span>🔴 UPCOMING EPISODE</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">This Episode Releases Soon!</h1>
          <p className="text-xs sm:text-sm text-zinc-300">
            This episode is scheduled for release. The video player will unlock automatically when countdown reaches 0.
          </p>

          <UpcomingMarquee text={marqueeMsg} />

          <div className="p-4 rounded-2xl bg-[#000000] border border-amber-500/30 inline-block w-full">
            <LiveCountdown targetDate={data.scheduledReleaseAt} />
          </div>
          <div className="pt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all"
            >
              Return Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // 1. Private Video Restriction Callout (Admin Only)
  if (data?.isPrivate || data?.restricted) {
    return (
      <main className="shell py-16 text-center min-h-[70vh] grid place-items-center">
        <div className="relative overflow-hidden rounded-3xl border border-rose-500/30 bg-gradient-to-br from-zinc-900 via-rose-950/40 to-zinc-950 p-8 sm:p-12 max-w-xl text-center space-y-6 shadow-2xl">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-rose-600/20 border border-rose-500/30 text-rose-500 mx-auto shadow-lg">
            <Lock size={32} />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 text-xs font-black uppercase tracking-wider">
            <Lock size={14} /> Restricted Video
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Restricted Video
          </h2>
          <p className="text-zinc-300 text-sm leading-relaxed">
            {data.message || "This video is restricted and can only be viewed by an administrator."}
          </p>
          <div className="pt-4 flex justify-center">
            <Link
              href="/latest"
              className="px-6 py-3.5 rounded-2xl bg-zinc-900 border border-white/10 hover:bg-white/10 font-bold text-zinc-300 hover:text-white transition-all text-sm"
            >
              Back
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const handleUnlockEpisode = async () => {
    setIsUnlocking(true);
    try {
      const res = await api.post(`/episodes/${id}/unlock`);
      showSuccess(res.data?.message || "Episode unlocked successfully!");
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
      queryClient.invalidateQueries({ queryKey: ["episode", id] });
      queryClient.invalidateQueries({ queryKey: ["xp-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["user-xp"] });
      refetch();
    } catch (err: any) {
      showWarning(err.response?.data?.message || "Could not unlock episode.");
    } finally {
      setIsUnlocking(false);
    }
  };

  // 2. Paywall Callout for XP Coins Content
  if (data?.errorStatus === 403 || data?.paywall || data?.isXpCoinsRequired) {
    const xpCost = Number(data?.xpCost || 5);
    const userCoins = typeof data?.userCoins === "number" ? data.userCoins : null;
    const hasEnoughCoins = userCoins !== null && userCoins >= xpCost;

    return (
      <main className="shell py-16 text-center min-h-[70vh] grid place-items-center select-none">
        <div className="relative overflow-hidden rounded-3xl border-[1.5px] border-white/15 bg-[#0E0E0E] p-8 sm:p-12 max-w-xl text-center space-y-6 shadow-[3px_3px_0px_rgba(0,0,0,0.8)]">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10 border border-white/20 text-white mx-auto shadow-lg text-3xl">
            💠
          </div>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/10 text-white text-xs font-black uppercase tracking-wider font-mono border border-white/20">
            💠 {xpCost} XP Coins Required
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight font-display uppercase">
            Unlock This Episode
          </h2>
          <p className="text-zinc-300 text-sm leading-relaxed font-primary">
            This episode costs <strong className="text-white font-bold">{xpCost} XP Coins</strong> to unlock permanently.
          </p>

          <div className="p-4 rounded-2xl bg-[#000000] border border-white/15 text-xs font-bold text-zinc-300 flex items-center justify-between font-mono">
            <span>Your Current Balance:</span>
            {userCoins !== null ? (
              <span className="text-sm font-black text-white flex items-center gap-1">
                <span>💠</span> {userCoins} XP Coins
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-rose-400 font-normal">Unable to load XP Coin balance.</span>
                <button onClick={() => refetch()} className="text-xs font-bold text-white underline hover:text-zinc-300">
                  Retry
                </button>
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-4 justify-center font-mono">
            {userCoins === null ? (
              <button
                onClick={() => refetch()}
                className="w-full py-3.5 rounded-full bg-[#141414] border border-white/15 text-white font-bold text-sm"
              >
                Retry Loading Balance
              </button>
            ) : hasEnoughCoins ? (
              <button
                onClick={handleUnlockEpisode}
                disabled={isUnlocking}
                className="px-8 py-3.5 rounded-full bg-white text-black hover:bg-zinc-200 font-black shadow-[2px_2px_0px_rgba(255,255,255,0.25)] hover:scale-105 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 font-display uppercase tracking-wider"
              >
                <span>💠</span>
                <span>{isUnlocking ? "Unlocking..." : `Unlock Episode (${xpCost} XP)`}</span>
              </button>
            ) : (
              <div className="w-full space-y-3">
                <p className="text-xs text-rose-400 font-bold">
                  Not enough XP Coins. You need {xpCost - userCoins} more XP Coins to unlock.
                </p>
                <Link
                  href="/pricing"
                  className="w-full block py-3.5 rounded-full bg-white text-black hover:bg-zinc-200 font-black shadow-[2px_2px_0px_rgba(255,255,255,0.25)] hover:scale-105 transition-all text-sm text-center font-display uppercase tracking-wider"
                >
                  Buy XP Coins →
                </Link>
              </div>
            )}
            <Link
              href="/latest"
              className="px-6 py-3.5 rounded-full bg-[#141414] border border-white/15 hover:border-white font-bold text-zinc-300 hover:text-white transition-all text-sm"
            >
              Back
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="shell py-20 text-center min-h-[70vh] grid place-items-center select-none">
        <div className="rounded-3xl p-8 border-[1.5px] border-white/15 bg-[#0E0E0E] text-center space-y-4 max-w-md shadow-[3px_3px_0px_rgba(0,0,0,0.8)]">
          <ShieldAlert size={48} className="text-rose-500 mx-auto" />
          <h2 className="text-2xl font-black text-white font-display uppercase">Episode Not Found</h2>
          <p className="text-zinc-400 text-sm font-primary">
            This episode could not be loaded or may have been updated.
          </p>
          <Link
            href="/latest"
            className="inline-block px-6 py-3 rounded-full bg-white text-black hover:bg-zinc-200 font-black text-sm font-display uppercase tracking-wider font-mono shadow-[2px_2px_0px_rgba(255,255,255,0.25)]"
          >
            Explore Available Series
          </Link>
        </div>
      </main>
    );
  }

  const series: any = data.series || {};
  const nextEp = data.nextEpisode;
  const prevEp = data.prevEpisode;

  return (
    <main className="px-4 sm:px-8 py-6 pb-16 w-full max-w-6xl 3xl:max-w-7xl 4xl:max-w-[2200px] mx-auto select-none">
      {/* Back Navigation Bar */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={series.slug ? `/series/${series.slug}` : "/latest"}
          className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors font-mono"
        >
          <ChevronLeft size={16} /> Back to {series.title || "Series"}
        </Link>
        {historySaved && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-white bg-white/10 border border-white/20 px-3 py-1 rounded-full font-mono font-bold">
            <Sparkles size={12} /> Watch position saved
          </span>
        )}
      </div>

      {/* Video Player Frame */}
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-black border border-white/15 shadow-2xl group">
        <RumblePlayer
          embedUrl={data.rumbleEmbedUrl || data.embedUrl || ""}
          videoBlobUrl={data.videoBlobUrl}
          isOfflinePlay={data.isOfflinePlay}
          title={data.title}
          posterUrl={data.thumbnail || series.thumbnail || ""}
          startPosition={savedProgress > 0 ? Math.round((savedProgress / 100) * 1200) : 0}
          onPlayStart={handlePlayStart}
          onEnded={() => setShowReplay(true)}
        />
      </div>

      {/* Episode Header & Action Buttons */}
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4 border-b border-white/15 pb-6">
        <div>
          <Link href={`/series/${series.slug}`} className="text-xs font-extrabold text-zinc-400 uppercase tracking-wider font-mono">
            {series.title}
          </Link>
          <h1 className="mt-1 text-lg sm:text-2xl lg:text-3xl font-black text-white flex flex-wrap items-center gap-3 font-display tracking-tight leading-snug break-words uppercase">
            <span>Episode {data.number}: {data.title}</span>
            {data.isOfflinePlay && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-black uppercase tracking-wider font-mono">
                ⚡ PLAYING OFFLINE DOWNLOAD
              </span>
            )}
            {data.access === "xp_coins" && !data.isOfflinePlay && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-black uppercase tracking-wider font-mono">
                ✓ UNLOCKED ({data.xpCost || 5} XP)
              </span>
            )}
            {(data.access === "free" || !data.access || data.access === "public") && !data.isOfflinePlay && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-black uppercase tracking-wider font-mono">
                🟢 FREE
              </span>
            )}
          </h1>
          {series.description && (
            <p className="mt-3 max-w-3xl text-zinc-400 text-sm md:text-base leading-relaxed">
              {series.description}
            </p>
          )}
        </div>

        <div className="w-full sm:w-auto overflow-x-auto scrollbar-none pb-2 sm:pb-0">
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-max sm:min-w-0 sm:flex-wrap">
            {/* Share Button */}
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0E0E0E] hover:bg-white hover:text-black border border-white/20 text-zinc-200 font-semibold text-xs sm:text-sm transition-all shadow-sm shrink-0"
            >
              <Share2 size={15} />
              <span>Share</span>
            </button>

            {/* Save Button */}
            <button
              onClick={toggleWatchLater}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border font-semibold text-xs sm:text-sm transition-all shadow-sm shrink-0 ${
                isWatchLater
                  ? "bg-white text-black border-white shadow-[2px_2px_0px_rgba(255,255,255,0.25)] font-bold"
                  : "bg-[#0E0E0E] hover:bg-white hover:text-black border-white/20 text-zinc-200"
              }`}
            >
              <Bookmark size={15} fill={isWatchLater ? "currentColor" : "none"} />
              <span>{isWatchLater ? "Saved" : "Save"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Manual Series Directory Links */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        {prevEp ? (
          <Link
            href={`/watch/${prevEp._id || prevEp.id}`}
            className="manga-card flex items-center gap-3 p-4 text-zinc-300 hover:text-white border-[1.5px] border-white/15 hover:border-white transition-all hover:scale-[1.01] rounded-2xl"
          >
            <ChevronLeft size={20} className="text-white" />
            <div>
              <p className="text-xs text-zinc-500 font-medium font-mono">Previous Episode</p>
              <p className="font-bold text-sm font-display">Ep {prevEp.number}: {prevEp.title}</p>
            </div>
          </Link>
        ) : (
          <div />
        )}

        {nextEp && (
          <Link
            href={`/watch/${nextEp._id || nextEp.id}`}
            className="manga-card flex items-center justify-end gap-3 p-4 text-zinc-300 hover:text-white border-[1.5px] border-white/15 hover:border-white text-right transition-all hover:scale-[1.01] rounded-2xl"
          >
            <div>
              <p className="text-xs text-zinc-500 font-medium font-mono">Next Episode</p>
              <p className="font-bold text-sm font-display">Ep {nextEp.number}: {nextEp.title}</p>
            </div>
            <ChevronRight size={20} className="text-white" />
          </Link>
        )}
      </div>

      {/* Episode Comments Section */}
      <EpisodeComments episodeId={id} commentsDisabled={data.commentsDisabled} commentsLocked={data.commentsLocked} />
    </main>
  );
}
