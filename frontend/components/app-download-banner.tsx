"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Smartphone, Download, Sparkles, X, ShieldCheck, Zap, Bell } from "lucide-react";

export function AppDownloadPromoCard() {
  const downloadUrl = "https://github.com/APS-COMPANY/sriexplainer.in/releases/download/v1.2.5/SriExplainer.apk";

  return (
    <div className="shell my-10">
      <div className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-br from-[#120D1D] via-[#0E0E12] to-[#0A0A0A] p-6 sm:p-10 shadow-[0_12px_40px_rgba(168,85,247,0.15)]">
        {/* Glow background decorative effects */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-600/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-pink-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Left info column */}
          <div className="space-y-4 max-w-2xl text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-black tracking-wider uppercase">
              <Sparkles size={14} className="text-purple-400 animate-pulse" />
              <span>Official Android App • v1.2.5</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight font-display">
              Stream Faster in 4K HDR on the{" "}
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
                Sri Explainer Mobile App
              </span>
            </h2>

            <p className="text-sm sm:text-base text-zinc-300 font-primary leading-relaxed">
              Enjoy cinema-grade Tamil anime breakdowns and web series with instant episode notifications, offline video caching, and native player acceleration.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-300 font-medium">
                <Zap size={13} className="text-amber-400" />
                <span>Zero-Buffer Playback</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-300 font-medium">
                <Bell size={13} className="text-purple-400" />
                <span>Instant Episode Alerts</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-300 font-medium">
                <ShieldCheck size={13} className="text-emerald-400" />
                <span>Safe & Direct APK</span>
              </span>
            </div>
          </div>

          {/* Right action column */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-3 w-full lg:w-auto shrink-0">
            <a
              href={downloadUrl}
              className="w-full sm:w-auto lg:w-64 py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-[length:200%_auto] hover:bg-right transition-all duration-500 text-white font-extrabold text-sm uppercase tracking-wider font-display flex items-center justify-center gap-3 shadow-[0_6px_25px_rgba(168,85,247,0.4)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download size={18} />
              <span>Download APK (v1.2.5)</span>
            </a>

            <Link
              href="/download"
              className="w-full sm:w-auto lg:w-64 py-3.5 px-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 text-zinc-200 hover:text-white font-bold text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 transition-all"
            >
              <Smartphone size={15} />
              <span>All App Downloads</span>
            </Link>

            <span className="text-[11px] text-zinc-400 font-mono text-center">
              22.1 MB • Android 7.0+ • Free Direct APK
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppDownloadFloatingBar() {
  const [dismissed, setDismissed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isDismissed = localStorage.getItem("sri_app_promo_dismissed_v1.2.5");
    if (!isDismissed) {
      setDismissed(false);
    }

    const checkMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsMobile(checkMobile);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("sri_app_promo_dismissed_v1.2.5", "true");
    }
  };

  if (dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-40 max-w-md w-[calc(100%-2rem)] sm:w-auto">
      <div className="bg-[#100D1A]/95 border border-purple-500/30 rounded-2xl p-3.5 sm:p-4 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white shrink-0 shadow-sm">
            <Smartphone size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white font-display uppercase tracking-wide truncate">
                Sri Explainer Android
              </span>
              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold">
                v1.2.5
              </span>
            </div>
            <p className="text-[11px] text-zinc-300 truncate font-primary">
              Watch Tamil series in 4K HDR without lag
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 font-mono">
          <a
            href="https://github.com/APS-COMPANY/sriexplainer.in/releases/download/v1.2.5/SriExplainer.apk"
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-extrabold text-xs uppercase tracking-wider hover:opacity-95 active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
          >
            <Download size={13} />
            <span>Get APK</span>
          </a>

          <button
            onClick={handleDismiss}
            aria-label="Dismiss app banner"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
