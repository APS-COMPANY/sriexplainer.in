"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, image } from "../lib/api";
import { Play, ChevronRight, Sparkles, TrendingUp, Gem } from "lucide-react";
import { LiveCountdown } from "./live-countdown";
import { AutoFitBadge } from "./auto-fit-badge";
import { SeriesStatusBadge } from "./series-status-badge";

export type Show = {
  _id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string;
  banner: string;
  year: number;
  genres: string[];
  status: string;
  type?: string;
  category?: string;
  creator?: string;
  visibility?: string;
  accessType?: string;
  access?: string;
  xpCost?: number;
  isUnlocked?: boolean;
  trending?: boolean;
  episodeCount?: number;
  latestEpisodeNumber?: number;
  latestEpisodeQuality?: string;
  latestQuality?: string;
  maxQuality?: string;
  posterBadges?: any;
};

export function Poster({ show, rank, className }: { show: Show; rank?: number; className?: string }) {
  let genres: string[] = [];
  const rawGenres: any = show.genres;
  if (Array.isArray(rawGenres)) {
    genres = rawGenres;
  } else if (typeof rawGenres === "string" && rawGenres.trim()) {
    try {
      const parsed = JSON.parse(rawGenres);
      if (Array.isArray(parsed)) genres = parsed;
      else if (rawGenres !== "[]") genres = [rawGenres.trim()];
    } catch {
      if (rawGenres !== "[]") genres = [rawGenres.trim()];
    }
  }
  const displayGenre = (genres[0] && genres[0] !== "[]") ? genres[0] : "Explainer";
  const [imgError, setImgError] = useState(false);
  const seriesType = (show.type || show.category || "").trim();
  const showTypeBadge = Boolean(seriesType && seriesType.toLowerCase() !== "series");

  // Parse Custom 4-Corner Badges if configured
  let customBadges: {
    topLeft?: { text: string; enabled: boolean };
    topRight?: { text: string; enabled: boolean };
    bottomLeft?: { text: string; enabled: boolean };
    bottomRight?: { text: string; enabled: boolean };
  } | null = null;

  if (show.posterBadges) {
    try {
      if (typeof show.posterBadges === "string") {
        customBadges = JSON.parse(show.posterBadges);
      } else if (typeof show.posterBadges === "object") {
        customBadges = show.posterBadges;
      }
    } catch {}
  }

  const latestEpNum = Number(
    show.latestEpisodeNumber !== undefined && show.latestEpisodeNumber > 0
      ? show.latestEpisodeNumber
      : (show.episodeCount && show.episodeCount > 0 ? show.episodeCount : 0)
  ) || undefined;
  const latestEpQuality = (show.latestEpisodeQuality || show.latestQuality || show.maxQuality || "1080P").toUpperCase().trim();

  const formatCustomBadge = (text: string, isTopLeft: boolean = false) => {
    if (!text) return "";
    let res = text.replace(/\{COINS\}/gi, String(show.xpCost || 5));

    // Support dynamic template tokens
    if (/\{EP(ISODE)?\}/i.test(res) || /\{QUALITY\}/i.test(res)) {
      if (latestEpNum !== undefined && latestEpNum > 0) {
        res = res.replace(/\{EP(ISODE)?\}/gi, String(latestEpNum));
      }
      res = res.replace(/\{QUALITY\}/gi, latestEpQuality || "1080P");
      return res;
    }

    // Dynamic Top Left episode badge update
    if (isTopLeft && latestEpNum !== undefined && latestEpNum > 0) {
      const trimmed = res.trim();
      // Match any episode badge format (e.g. "EP 1 • 4K", "EP 1•4K", "EP 1 · 4K", "EP 1 - 4K", "EP 1", "EP1", "EP 2 • 1080P", etc.)
      if (/^EP(\s*\d+)?(\s*[\s•·\-:|\/]\s*.+)?$/i.test(trimmed)) {
        return latestEpQuality ? `EP ${latestEpNum} • ${latestEpQuality}` : `EP ${latestEpNum}`;
      }
    }

    return res;
  };

  return (
    <Link
      href={`/series/${show.slug}`}
      className={className || "group min-w-[135px] w-[135px] sm:min-w-[170px] sm:w-[170px] md:min-w-[190px] md:w-[190px] flex flex-col transition-all duration-300 relative select-none"}
    >
      {/* Vertical Poster Card Container (2:3 Aspect Ratio) with Manga Panel Framing */}
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-[#0E0E0E] border-[1.5px] border-white/15 shadow-[2px_2px_0px_rgba(0,0,0,0.8)] group-hover:border-white group-hover:shadow-[4px_4px_0px_rgba(255,255,255,0.25)] group-hover:-translate-y-1 transition-all duration-300 ease-out poster-container @container">
        {(show.thumbnail || show.banner) && !imgError ? (
          <img
            src={image(show.thumbnail || show.banner)}
            alt={show.title}
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="h-full w-full flex flex-col justify-between bg-gradient-to-tr from-[#000000] via-[#0E0E0E] to-[#121212] p-3 sm:p-4 text-left border border-white/5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-white bg-white/10 px-1.5 sm:px-2 py-0.5 rounded border border-white/20">
                EXPLAINER
              </span>
              <Sparkles size={13} className="text-white animate-pulse shrink-0" />
            </div>

            <p className="font-extrabold text-white text-xs sm:text-sm line-clamp-3 leading-snug tracking-tight break-words font-display">
              {show.title}
            </p>

            <span className="text-[10px] text-zinc-400 font-bold font-mono">
              {show.year || "2026"}
            </span>
          </div>
        )}

        {/* Hover Overlay with Centered Manga Play Button */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-3">
          <span className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white text-black flex items-center justify-center shadow-2xl border-2 border-white transform scale-90 group-hover:scale-100 transition-transform duration-300">
            <Play size={18} fill="black" className="ml-0.5 text-black" />
          </span>
        </div>

        {/* TOP CORNER BADGES ROW */}
        <div className="absolute top-2 left-2 right-2 z-10 flex items-start justify-between gap-1 pointer-events-none">
          {/* TOP-LEFT BADGE */}
          {customBadges ? (
            customBadges.topLeft?.enabled && customBadges.topLeft?.text ? (
              <AutoFitBadge
                text={formatCustomBadge(customBadges.topLeft.text, true)}
                badgeClassName="bg-black/90 border-white/25 text-white"
              />
            ) : <div />
          ) : (
            latestEpNum !== undefined && latestEpNum > 0 ? (
              <AutoFitBadge
                text={`EP ${latestEpNum}${latestEpQuality ? ` • ${latestEpQuality}` : ""}`}
                badgeClassName="bg-black/90 border-white/25 text-white"
                textClassName="text-white"
              />
            ) : <div />
          )}

          {/* TOP-RIGHT BADGE */}
          {customBadges ? (
            customBadges.topRight?.enabled && customBadges.topRight?.text ? (
              <AutoFitBadge
                text={formatCustomBadge(customBadges.topRight.text)}
                badgeClassName="bg-white text-black border-black font-extrabold shadow-sm"
              />
            ) : <div />
          ) : (
            showTypeBadge ? (
              <AutoFitBadge
                text={seriesType}
                badgeClassName="bg-white text-black border-black font-extrabold shadow-sm"
              />
            ) : <div />
          )}
        </div>

        {/* BOTTOM BADGES ROW */}
        <div className="absolute bottom-2 left-2 right-2 z-10 flex items-end justify-between gap-1 pointer-events-none">
          {/* BOTTOM-LEFT BADGE */}
          {customBadges?.bottomLeft?.enabled && customBadges?.bottomLeft?.text ? (
            <AutoFitBadge
              text={formatCustomBadge(customBadges.bottomLeft.text)}
              badgeClassName="bg-black/90 border-white/25 text-white"
            />
          ) : (
            (() => {
              const vis = (show.accessType || show.access || show.visibility || "public").toLowerCase().trim();
              const isXpCoins = vis === "xp_coins" || vis === "premium" || vis === "subscription";
              const xpCost = show.xpCost || 5;
              const isUnlocked = Boolean(show.isUnlocked);

              if (isUnlocked && isXpCoins) {
                return (
                  <AutoFitBadge
                    text="🔓 UNLOCKED"
                    badgeClassName="bg-black/90 border-white/30 text-emerald-300"
                  />
                );
              }

              return (
                <AutoFitBadge
                  text={isXpCoins ? `🔒 💠 ${xpCost} COINS` : "PUBLIC"}
                  badgeClassName="bg-black/90 border-white/25 text-white"
                />
              );
            })()
          )}

          {/* BOTTOM-RIGHT BADGE (AUTOMATIC FROM SERIES STATUS) */}
          <SeriesStatusBadge status={show.status} />
        </div>

        {/* Monochrome Rank Badge */}
        {rank !== undefined && (
          <span className="absolute bottom-2.5 left-2.5 z-10 grid h-6 w-6 place-items-center rounded-lg bg-white text-black font-black text-[11px] shadow-lg border border-black">
            #{rank}
          </span>
        )}
      </div>

      {/* Title & Metadata */}
      <p className="mt-2.5 text-xs sm:text-sm font-bold text-white group-hover:text-zinc-300 transition-colors line-clamp-2 leading-snug break-words font-display tracking-tight">
        {show.title}
      </p>
      <p className="text-[11px] text-zinc-400 font-medium mt-0.5 font-primary">
        {show.year || "2026"} · {displayGenre}
      </p>
    </Link>
  );
}

export function Row({ title, endpoint, href }: { title: string; endpoint: string; href?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: [endpoint],
    queryFn: async () => (await api.get<Show[]>(endpoint)).data
  });

  const items = Array.isArray(data) ? data : [];

  return (
    <section className="px-4 sm:px-8 py-6 w-full">
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2 font-display uppercase">
          <span>{title}</span>
          <span className="text-zinc-500 font-normal">──→</span>
        </h2>
        {href && (
          <Link
            className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1 group transition-colors font-primary"
            href={href}
          >
            See All{" "}
            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-3 pt-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="min-w-[160px] w-[160px] sm:min-w-[190px] sm:w-[190px] aspect-[2/3] rounded-2xl bg-[#0E0E0E] animate-pulse border border-white/5" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-3 pt-1 scrollbar-none">
          {items.map((s, idx) => (
            <Poster key={s._id} show={s} rank={s.trending ? idx + 1 : undefined} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#0E0E0E] p-6 text-center">
          <p className="text-xs font-medium text-zinc-400">No content available.</p>
        </div>
      )}
    </section>
  );
}

export function StatusSection({ status, title }: { status: "ongoing" | "completed" | "upcoming"; title: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["status-section", status],
    queryFn: async () => (await api.get<Show[]>(`/series?status=${status}`)).data
  });

  const rawItems = Array.isArray(data) ? data : [];
  const items = rawItems.filter(
    (s) => (s.status || "").toLowerCase().trim() === status.toLowerCase().trim()
  );

  return (
    <section className="px-4 sm:px-8 py-6 w-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2 font-display uppercase">
          <span className="h-2 w-2 rounded-full bg-white animate-status-dot" />
          <span>{title}</span>
          <span className="text-zinc-500 font-normal">──→</span>
        </h2>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 4xl:grid-cols-10 gap-3 sm:gap-4 lg:gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="w-full aspect-[2/3] rounded-2xl bg-[#0E0E0E] animate-pulse border border-white/5"
            />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 4xl:grid-cols-10 gap-3 sm:gap-4 lg:gap-6">
          {items.map((s) => (
            <Poster
              key={s._id}
              show={s}
              className="group w-full flex flex-col transition-all duration-300 relative select-none"
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#0E0E0E] p-6 text-center">
          <p className="text-xs font-medium text-zinc-400">
            No {status} series available.
          </p>
        </div>
      )}
    </section>
  );
}

export function ContinueWatchingRow() {
  const { data, isLoading } = useQuery({
    queryKey: ["continue-watching"],
    queryFn: async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("sri_token") : null;
        if (!token) return [];
        return (await api.get("/history/continue-watching")).data;
      } catch {
        return [];
      }
    }
  });

  const items = Array.isArray(data) ? data : [];
  if (!isLoading && items.length === 0) return null;

  return (
    <section className="px-4 sm:px-8 py-5 w-full">
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2 font-display uppercase">
          <TrendingUp size={18} className="text-white" />
          <span>Continue Watching</span>
          <span className="text-zinc-500 font-normal">──→</span>
        </h2>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-3 pt-1 scrollbar-none">
        {items.map((item: any) => (
          <Link
            key={item.episodeId || item._id}
            href={`/watch/${item.episodeId}`}
            className="group min-w-[220px] w-[220px] sm:min-w-[240px] sm:w-[240px] flex flex-col transition-all duration-300 relative select-none"
          >
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-[#0E0E0E] border-[1.5px] border-white/15 shadow-[2px_2px_0px_rgba(0,0,0,0.8)] group-hover:border-white group-hover:shadow-[4px_4px_0px_rgba(255,255,255,0.25)] transition-all duration-300">
              {item.thumbnail || item.seriesThumbnail ? (
                <img
                  src={image(item.thumbnail || item.seriesThumbnail)}
                  alt={item.title || "Continue Watching"}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-tr from-[#000000] to-[#121212] p-3 flex flex-col justify-between">
                  <span className="text-[9px] font-bold text-white">SRI EXPLAINER</span>
                  <p className="text-xs font-bold text-white line-clamp-2">{item.seriesTitle || item.title}</p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-transparent to-transparent flex items-center justify-center">
                <span className="h-9 w-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg border border-white transform scale-90 group-hover:scale-100 transition-transform">
                  <Play size={16} fill="black" className="ml-0.5" />
                </span>
              </div>
              {/* Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                <div
                  className="h-full bg-white"
                  style={{ width: `${Math.min(100, Math.max(10, item.progress || 45))}%` }}
                />
              </div>
            </div>
            <p className="mt-2.5 truncate text-xs font-bold text-white group-hover:text-zinc-300 transition-colors font-display">
              {item.seriesTitle || item.title}
            </p>
            <p className="text-[11px] text-zinc-400 font-medium font-mono">
              EP {item.episodeNumber || 1} · {item.duration || "12m left"}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function UpcomingRow() {
  const { data, isLoading } = useQuery({
    queryKey: ["upcoming"],
    queryFn: async () => {
      try {
        return (await api.get("/upcoming")).data;
      } catch {
        return { series: [], episodes: [] };
      }
    },
    staleTime: 30000
  });

  const seriesUpcoming = Array.isArray(data?.series) ? data.series : [];
  const episodesUpcoming = Array.isArray(data?.episodes) ? data.episodes : [];
  const allUpcoming = [...seriesUpcoming, ...episodesUpcoming];

  if (allUpcoming.length === 0) return null;

  return (
    <section className="shell py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/25 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span>UPCOMING</span>
          </div>
        </div>

        <Link href="/latest" className="text-xs sm:text-sm font-bold text-zinc-400 hover:text-white flex items-center gap-1 group font-primary">
          See all <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1">
          {[1, 2, 3].map((n) => (
            <div key={n} className="min-w-[220px] w-[220px] h-[280px] rounded-2xl bg-[#0E0E0E] animate-pulse border border-white/5" />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none">
          {allUpcoming.map((item: any) => {
            if (item.type === "series" || (!item.number && !item.seriesId)) {
              return <Poster key={item._id} show={item} />;
            }
            return <UpcomingCard key={item._id} item={item} />;
          })}
        </div>
      )}
    </section>
  );
}

export function UpcomingMarquee({ text }: { text: string }) {
  const displayText = text.endsWith("•") ? text : `${text} • `;
  return (
    <div className="w-full overflow-hidden bg-black/90 border-t border-b border-white/15 py-1 select-none">
      <div className="animate-marquee whitespace-nowrap text-[10px] font-black uppercase text-zinc-300 tracking-wider font-mono">
        <span className="inline-block px-3">{displayText}</span>
        <span className="inline-block px-3">{displayText}</span>
        <span className="inline-block px-3">{displayText}</span>
        <span className="inline-block px-3">{displayText}</span>
      </div>
    </div>
  );
}

export function UpcomingCard({ item }: { item: any }) {
  const targetDate = item.scheduledReleaseAt || item.releaseDate;
  const marqueeMsg = item.upcomingDisplayMessage?.trim() || `EPISODE ${item.number || 1} IS UPCOMING • RELEASES SOON •`;

  return (
    <Link
      href={`/watch/${item._id}`}
      className="group min-w-[220px] w-[220px] sm:min-w-[250px] sm:w-[250px] flex flex-col bg-[#0E0E0E] rounded-2xl overflow-hidden border-[1.5px] border-white/15 shadow-[2px_2px_0px_rgba(0,0,0,0.8)] hover:border-white hover:shadow-[4px_4px_0px_rgba(255,255,255,0.25)] transition-all duration-300 select-none"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-black">
        {item.thumbnail ? (
          <img
            src={image(item.thumbnail)}
            alt={item.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="h-full w-full grid place-items-center bg-[#0E0E0E] p-4 text-center">
            <span className="font-bold text-zinc-400 text-xs">{item.title}</span>
          </div>
        )}
        {/* Subtle Dark Overlay */}
        <div className="absolute inset-0 bg-black/25 backdrop-blur-[1px] pointer-events-none" />

        {/* Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
          <span className="rounded-full bg-white text-black px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-md">
            {item.number ? `EPISODE ${item.number}` : "UPCOMING"}
          </span>
          <span className="rounded-full bg-black/80 border border-white/30 text-white px-2 py-0.5 text-[8px] font-extrabold uppercase">
            UPCOMING
          </span>
        </div>

        {/* Live Countdown Overlay */}
        {targetDate && (
          <div className="absolute bottom-2 left-2 right-2 z-10 bg-black/85 backdrop-blur-md rounded-xl p-1.5 border border-white/15 text-center">
            <LiveCountdown targetDate={targetDate} compact={true} />
          </div>
        )}
      </div>

      {/* Infinite Loop Marquee Announcement */}
      <UpcomingMarquee text={marqueeMsg} />

      <div className="p-3.5 flex flex-col flex-1 space-y-1.5">
        <p className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-zinc-300 transition-colors font-display">
          {item.seriesTitle ? `${item.seriesTitle} - Ep ${item.number}` : item.title}
        </p>
        <p className="text-[11px] text-zinc-400 line-clamp-2 flex-1">{item.description || "Coming soon to Sri Explainer."}</p>
      </div>
    </Link>
  );
}


