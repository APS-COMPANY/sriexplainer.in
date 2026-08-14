"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Poster, Show } from "../../components/content";
import { Bookmark, Sparkles } from "lucide-react";
import Link from "next/link";

export default function WatchLaterPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["watch-later"],
    queryFn: async () => {
      try {
        const res = await api.get("/watch-later");
        return res.data;
      } catch {
        return [];
      }
    }
  });

  const list: Show[] = Array.isArray(data) ? data : [];

  return (
    <main className="shell py-8 space-y-6 min-h-[70vh] select-none">
      <div className="flex items-center justify-between border-b border-white/15 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/25 text-white text-xs font-black uppercase tracking-wider font-mono">
            <Bookmark size={13} /> Saved Collection
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2 font-display uppercase">
            Watch Later
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-primary">
            Series you have saved to watch at your convenience.
          </p>
        </div>

        <span className="text-xs font-black text-black bg-white px-3.5 py-1.5 rounded-full border border-white shadow-[2px_2px_0px_rgba(255,255,255,0.25)] font-mono">
          {list.length} Saved
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="aspect-[2/3] rounded-2xl bg-[#0E0E0E] animate-pulse border border-white/5" />
          ))}
        </div>
      ) : list.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {list.map((show) => (
            <Poster key={show._id} show={show} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border-[1.5px] border-white/15 bg-[#0E0E0E] p-12 text-center space-y-4 max-w-md mx-auto shadow-[3px_3px_0px_rgba(0,0,0,0.8)]">
          <Bookmark size={40} className="text-zinc-500 mx-auto" />
          <h3 className="text-base font-black text-white font-display">Your Watch Later list is empty</h3>
          <p className="text-xs text-zinc-400 font-primary">
            Save explainers and series to your Watch Later list while browsing!
          </p>
          <Link
            href="/latest"
            className="manga-btn-primary inline-block px-6 py-3 rounded-full bg-white text-black font-extrabold text-xs shadow-[2px_2px_0px_rgba(255,255,255,0.25)] font-display uppercase tracking-wider"
          >
            Explore Available Series
          </Link>
        </div>
      )}
    </main>
  );
}
