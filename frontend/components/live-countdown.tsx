"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

type LiveCountdownProps = {
  targetDate: string;
  compact?: boolean;
  onRelease?: () => void;
  className?: string;
};

export function calculateTimeRemaining(targetDateStr: string) {
  try {
    const target = new Date(targetDateStr).getTime();
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isReleased: true };
    }

    const seconds = Math.floor((diff / 1000) % 60);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    return { total: diff, days, hours, minutes, seconds, isReleased: false };
  } catch {
    return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isReleased: true };
  }
}

export function LiveCountdown({ targetDate, compact = false, onRelease, className = "" }: LiveCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeRemaining(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = calculateTimeRemaining(targetDate);
      setTimeLeft(remaining);

      if (remaining.isReleased) {
        clearInterval(timer);
        if (onRelease) onRelease();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onRelease]);

  if (timeLeft.isReleased) {
    return (
      <span className="text-emerald-400 font-extrabold text-xs flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
        AVAILABLE NOW
      </span>
    );
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 font-mono font-black text-[10px] sm:text-xs text-amber-300 ${className}`}>
        <Clock size={11} className="text-amber-400 shrink-0" />
        <span>
          {pad(timeLeft.days)}D {pad(timeLeft.hours)}H {pad(timeLeft.minutes)}M {pad(timeLeft.seconds)}S
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 sm:gap-2 font-mono font-black text-xs sm:text-sm text-amber-300 ${className}`}>
      <span className="px-2 py-1 rounded-lg bg-[#000000]/90 border border-amber-500/30 text-amber-400">
        {pad(timeLeft.days)}D
      </span>
      <span className="text-white/40">:</span>
      <span className="px-2 py-1 rounded-lg bg-[#000000]/90 border border-amber-500/30 text-amber-400">
        {pad(timeLeft.hours)}H
      </span>
      <span className="text-white/40">:</span>
      <span className="px-2 py-1 rounded-lg bg-[#000000]/90 border border-amber-500/30 text-amber-400">
        {pad(timeLeft.minutes)}M
      </span>
      <span className="text-white/40">:</span>
      <span className="px-2 py-1 rounded-lg bg-[#000000]/90 border border-amber-500/30 text-amber-400">
        {pad(timeLeft.seconds)}S
      </span>
    </div>
  );
}
