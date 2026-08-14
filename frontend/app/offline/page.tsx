"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  WifiOff,
  Download,
  Play,
  RefreshCw,
  Sparkles,
  Film,
  CheckCircle2,
  HardDrive,
  Tv
} from "lucide-react";
import {
  getAllOfflineEpisodes,
  getStorageUsageMb,
  OfflineEpisode
} from "../../lib/offline-storage";
import { image } from "../../lib/api";

export default function OfflinePage() {
  const [downloads, setDownloads] = useState<OfflineEpisode[]>([]);
  const [storageMb, setStorageMb] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    getAllOfflineEpisodes().then((items) => setDownloads(items)).catch(() => {});
    getStorageUsageMb().then((mb) => setStorageMb(mb)).catch(() => {});

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRetry = () => {
    setChecking(true);
    setTimeout(() => {
      if (navigator.onLine) {
        window.location.href = "/";
      } else {
        setChecking(false);
      }
    }, 1000);
  };

  return (
    <main className="shell py-8 min-h-screen flex flex-col justify-start items-center select-none space-y-8">
      {/* Offline Downloaded Episodes Grid (Shown First) */}
      {downloads.length > 0 ? (
        <div className="w-full max-w-5xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/15 pb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white border border-white/20 text-[11px] font-black uppercase tracking-wider font-mono">
                🔴 OFFLINE MODE ACTIVE
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2 mt-1 font-display uppercase">
                <Download size={24} className="text-white" /> My Downloaded Videos ({downloads.length})
              </h1>
            </div>
            <button
              onClick={handleRetry}
              disabled={checking}
              className="px-5 py-2.5 rounded-full bg-[#141414] border border-white/15 hover:border-white text-white font-bold text-xs transition-all flex items-center gap-1.5 font-mono"
            >
              <RefreshCw size={14} className={checking ? "animate-spin text-white" : ""} />
              {checking ? "Checking..." : "Reconnect"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {downloads.map((ep) => (
              <div
                key={ep.episodeId}
                className="group relative flex flex-col rounded-3xl bg-[#0E0E0E] border-[1.5px] border-white/15 overflow-hidden hover:border-white transition-all duration-300 shadow-[2px_2px_0px_rgba(0,0,0,0.8)]"
              >
                <div className="aspect-video relative w-full overflow-hidden bg-black">
                  {ep.thumbnail ? (
                    <img
                      src={image(ep.thumbnail)}
                      alt={ep.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#141414] text-zinc-500 font-bold text-xs font-mono">
                      Episode {ep.number || 1}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity" />

                  <span className="absolute top-3 left-3 rounded-full bg-black/80 border border-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1 shadow-lg font-mono">
                    <CheckCircle2 size={11} /> Ready Offline
                  </span>

                  <Link
                    href={`/watch/${ep.episodeId}`}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="h-12 w-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                      <Play size={20} fill="black" className="ml-0.5" />
                    </div>
                  </Link>
                </div>

                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block font-mono">
                      {ep.seriesTitle}
                    </span>
                    <h3 className="font-black text-white text-xs sm:text-sm line-clamp-2 mt-0.5 font-display">
                      Episode {ep.number || 1}: {ep.title}
                    </h3>
                  </div>

                  <Link
                    href={`/watch/${ep.episodeId}`}
                    className="w-full py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-black text-center shadow-[2px_2px_0px_rgba(255,255,255,0.25)] hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 mt-2 font-display uppercase tracking-wider"
                  >
                    <Play size={13} fill="currentColor" /> Watch Offline Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Netflix-style Offline Hero Card when 0 downloads exist */
        <div className="w-full max-w-3xl rounded-3xl bg-[#0E0E0E] border-[1.5px] border-white/15 p-8 sm:p-12 text-center space-y-6 shadow-[3px_3px_0px_rgba(0,0,0,0.8)] relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="h-20 w-20 rounded-3xl bg-white/10 border border-white/20 text-white grid place-items-center mx-auto shadow-2xl">
              <WifiOff size={40} />
            </div>
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/10 text-white border border-white/20 text-xs font-black uppercase tracking-wider font-mono">
              🔴 NO INTERNET CONNECTION
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight font-display uppercase">
              You Are Currently Offline
            </h1>
            <p className="text-zinc-300 text-sm sm:text-base max-w-lg mx-auto leading-relaxed font-primary">
              No offline downloaded episodes found. Connect to network and download episodes to watch without internet.
            </p>
            <div className="pt-4 flex items-center justify-center gap-4 font-mono">
              <button
                onClick={handleRetry}
                disabled={checking}
                className="px-8 py-3.5 rounded-full bg-white text-black hover:bg-zinc-200 font-black text-sm shadow-[2px_2px_0px_rgba(255,255,255,0.25)] transition-all flex items-center gap-2 font-display uppercase tracking-wider"
              >
                <RefreshCw size={16} className={checking ? "animate-spin text-black" : ""} />
                {checking ? "Checking Network..." : "Try Reconnecting"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
