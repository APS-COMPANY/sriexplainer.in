"use client";

import { useQuery } from "@tanstack/react-query";
import { api, image } from "../../lib/api";
import Link from "next/link";
import { History, Play, RotateCcw } from "lucide-react";

export default function HistoryPage() {
  const { data: rawHistory, isLoading } = useQuery({
    queryKey: ["history-page"],
    queryFn: async () => {
      const res = await api.get("/history");
      return res.data;
    },
  });

  const historyItems = Array.isArray(rawHistory)
    ? rawHistory
    : Array.isArray(rawHistory?.history)
    ? rawHistory.history
    : [];

  return (
    <main className="shell py-8 space-y-6 min-h-[75vh] select-none">
      <div className="flex items-center gap-3 border-b border-white/15 pb-4">
        <div className="p-3 rounded-2xl bg-white text-black shadow-md border border-white">
          <History size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white font-display uppercase tracking-tight">Watch History</h1>
          <p className="text-xs text-zinc-400 font-primary">Continue watching where you left off</p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-zinc-400 font-semibold font-mono">Loading your watch history...</div>
      ) : !historyItems || historyItems.length === 0 ? (
        <div className="p-12 text-center space-y-4 max-w-md mx-auto my-12 border-[1.5px] border-white/15 bg-[#0E0E0E] rounded-3xl shadow-[3px_3px_0px_rgba(0,0,0,0.8)]">
          <RotateCcw size={48} className="text-zinc-500 mx-auto" />
          <h2 className="text-xl font-black text-white font-display">No Watch History Yet</h2>
          <p className="text-xs text-zinc-400 font-primary">
            Start watching story explainers and episodes to track your watch position.
          </p>
          <Link
            href="/"
            className="manga-btn-primary inline-block px-6 py-2.5 rounded-full bg-white text-black font-extrabold text-xs shadow-[2px_2px_0px_rgba(255,255,255,0.25)] font-display"
          >
            Explore Episodes
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {historyItems.map((item: any) => {
            const ep = item.episode || {};
            const epId = ep.id || ep._id || item.episodeId || item.epId || item.id;
            const title = ep.title || item.episodeTitle || item.title || "Episode";
            const epNum = ep.number || item.episodeNumber || item.number || 1;
            const thumb = ep.thumbnail || item.episodeThumbnail || item.thumbnail || item.seriesThumbnail || item.seriesBanner || "";
            const seriesTitle = ep.seriesTitle || ep.series?.title || item.seriesTitle || "Story Explainer";
            const progress = Math.round(Number(item.percentage ?? item.progress ?? ep.progress ?? 0));

            if (!epId) return null;

            return (
              <Link
                key={item.id || item._id || epId}
                href={`/watch/${epId}`}
                className="group relative flex flex-col rounded-2xl bg-[#0E0E0E] border-[1.5px] border-white/15 overflow-hidden hover:border-white transition-all shadow-[2px_2px_0px_rgba(0,0,0,0.8)] hover:shadow-[4px_4px_0px_rgba(255,255,255,0.25)]"
              >
                <div className="aspect-video relative w-full overflow-hidden bg-black">
                  {thumb ? (
                    <img
                      src={image(thumb)}
                      alt={title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#0E0E0E] text-zinc-500 font-bold text-xs">
                      No Preview
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center shadow-xl border border-white">
                      <Play size={18} fill="black" className="ml-0.5" />
                    </div>
                  </div>
                  {/* Progress Bar overlay */}
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                    <div
                      className="h-full bg-white"
                      style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
                    />
                  </div>
                </div>
                <div className="p-3.5 space-y-1">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider font-mono">
                    {seriesTitle}
                  </p>
                  <h3 className="font-bold text-white text-xs truncate group-hover:text-zinc-300 transition-colors font-display">
                    Episode {epNum}: {title}
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-mono">
                    {progress >= 90 ? "Completed" : `${progress}% watched`}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
