"use client";

export const dynamic = "force-dynamic";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, image } from "../../../lib/api";
import { Play, Plus, Check, Film, Sparkles, Layers, Gem, Clock, Lock, Bookmark } from "lucide-react";
import { Poster, Show, UpcomingMarquee } from "../../../components/content";
import { LiveCountdown } from "../../../components/live-countdown";
import { showSuccess, showWarning, showError } from "../../../components/notification-provider";
import { useState, useEffect } from "react";

export default function SeriesPage() {
  const { slug } = useParams<{ slug: string }>();
  const [isFavorited, setIsFavorited] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["series", slug],
    queryFn: async () => (await api.get(`/series/${slug}`)).data,
    enabled: !!slug
  });

  const { data: related } = useQuery({
    queryKey: ["related-series", slug],
    queryFn: async () => (await api.get<Show[]>("/series?limit=6")).data,
    enabled: !!slug
  });

  const targetSeriesId = data?.series?._id || data?.series?.id;

  // Check user favorites list
  const { data: userFavs, refetch: refetchFavs } = useQuery({
    queryKey: ["user-favorites"],
    queryFn: async () => {
      try {
        return (await api.get("/favorites")).data;
      } catch {
        return [];
      }
    },
    enabled: Boolean(targetSeriesId)
  });

  useEffect(() => {
    if (Array.isArray(userFavs) && targetSeriesId) {
      const isFav = userFavs.some((f: any) => f.id === targetSeriesId || f._id === targetSeriesId || f.seriesId === targetSeriesId);
      setIsFavorited(isFav);
    }
  }, [userFavs, targetSeriesId]);

  if (isLoading) {
    return (
      <main className="px-4 sm:px-8 py-20 w-full max-w-7xl mx-auto select-none">
        <div className="h-96 rounded-3xl bg-slate-900/50 animate-pulse border border-white/10" />
      </main>
    );
  }

  if (error || !data || !data.series) {
    return (
      <main className="px-4 sm:px-8 py-20 text-center select-none max-w-md mx-auto space-y-4">
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl space-y-4">
          <h1 className="text-2xl font-black text-white">Series Not Found</h1>
          <p className="text-zinc-400 text-xs leading-relaxed">The series you are looking for does not exist or has been removed.</p>
          <Link href="/latest" className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 font-extrabold text-white text-xs shadow-lg">
            Explore Latest
          </Link>
        </div>
      </main>
    );
  }

  const { series } = data;
  const episodes = Array.isArray(data.episodes) ? data.episodes : [];
  const relatedItems = Array.isArray(related) ? related : [];

  const isSeriesUpcoming = episodes.length === 0 && ((series.status || "").toLowerCase().trim() === "upcoming" || Boolean(series.isUpcoming));
  const isAdmin = Boolean(data.isAdmin);

  const handleFavoriteToggle = async () => {
    const sId = series._id || series.id;
    if (!sId) return;

    try {
      const res = await api.post(`/favorites/${sId}`);
      const isFav = Boolean(res.data?.favorited ?? res.data?.favorite);
      setIsFavorited(isFav);
      refetchFavs();
      showSuccess(isFav ? "Added to your favorites list!" : "Removed from favorites.");
    } catch (err: any) {
      if (err?.response?.status === 401) {
        showWarning("Please sign in to save series to your favorites.", "Sign in required");
      } else {
        showError(err?.response?.data?.message || "Failed to update favorites list.");
      }
    }
  };

  // LOCKED UPCOMING SERIES DISPLAY FOR NORMAL USERS
  if (isSeriesUpcoming && !isAdmin) {
    const upcomingCustomMsg = series.upcomingMessage?.trim() || "This series is coming soon.\nOfficial release coming soon.";

    return (
      <main className="min-h-screen pb-20 select-none">
        <section className="relative overflow-hidden border-b border-white/10 bg-[#030712] py-20 sm:py-28 grid place-items-center text-center">
          {series.banner && (
            <div className="absolute inset-0 z-0">
              <img
                src={image(series.banner)}
                alt={series.title}
                className="h-full w-full object-cover opacity-20 filter blur-2xl scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/80 to-transparent" />
            </div>
          )}

          <div className="relative z-10 max-w-3xl mx-auto px-4 space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 border border-rose-500/30 px-5 py-2 text-xs font-black text-rose-400 uppercase tracking-widest shadow-xl">
              <Sparkles size={16} className="animate-pulse text-rose-400" /> UPCOMING SERIES
            </div>

            {/* Poster / Logo / Title */}
            {series.logo ? (
              <div className="max-w-md mx-auto my-4">
                <img
                  src={image(series.logo)}
                  alt={series.title}
                  className="max-h-36 w-auto object-contain mx-auto filter drop-shadow-2xl"
                />
              </div>
            ) : (
              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-wide leading-tight drop-shadow-2xl">
                {series.title}
              </h1>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-[#94A3B8] font-bold tracking-wide">
              <span>{series.year || "2026"}</span>
              {series.creator && (
                <>
                  <span>•</span>
                  <span>Created by {series.creator}</span>
                </>
              )}
            </div>

            {/* Clean Admin Customized Upcoming Card Container */}
            <div className="rounded-3xl border border-rose-500/30 bg-gradient-to-b from-[#1F0A10]/90 via-[#0E0507]/90 to-[#080304]/95 p-8 sm:p-12 shadow-2xl backdrop-blur-2xl space-y-6 max-w-xl mx-auto text-center">
              <div className="h-14 w-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 grid place-items-center mx-auto shadow-inner">
                <Clock size={28} className="animate-pulse" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Coming Soon</h2>
              <div className="text-sm sm:text-base text-zinc-200 whitespace-pre-line leading-relaxed sm:leading-loose font-medium tracking-wide">
                {upcomingCustomMsg}
              </div>
            </div>

            <div className="pt-4">
              <Link
                href="/latest"
                className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-white text-black hover:bg-zinc-200 font-black text-xs shadow-[2px_2px_0px_rgba(255,255,255,0.25)] hover:scale-105 transition-all font-display uppercase tracking-wider font-mono"
              >
                Explore Available Series
              </Link>
            </div>
          </div>
        </section>

        {/* More to Explore Section */}
        {relatedItems.length > 0 && (
          <section className="px-4 sm:px-8 py-14 max-w-7xl mx-auto space-y-6">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">More to Explore</h2>
            <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none">
              {relatedItems
                .filter((x: Show) => x._id !== series._id)
                .slice(0, 6)
                .map((x: Show) => (
                  <Poster key={x._id} show={x} />
                ))}
            </div>
          </section>
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-20 select-none">
      {/* Hero Section with Ambient Backdrop Lighting */}
      <section className="relative overflow-hidden border-b border-white/10 bg-[#030712] py-14 sm:py-20">
        {/* Glow ambient graphics */}
        <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-purple-600/15 blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 -right-20 h-96 w-96 rounded-full bg-indigo-600/15 blur-[120px] pointer-events-none" />

        {series.banner && (
          <div className="absolute inset-0 z-0">
            <img
              src={image(series.banner)}
              alt={series.title}
              className="h-full w-full object-cover opacity-20 filter blur-2xl scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/80 to-transparent" />
          </div>
        )}

        <div className="px-4 sm:px-8 w-full max-w-7xl 3xl:max-w-[2200px] mx-auto relative z-10 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-xl bg-white text-black px-4 py-1.5 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_rgba(255,255,255,0.25)] border border-white font-mono">
              {series.status?.toUpperCase() || "ONGOING"}
            </span>
            <span className="rounded-xl bg-[#0E0E0E] border border-white/15 px-4 py-1.5 text-xs font-extrabold text-zinc-300 shadow-sm font-mono">
              {series.year || "2026"}
            </span>
            <span className="rounded-xl bg-[#0E0E0E] border border-white/15 px-4 py-1.5 text-xs font-extrabold text-zinc-300 flex items-center gap-2 shadow-sm font-mono">
              <Layers size={14} className="text-white" /> Episodes
            </span>
            <span className="rounded-xl bg-[#0E0E0E] border border-white/15 px-4 py-1.5 text-xs font-extrabold text-zinc-300 shadow-sm font-mono">
              {series.creator ? `Created by ${series.creator}` : "Creator not assigned"}
            </span>
          </div>

          {series.logo ? (
            <div className="max-w-md my-4">
              <img
                src={image(series.logo)}
                alt={series.title}
                className="max-h-32 w-auto object-contain filter drop-shadow-2xl"
              />
            </div>
          ) : (
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white font-display tracking-tight leading-tight sm:leading-[1.12] drop-shadow-2xl max-w-5xl">
              {series.title}
            </h1>
          )}

          <p className="max-w-3xl text-zinc-300 text-sm sm:text-base leading-relaxed tracking-normal font-normal pt-1 font-primary">
            {series.description}
          </p>

          {Array.isArray(series.genres) && series.genres.length > 0 && (
            <div className="flex flex-wrap gap-2.5 sm:gap-3 pt-2">
              {series.genres.map((g: string) => (
                <span
                  key={g}
                  className="rounded-full bg-[#0E0E0E] border border-white/15 px-4 py-1.5 text-xs font-bold text-zinc-300 backdrop-blur-xl hover:border-white transition-all shadow-sm tracking-wide font-primary"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-4">
            {episodes.length > 0 ? (
              <Link
                href={`/watch/${episodes[0]._id}`}
                className="px-8 py-4 font-black text-black bg-white flex items-center gap-2.5 rounded-full shadow-[3px_3px_0px_rgba(255,255,255,0.3)] hover:scale-105 transition-all text-sm font-display uppercase tracking-wider"
              >
                <Play size={18} fill="black" /> Start Watching Ep 1
              </Link>
            ) : (
              <button
                disabled
                className="flex items-center gap-2.5 rounded-full bg-[#0E0E0E] border border-white/15 px-7 py-4 font-bold text-zinc-500 text-sm cursor-not-allowed"
              >
                <Film size={18} /> No Episodes Uploaded Yet
              </button>
            )}

            <button
              onClick={handleFavoriteToggle}
              className={`flex items-center gap-2.5 rounded-full px-7 py-4 text-sm font-extrabold border transition-all shadow-sm ${
                isFavorited
                  ? "bg-white text-black border-white shadow-[2px_2px_0px_rgba(255,255,255,0.25)]"
                  : "bg-black/60 hover:bg-white hover:text-black text-zinc-200 border-white/20 hover:border-white"
              }`}
            >
              <Bookmark size={17} fill={isFavorited ? "currentColor" : "none"} />
              <span>{isFavorited ? "Saved to My List" : "Add to My List"}</span>
            </button>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-8 py-10 w-full max-w-7xl 3xl:max-w-[2200px] mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 font-display uppercase">
            <span>Episodes ({episodes.length})</span>
            <span className="text-zinc-500 font-normal">──→</span>
          </h2>
        </div>

        {episodes.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {episodes.map((e: any) => {
              const isUpcoming = Boolean(e.isUpcoming || (e.scheduledReleaseAt && new Date(e.scheduledReleaseAt).getTime() > Date.now()));
              const marqueeMsg = e.upcomingDisplayMessage?.trim() || `EPISODE ${e.number} IS UPCOMING • SCHEDULED RELEASE •`;

              return (
                <div
                  key={e._id}
                  className="w-full rounded-2xl border-[1.5px] border-white/15 bg-[#0E0E0E] shadow-[2px_2px_0px_rgba(0,0,0,0.8)] hover:border-white hover:shadow-[4px_4px_0px_rgba(255,255,255,0.25)] overflow-hidden transition-all duration-200"
                >
                  <Link
                    href={`/watch/${e._id}`}
                    className="group p-3 xs:p-4 sm:p-5 flex items-start sm:items-center justify-between gap-3 sm:gap-6 select-none"
                  >
                    {/* Main Horizontal Content: Thumbnail + Info */}
                    <div className="flex items-start sm:items-center gap-3 xs:gap-4 sm:gap-6 min-w-0 flex-1">
                      {/* Thumbnail with Proportional Scaling */}
                      <div className="relative w-24 xs:w-32 sm:w-44 md:w-48 lg:w-[220px] aspect-[16/10] overflow-hidden rounded-xl bg-black border border-white/10 shrink-0">
                        {e.thumbnail || series.thumbnail ? (
                          <img
                            src={image(e.thumbnail || series.thumbnail)}
                            alt={e.title}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="h-full w-full grid place-items-center bg-[#000000] text-[10px] sm:text-xs font-bold text-zinc-500">
                            Ep {e.number}
                          </div>
                        )}

                        <div className={`absolute inset-0 flex items-center justify-center transition-colors ${
                          isUpcoming ? "bg-black/60 backdrop-blur-[2px]" : "bg-black/40 group-hover:bg-black/20"
                        }`}>
                          {isUpcoming ? (
                            <span className="grid h-7 w-7 xs:h-8 xs:w-8 sm:h-10 sm:w-10 place-items-center rounded-full bg-white/20 border border-white/30 text-white shadow-lg">
                              <Clock className="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-5 sm:h-5" />
                            </span>
                          ) : (
                            <span className="grid h-7 w-7 xs:h-8 xs:w-8 sm:h-10 sm:w-10 place-items-center rounded-full bg-white text-black shadow-lg group-hover:scale-110 transition-transform">
                              <Play className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 ml-0.5" fill="black" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Episode Title & Details */}
                      <div className="min-w-0 flex-1 flex flex-col justify-center items-start text-left space-y-1 xs:space-y-1.5 sm:space-y-2">
                        <div className="flex items-center gap-1.5 xs:gap-2 flex-wrap">
                          <p className="text-[10px] xs:text-xs font-black text-zinc-300 uppercase tracking-widest font-mono">
                            Episode {e.number}
                          </p>
                          {isUpcoming && (
                            <span className="px-2 py-0.5 rounded-full bg-white/15 text-white text-[9px] xs:text-[10px] font-black uppercase tracking-wider border border-white/25">
                              UPCOMING
                            </span>
                          )}
                        </div>

                        {/* Full Title with Natural Multiline Wrap (No Truncation) */}
                        <p className="text-xs xs:text-sm sm:text-base lg:text-lg font-black text-white leading-snug tracking-wide group-hover:text-zinc-300 transition-colors break-words text-left font-display">
                          {e.title}
                        </p>

                        {isUpcoming ? (
                          <div className="pt-0.5 xs:pt-1 flex flex-col items-start">
                            <span className="text-[9px] xs:text-[10px] font-bold text-zinc-400 block mb-0.5 font-mono">Releases In:</span>
                            <LiveCountdown targetDate={e.scheduledReleaseAt} compact={true} />
                          </div>
                        ) : (
                          <div className="pt-0.5 xs:pt-1 flex items-center">
                            <span className="inline-flex items-center gap-1.5 xs:gap-2 rounded-full bg-white/10 border border-white/20 px-2.5 xs:px-3.5 sm:px-4 py-1 xs:py-1.5 text-[10px] xs:text-xs font-extrabold text-white group-hover:bg-white group-hover:text-black transition-all shadow-sm font-mono whitespace-nowrap">
                              <Play size={11} className="xs:w-3 xs:h-3 sm:w-3.5 sm:h-3.5" fill="currentColor" /> {e.duration || "Watch Episode"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Access / Pricing Badge */}
                    <div className="shrink-0 self-start sm:self-center flex items-center justify-end pl-1 sm:pl-2">
                      {isUpcoming ? (
                        <span className="inline-flex items-center gap-1 xs:gap-1.5 rounded-full bg-white/10 text-white border border-white/20 px-2.5 xs:px-3.5 sm:px-4 py-1 xs:py-1.5 sm:py-2 text-[10px] xs:text-xs font-extrabold uppercase tracking-wider shadow-sm font-mono whitespace-nowrap">
                          <Clock size={12} className="xs:w-3.5 xs:h-3.5" /> UPCOMING
                        </span>
                      ) : ((e.access || "free").toLowerCase() === "xp_coins" || (e.access || "free").toLowerCase() === "premium") ? (
                        e.isUnlocked ? (
                          <span className="inline-flex items-center gap-1 xs:gap-1.5 rounded-full bg-white/15 text-emerald-300 border border-white/25 px-2.5 xs:px-3.5 sm:px-4 py-1 xs:py-1.5 sm:py-2 text-[10px] xs:text-xs font-black uppercase tracking-wider shadow-sm font-mono whitespace-nowrap">
                            <span>🔓</span>
                            <span>UNLOCKED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 xs:gap-1.5 rounded-full bg-black/80 text-white border border-white/25 px-2.5 xs:px-3.5 sm:px-4 py-1 xs:py-1.5 sm:py-2 text-[10px] xs:text-xs font-black uppercase tracking-wider shadow-sm font-mono whitespace-nowrap">
                            <span>🔒 💠</span>
                            <span className="text-white font-black">{e.xpCost || 5} COINS</span>
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 xs:gap-1.5 rounded-full bg-white/10 text-white border border-white/20 px-2.5 xs:px-3.5 sm:px-4 py-1 xs:py-1.5 sm:py-2 text-[10px] xs:text-xs font-extrabold uppercase tracking-wider shadow-sm font-mono whitespace-nowrap">
                          FREE
                        </span>
                      )}
                    </div>
                  </Link>

                  {isUpcoming && (
                    <UpcomingMarquee text={marqueeMsg} />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-[#030712]/80 p-10 text-center text-zinc-400 text-xs font-medium">
            No episodes uploaded for this series yet.
          </div>
        )}
      </section>

      {/* More to Explore Section */}
      {relatedItems.length > 0 && (
        <section className="px-4 sm:px-8 py-10 w-full max-w-7xl 3xl:max-w-[2200px] mx-auto space-y-6">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">More to Explore</h2>
          <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none">
            {relatedItems
              .filter((x: Show) => x._id !== series._id)
              .slice(0, 6)
              .map((x: Show) => (
                <Poster key={x._id} show={x} />
              ))}
          </div>
        </section>
      )}
    </main>
  );
}
