"use client";

import { useQuery } from "@tanstack/react-query";
import { api, image } from "../../lib/api";
import Link from "next/link";
import { ListPlus, Play, Film } from "lucide-react";

export default function MyListPage() {
  const { data: favorites, isLoading } = useQuery({
    queryKey: ["my-list-page"],
    queryFn: async () => (await api.get("/favorites")).data,
  });

  return (
    <main className="shell py-8 space-y-6 min-h-[75vh] select-none">
      <div className="flex items-center gap-3 border-b border-white/15 pb-4">
        <div className="p-3 rounded-2xl bg-white/10 border border-white/20 text-white">
          <ListPlus size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white font-display uppercase tracking-tight">My Watchlist</h1>
          <p className="text-xs text-zinc-400 font-primary">Series and stories you saved to watch later</p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-zinc-400 font-mono">Loading your watchlist...</div>
      ) : !favorites || favorites.length === 0 ? (
        <div className="rounded-3xl border-[1.5px] border-white/15 bg-[#0E0E0E] p-12 text-center space-y-4 max-w-md mx-auto my-12 shadow-[3px_3px_0px_rgba(0,0,0,0.8)]">
          <Film size={48} className="text-zinc-500 mx-auto" />
          <h2 className="text-xl font-black text-white font-display uppercase">Your Watchlist is Empty</h2>
          <p className="text-xs text-zinc-400 font-primary">
            Save your favorite series and story explainers to quick access them anytime.
          </p>
          <Link
            href="/latest"
            className="inline-block px-6 py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 font-black text-xs shadow-[2px_2px_0px_rgba(255,255,255,0.25)] hover:scale-105 transition-all font-display uppercase tracking-wider font-mono"
          >
            Explore Available Series
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {favorites.map((item: any) => {
            const series = item.series || item;
            return (
              <Link
                key={series.id || series._id}
                href={`/series/${series.slug}`}
                className="group relative flex flex-col rounded-2xl bg-[#0E0E0E] border-[1.5px] border-white/15 overflow-hidden hover:border-white transition-all shadow-[2px_2px_0px_rgba(0,0,0,0.8)]"
              >
                <div className="aspect-[2/3] relative w-full overflow-hidden bg-black">
                  {series.thumbnail ? (
                    <img
                      src={image(series.thumbnail)}
                      alt={series.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#141414] text-zinc-500 font-bold text-xs font-mono">
                      No Poster
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center shadow-xl">
                      <Play size={18} fill="currentColor" className="ml-0.5" />
                    </div>
                  </div>
                </div>
                <div className="p-3 space-y-1">
                  <h3 className="font-black text-white text-xs sm:text-sm line-clamp-2 leading-tight break-words group-hover:text-zinc-300 transition-colors font-display">
                    {series.title}
                  </h3>
                  <p className="text-[10px] text-zinc-400 truncate font-mono">
                    {series.genre || "Explainer"}
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
