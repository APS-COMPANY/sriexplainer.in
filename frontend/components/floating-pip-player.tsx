"use client";

import { usePathname, useRouter } from "next/navigation";
import { usePip } from "./pip-context";
import { RumblePlayer } from "./rumble-player";
import { X, Maximize2, ChevronDown, ChevronUp, Play } from "lucide-react";

export function FloatingPipPlayer() {
  const pathname = usePathname();
  const router = useRouter();
  const { activeEpisode, isPipActive, isMinimized, closePip, toggleMinimize } = usePip();

  if (!isPipActive || !activeEpisode) return null;

  // Don't render floating player if user is currently on the full watch page for this episode
  if (pathname === `/watch/${activeEpisode.id}`) return null;

  const handleExpand = () => {
    router.push(`/watch/${activeEpisode.id}`);
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] bg-[#0E0E0E] border-[1.5px] border-white/20 backdrop-blur-xl shadow-[4px_4px_0px_rgba(0,0,0,0.9)] rounded-3xl overflow-hidden animate-in slide-in-from-bottom duration-300 transition-all max-w-[calc(100vw-2rem)]">
      {/* Header Controls Bar */}
      <div className="flex items-center justify-between gap-3 bg-[#000000] px-4 py-2.5 border-b border-white/15 select-none">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="h-2 w-2 rounded-full bg-white animate-pulse shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider truncate font-mono">
              {activeEpisode.seriesTitle || "Sri Explainer"}
            </p>
            <p className="text-xs font-black text-white truncate leading-tight font-display">
              {activeEpisode.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 text-zinc-300">
          <button
            onClick={toggleMinimize}
            title={isMinimized ? "Expand Player" : "Minimize Player"}
            className="p-1.5 rounded-full hover:bg-white/10 hover:text-white transition-colors"
          >
            {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          <button
            onClick={handleExpand}
            title="Expand to Full Page"
            className="p-1.5 rounded-full hover:bg-white/10 hover:text-white transition-colors"
          >
            <Maximize2 size={15} />
          </button>

          <button
            onClick={closePip}
            title="Close Player"
            className="p-1.5 rounded-full hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Embedded Video Body */}
      {!isMinimized && (
        <div className="w-[82vw] max-w-[380px] sm:w-[360px] md:w-[400px] aspect-video bg-black relative">
          <RumblePlayer
            embedUrl={activeEpisode.embedUrl}
            title={activeEpisode.title}
            startPosition={activeEpisode.startPosition || 0}
          />
        </div>
      )}

      {/* Compact Minimized State */}
      {isMinimized && (
        <div
          onClick={toggleMinimize}
          className="px-4 py-2 text-xs font-bold text-zinc-300 hover:text-white flex items-center justify-between gap-3 cursor-pointer bg-white/5 hover:bg-white/10 transition-colors font-mono"
        >
          <span className="flex items-center gap-2 text-white">
            <Play size={14} className="fill-white" /> Click to restore player
          </span>
        </div>
      )}
    </div>
  );
}
