"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, RefreshCw, CheckCircle2 } from "lucide-react";

export function AdBlockDetector() {
  const [adBlockDetected, setAdBlockDetected] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let isBlocked = false;

    // DOMbait element trap (AdBlockers hide elements with ad class names)
    const bait = document.createElement("div");
    bait.className = "adsbygoogle ad-banner ad-placement sponsor-ad ad-unit";
    bait.style.position = "absolute";
    bait.style.left = "-9999px";
    bait.style.top = "-9999px";
    bait.style.height = "1px";
    bait.style.width = "1px";
    document.body.appendChild(bait);

    if (
      bait.offsetParent === null ||
      bait.offsetHeight === 0 ||
      bait.offsetLeft === 0 ||
      window.getComputedStyle(bait).display === "none" ||
      window.getComputedStyle(bait).visibility === "hidden"
    ) {
      isBlocked = true;
    }

    document.body.removeChild(bait);

    if (isBlocked) {
      setAdBlockDetected(true);
    }
  }, []);

  if (!adBlockDetected || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 max-w-md w-[calc(100%-2rem)] bg-[#0E0E0E] border-[1.5px] border-white/20 rounded-3xl p-5 shadow-[4px_4px_0px_rgba(0,0,0,0.9)] backdrop-blur-xl animate-in slide-in-from-bottom duration-300">
      <div className="flex items-start gap-3.5">
        <div className="p-2.5 rounded-2xl bg-white/10 border border-white/20 text-white shrink-0 mt-0.5">
          <ShieldAlert size={20} />
        </div>

        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-black text-white tracking-wide font-display uppercase">
              AdBlocker / DNS Blocker Active
            </h4>
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-black uppercase tracking-wider border border-white/20 font-mono">
              Notice
            </span>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed font-primary">
            Please turn off your AdBlocker or DNS Ad-Blocker to support Sri Explainer, or click below to continue to the stream!
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1 font-mono">
            <button
              onClick={() => setDismissed(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-black uppercase tracking-wider transition-all shadow-[2px_2px_0px_rgba(255,255,255,0.25)] active:scale-95 font-display"
            >
              <span>Continue Stream</span>
              <CheckCircle2 size={13} />
            </button>

            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#141414] hover:border-white text-zinc-200 text-xs font-bold transition-all border border-white/15"
            >
              <RefreshCw size={12} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
