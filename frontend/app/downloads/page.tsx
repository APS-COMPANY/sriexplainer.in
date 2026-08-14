"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Download,
  Play,
  Trash2,
  Lock,
  HardDrive,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Film,
  CheckCircle2
} from "lucide-react";
import {
  getAllOfflineEpisodes,
  removeOfflineEpisode,
  clearAllOfflineEpisodes,
  getStorageUsageMb,
  OfflineEpisode
} from "../../lib/offline-storage";
import { image } from "../../lib/api";
import { showSuccess, showWarning } from "../../components/notification-provider";

export default function DownloadsPage() {
  const [downloads, setDownloads] = useState<OfflineEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStorageMb, setTotalStorageMb] = useState<number>(0);

  const loadDownloads = async () => {
    setLoading(true);
    try {
      const items = await getAllOfflineEpisodes();
      setDownloads(items);
      const usage = await getStorageUsageMb();
      setTotalStorageMb(usage);
    } catch {
      setDownloads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDownloads();
  }, []);

  const handleDelete = async (episodeId: string, title: string) => {
    const success = await removeOfflineEpisode(episodeId);
    if (success) {
      showSuccess(`Deleted "${title}" from offline downloads.`);
      loadDownloads();
    } else {
      showWarning("Could not delete episode from offline storage.");
    }
  };

  const handleClearAll = async () => {
    if (downloads.length === 0) return;
    if (window.confirm("Are you sure you want to remove all offline downloaded episodes?")) {
      const success = await clearAllOfflineEpisodes();
      if (success) {
        showSuccess("All offline downloaded episodes removed.");
        loadDownloads();
      }
    }
  };

  return (
    <main className="shell py-8 space-y-8 min-h-[80vh] select-none">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border-[1.5px] border-white/15 bg-[#0E0E0E] p-6 sm:p-10 shadow-[3px_3px_0px_rgba(0,0,0,0.8)]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-black uppercase tracking-wider font-mono">
              <Download size={14} /> Encrypted Offline Downloads
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3 font-display uppercase">
              <span>My Downloads</span>
            </h1>
            <p className="text-zinc-300 text-xs sm:text-sm max-w-xl leading-relaxed font-primary">
              Watch your favorite story explainers offline without internet. All files are 100% encrypted in sandboxed private storage.
            </p>
          </div>

          {/* Storage Meter Widget */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0 font-mono">
            <div className="px-5 py-3.5 rounded-2xl bg-[#000000] border border-white/15 flex items-center gap-3.5 shadow-xl">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/20 text-white grid place-items-center">
                <HardDrive size={20} />
              </div>
              <div>
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Offline Storage</span>
                <span className="text-base font-black text-white flex items-center gap-1.5">
                  <span className="text-white font-bold">{totalStorageMb} MB</span>
                  <span className="text-xs text-zinc-400">used ({downloads.length} items)</span>
                </span>
              </div>
            </div>

            {downloads.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-5 py-3 rounded-full bg-rose-600/15 border border-rose-500/30 text-rose-300 hover:bg-rose-600 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg font-mono"
              >
                <Trash2 size={15} /> Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Security & DRM Assurance Bar */}
      <div className="p-4 rounded-2xl bg-[#0E0E0E] border border-white/15 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-300 font-mono">
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={18} className="text-white shrink-0" />
          <span><strong className="text-white">High-Level DRM Protection:</strong> Downloads are sandboxed & invisible in File Manager / Phone Storage.</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
          <Lock size={13} className="text-white" /> AES-128 Encrypted Sandboxed Storage
        </div>
      </div>

      {/* Downloads Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-64 rounded-3xl bg-[#0E0E0E] animate-pulse border border-white/15" />
          ))}
        </div>
      ) : downloads.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {downloads.map((ep) => (
            <div
              key={ep.episodeId}
              className="group relative flex flex-col rounded-3xl bg-[#0E0E0E] border-[1.5px] border-white/15 overflow-hidden hover:border-white transition-all duration-300 shadow-[2px_2px_0px_rgba(0,0,0,0.8)]"
            >
              {/* Thumbnail Container */}
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

                <span className="absolute top-3 left-3 rounded-full bg-black/80 border border-white/20 backdrop-blur-md px-3 py-1 text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1 shadow-lg font-mono">
                  <CheckCircle2 size={12} /> Downloaded ({ep.fileSizeMb || 120} MB)
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

              {/* Information */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block font-mono">
                    {ep.seriesTitle}
                  </span>
                  <h3 className="font-black text-white text-sm sm:text-base leading-snug group-hover:text-zinc-300 transition-colors line-clamp-2 mt-0.5 font-display">
                    Episode {ep.number || 1}: {ep.title}
                  </h3>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                  <Link
                    href={`/watch/${ep.episodeId}`}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-extrabold transition-all"
                  >
                    <Play size={13} fill="currentColor" /> Play Offline
                  </Link>

                  <button
                    onClick={() => handleDelete(ep.episodeId, ep.title)}
                    className="p-2 rounded-full bg-[#141414] border border-white/15 hover:bg-rose-600 hover:text-white text-zinc-400 transition-all"
                    title="Delete download"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border-[1.5px] border-white/15 bg-[#0E0E0E] p-12 text-center space-y-4 max-w-md mx-auto my-8 shadow-[3px_3px_0px_rgba(0,0,0,0.8)]">
          <div className="h-16 w-16 rounded-2xl bg-white/10 border border-white/20 text-white grid place-items-center mx-auto shadow-inner">
            <Download size={32} />
          </div>
          <h2 className="text-xl font-black text-white font-display uppercase">No Offline Downloads Yet</h2>
          <p className="text-xs text-zinc-400 leading-relaxed font-primary">
            Download your favorite story explainers to watch offline anywhere, anytime without internet connection.
          </p>
          <Link
            href="/latest"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black hover:bg-zinc-200 font-black text-xs shadow-[2px_2px_0px_rgba(255,255,255,0.25)] hover:scale-105 transition-all font-display uppercase tracking-wider"
          >
            <Film size={15} /> Explore Available Series
          </Link>
        </div>
      )}
    </main>
  );
}
