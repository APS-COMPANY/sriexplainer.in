"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Clock, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import { LiveCountdown, calculateTimeRemaining } from "./live-countdown";

export function ScheduledBanner() {
  const { data: upcomingEpisodes = [] } = useQuery({
    queryKey: ["upcoming-scheduled-episodes"],
    queryFn: async () => {
      const res = await api.get("/episodes?upcoming=true");
      return Array.isArray(res.data) ? res.data : [];
    },
    refetchInterval: 60000
  });

  // Filter for genuine future scheduled episodes
  const futureEpisodes = upcomingEpisodes
    .filter((ep: any) => ep.scheduledReleaseAt && !calculateTimeRemaining(ep.scheduledReleaseAt).isReleased)
    .sort((a: any, b: any) => new Date(a.scheduledReleaseAt).getTime() - new Date(b.scheduledReleaseAt).getTime());

  if (futureEpisodes.length === 0) return null;

  const nextEp = futureEpisodes[0];

  return (
    <div className="w-full bg-[#0E0E0E] border-y border-white/15 py-2.5 px-4 overflow-hidden select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Live Badge */}
        <div className="flex items-center gap-2 text-white shrink-0 font-black text-xs uppercase tracking-wider font-mono">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          <span>UPCOMING RELEASE</span>
        </div>

        {/* Looping Marquee / Text */}
        <div className="flex-1 overflow-hidden relative font-bold text-xs text-white">
          <div className="whitespace-nowrap flex items-center gap-6 animate-marquee font-primary">
            <span className="flex items-center gap-2">
              <Sparkles size={13} className="text-white" />
              <span className="text-zinc-400">Next Episode:</span>
              <span className="text-white font-extrabold font-display">{nextEp.seriesTitle || "Anime Series"} - Episode {nextEp.number}</span>
            </span>

            <span className="text-white/30">•</span>

            <div className="flex items-center gap-2 font-mono">
              <span className="text-zinc-400">Releases In:</span>
              <LiveCountdown targetDate={nextEp.scheduledReleaseAt} compact={true} />
            </div>

            <span className="text-white/30">•</span>

            <span className="flex items-center gap-2">
              <Sparkles size={13} className="text-white" />
              <span className="text-zinc-400">Next Episode:</span>
              <span className="text-white font-extrabold font-display">{nextEp.seriesTitle || "Anime Series"} - Episode {nextEp.number}</span>
            </span>
          </div>
        </div>

        {/* Watch/View Link */}
        {nextEp.seriesSlug && (
          <Link
            href={`/series/${nextEp.seriesSlug}`}
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-black font-extrabold text-[11px] hover:bg-zinc-200 transition-colors shrink-0 shadow-sm font-mono uppercase"
          >
            <span>View Series</span>
          </Link>
        )}
      </div>
    </div>
  );
}
