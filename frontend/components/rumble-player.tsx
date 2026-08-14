"use client";

import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, ShieldCheck, Maximize, Minimize } from "lucide-react";

interface RumblePlayerProps {
  embedUrl: string;
  videoBlobUrl?: string;
  isOfflinePlay?: boolean;
  title?: string;
  startPosition?: number; // Start offset in seconds
  posterUrl?: string;
  onPlayStart?: () => void;
  onProgress?: (position: number, percentage: number) => void;
  onEnded?: () => void;
}

// Utility function to format Rumble embed URL with strict parameters
export function formatRumbleEmbedUrl(rawUrl: string, startSec: number = 0, autoPlay: boolean = false): string {
  if (!rawUrl || !rawUrl.trim()) return "";
  try {
    let cleanUrl = rawUrl.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = `https://${cleanUrl}`;
    }
    const u = new URL(cleanUrl);

    // Set parameters
    u.searchParams.set("autoplay", autoPlay ? "1" : "0");
    u.searchParams.set("auto", autoPlay ? "1" : "0");
    u.searchParams.set("rel", "0");
    u.searchParams.set("related", "0");
    u.searchParams.set("next", "0");
    u.searchParams.set("playlist", "0");
    u.searchParams.set("api", "1");

    if (startSec > 0) {
      u.searchParams.set("start", String(Math.round(startSec)));
    }

    return u.toString();
  } catch {
    const connector = rawUrl.includes("?") ? "&" : "?";
    let formatted = `${rawUrl}${connector}autoplay=${autoPlay ? "1" : "0"}&auto=${autoPlay ? "1" : "0"}&rel=0&related=0&next=0&playlist=0&api=1`;
    if (startSec > 0) {
      formatted += `&start=${Math.round(startSec)}`;
    }
    return formatted;
  }
}

