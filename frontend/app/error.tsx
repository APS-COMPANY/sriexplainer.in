"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Download, WifiOff, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.warn("[Global App Error Catch]:", error);
  }, [error]);

  return (
    <main className="shell py-16 flex flex-col justify-center items-center min-h-[75vh] select-none text-center space-y-6">
      <div className="w-full max-w-xl rounded-3xl bg-[#0E0E0E] border-[1.5px] border-white/15 p-8 sm:p-12 space-y-6 shadow-[3px_3px_0px_rgba(0,0,0,0.8)] relative overflow-hidden">
        <div className="h-16 w-16 rounded-2xl bg-white/10 border border-white/20 text-white grid place-items-center mx-auto shadow-xl">
          <WifiOff size={32} />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-black uppercase tracking-wider font-mono">
            ⚡ OFFLINE MODE / RECONNECTION ACTIVE
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display uppercase">
            Sri Explainer Offline Mode
          </h1>
          <p className="text-zinc-300 text-xs sm:text-sm max-w-md mx-auto leading-relaxed font-primary">
            Network connection unavailable. You can watch all your downloaded episodes offline anytime.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 font-mono">
          <Link
            href="/downloads"
            className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white text-black hover:bg-zinc-200 font-black text-xs shadow-[2px_2px_0px_rgba(255,255,255,0.25)] hover:scale-105 transition-all flex items-center justify-center gap-2 font-display uppercase tracking-wider"
          >
            <Download size={16} /> Open My Downloads
          </Link>

          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-[#141414] border border-white/15 hover:border-white text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={15} /> Refresh Page
          </button>
        </div>
      </div>
    </main>
  );
}