export function RumblePlayer({
  embedUrl,
  videoBlobUrl,
  isOfflinePlay,
  title = "Video Player",
  startPosition = 0,
  posterUrl,
  onPlayStart,
  onProgress,
  onEnded
}: RumblePlayerProps) {
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hasStarted, setHasStarted] = useState<boolean>(!onPlayStart);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  // Track Fullscreen state change
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const elem = containerRef.current;
    if (!elem) return;
    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  // Initialize formatted iframe URL
  useEffect(() => {
    if (!embedUrl) return;
    if (onPlayStart && !hasStarted) {
      setCurrentUrl("");
      return;
    }
    const formatted = formatRumbleEmbedUrl(embedUrl, startPosition, hasStarted);
    setCurrentUrl(formatted);
    setIsFinished(false);
  }, [embedUrl, startPosition, hasStarted, onPlayStart]);

  const handleStartPlay = () => {
    setHasStarted(true);
    const formatted = formatRumbleEmbedUrl(embedUrl, startPosition, true);
    setCurrentUrl(formatted);
    if (onPlayStart) {
      onPlayStart();
    }
  };

  // Listen for iframe postMessage events (e.g. Rumble API ended event)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        let msg = event.data;
        if (typeof msg === "string") {
          try {
            msg = JSON.parse(msg);
          } catch {}
        }

        if (
          msg?.event === "ended" ||
          msg?.event === "finish" ||
          msg?.event === "completed" ||
          msg?.state === "ended" ||
          msg === "ended"
        ) {
          console.log("[Rumble Player]: Playback ended event received. Stopping autoplay and showing Replay overlay.");
          setIsFinished(true);
          if (onEnded) onEnded();
        }
      } catch (err) {
        // Ignore non-json window postMessage events
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onEnded]);

  // Replay action: Reloads ONLY the exact same video from 0 seconds
  const handleReplay = () => {
    setIsFinished(false);
    const cleanUrl = formatRumbleEmbedUrl(embedUrl, 0);
    setCurrentUrl("");
    setTimeout(() => {
      setCurrentUrl(cleanUrl);
    }, 100);
  };

  if (!embedUrl && !videoBlobUrl) {
    return (
      <div className="h-full w-full grid place-items-center bg-zinc-950 p-6 text-center">
        <div className="space-y-3">
          <Play size={48} className="text-rose-500 mx-auto" />
          <h3 className="text-xl font-bold text-white">Video Stream Unavailable</h3>
          <p className="text-zinc-400 text-xs max-w-sm mx-auto">
            No official Rumble URL attached for this episode yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      className="relative h-full w-full bg-black overflow-hidden group select-none video-player-container"
    >
      {/* Initial Play Overlay for explicit Play trigger */}
      {!hasStarted && onPlayStart && (
        <div
          onClick={handleStartPlay}
          className="absolute inset-0 z-40 bg-zinc-950/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 cursor-pointer group select-none animate-in fade-in duration-200"
        >
          {posterUrl && (
            <img
              src={posterUrl}
              alt={title}
              className="absolute inset-0 h-full w-full object-cover opacity-25 group-hover:opacity-35 transition-opacity"
            />
          )}
          <div className="relative z-10 space-y-4 max-w-sm font-primary">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-white text-black border-2 border-white/40 shadow-2xl flex items-center justify-center mx-auto group-hover:scale-110 active:scale-95 transition-all shadow-white/30">
              <Play size={36} className="fill-black translate-x-0.5" />
            </div>
            <div>
              <h4 className="text-white font-black text-base sm:text-xl drop-shadow tracking-tight line-clamp-1 font-display uppercase">{title}</h4>
              <p className="text-zinc-300 text-xs mt-1.5 font-bold drop-shadow flex items-center justify-center gap-1.5 font-mono">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping inline-block" /> Click to play episode
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Render HTML5 Video Tag for Local Offline Blobs OR Iframe when Online / Offline Playback */}
      {videoBlobUrl || (currentUrl && (currentUrl.startsWith("blob:") || currentUrl.includes(".mp4") || currentUrl.includes(".m3u8"))) ? (
        <video
          src={videoBlobUrl || currentUrl}
          controls
          autoPlay
          controlsList="nodownload noremoteplayback"
          onContextMenu={(e) => e.preventDefault()}
          className="h-full w-full object-contain bg-black pointer-events-auto"
          poster={posterUrl}
        />
      ) : currentUrl ? (
        <iframe
          ref={iframeRef}
          src={currentUrl}
          title={title}
          className="h-full w-full border-0 pointer-events-auto"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write"
          allowFullScreen
          referrerPolicy="origin"
        />
      ) : (
        <div className="h-full w-full flex flex-col items-center justify-center bg-[#000000] text-center p-6 space-y-4 border border-white/15 select-none">
          <div className="h-16 w-16 rounded-full bg-white/10 border border-white/20 text-white grid place-items-center mx-auto shadow-2xl animate-pulse">
            <Play size={32} />
          </div>
          <div className="space-y-1.5 max-w-md font-mono">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white border border-white/20 text-xs font-black uppercase tracking-wider">
              ✓ OFFLINE DOWNLOAD ACTIVE
            </span>
            <h3 className="text-lg font-black text-white mt-1 font-display uppercase">{title}</h3>
          </div>
        </div>
      )}

      {/* Top-Right SRI EXPLAINER Watermark Badge & Dedicated Zoom/Fullscreen Button */}
      <div className="absolute top-2 right-2 xs:top-3 xs:right-3 sm:top-4 sm:right-4 z-50 flex items-center gap-1.5 sm:gap-2 pointer-events-auto select-none opacity-90 hover:opacity-100 transition-all max-w-[65%] font-mono">
        <div className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-black/90 border border-white/20 backdrop-blur-md flex items-center gap-1.5 sm:gap-2 shadow-2xl shrink min-w-0">
          <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-white animate-pulse shrink-0" />
          <span className="text-[9px] xs:text-[10px] sm:text-xs font-black text-white tracking-widest uppercase truncate font-display">
            SRI EXPLAINER
          </span>
        </div>
        <button
          onClick={toggleFullscreen}
          title="Fullscreen Zoom"
          className="p-1.5 sm:p-2 rounded-full bg-black/90 border border-white/20 hover:bg-white hover:text-black text-white transition-all backdrop-blur-md shadow-2xl active:scale-95 flex items-center justify-center shrink-0"
        >
          {isFullscreen ? <Minimize className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Maximize className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
        </button>
      </div>

      {/* Fullscreen & Standard Mode Bottom-Right Cover: Auto-adjustable for Mobile, PC & Zoom */}
      <div
        className={`absolute bottom-0 right-0 z-50 flex items-center justify-center bg-black border-t border-l border-white/15 select-none shadow-2xl transition-all ${
          isFullscreen
            ? "h-8 xs:h-9 sm:h-10 w-[115px] xs:w-[130px] sm:w-[150px] rounded-tl-lg sm:rounded-tl-xl px-2.5 sm:px-3"
            : "h-7 xs:h-8 sm:h-10 w-[105px] xs:w-[125px] sm:w-[148px] rounded-tl-lg sm:rounded-tl-xl px-2 sm:px-3"
        }`}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="text-[8px] xs:text-[9px] sm:text-xs font-black text-white tracking-widest uppercase flex items-center gap-1 sm:gap-1.5 drop-shadow truncate font-mono">
          <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-white animate-pulse shrink-0" />
          SRI EXPLAINER
        </span>
      </div>

      {/* Centered Replay Button Overlay when Video Finishes */}
      {isFinished && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md p-6 flex flex-col justify-center items-center text-center animate-in fade-in duration-300">
          <div className="space-y-4 max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <ShieldCheck size={14} /> Playback Completed
            </div>
            <h3 className="text-xl font-black text-white">Episode Finished</h3>
            <p className="text-xs text-zinc-400">
              Click below to replay this episode from the beginning.
            </p>
            <button
              onClick={handleReplay}
              className="mt-2 px-8 py-3.5 rounded-full brand-gradient brand-glow text-sm font-black text-white flex items-center justify-center gap-2 shadow-2xl hover:scale-105 active:scale-95 transition-all mx-auto"
            >
              <RotateCcw size={18} /> Replay Episode
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
