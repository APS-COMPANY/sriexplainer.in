"use client";

import { motion } from "framer-motion";

export function ScoreGauge({ score, grade }: { score: number; grade: string }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let colorClass = "text-emerald-400";
  let bgGlow = "from-emerald-500/20 to-teal-500/20";
  let strokeColor = "#10B981";

  if (score < 60) {
    colorClass = "text-rose-500";
    bgGlow = "from-rose-500/20 to-red-500/20";
    strokeColor = "#F43F5E";
  } else if (score < 80) {
    colorClass = "text-amber-400";
    bgGlow = "from-amber-500/20 to-yellow-500/20";
    strokeColor = "#F59E0B";
  }

  return (
    <div className="relative flex flex-col items-center justify-center p-6 rounded-3xl bg-gradient-to-b from-[#0F172A]/90 via-[#0B0F19]/90 to-[#05070E]/95 border border-white/10 shadow-2xl backdrop-blur-xl">
      <div className={`absolute inset-0 bg-gradient-to-tr ${bgGlow} rounded-3xl blur-xl opacity-60 pointer-events-none`} />

      <div className="relative z-10 w-40 h-40 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
          <circle
            cx="70"
            cy="70"
            r={radius}
            className="text-white/10"
            strokeWidth="10"
            stroke="currentColor"
            fill="transparent"
          />
          <motion.circle
            cx="70"
            cy="70"
            r={radius}
            strokeWidth="10"
            stroke={strokeColor}
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`text-4xl font-black tracking-tight ${colorClass}`}>{score}</span>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">SEO Score</span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="text-xs text-zinc-400 font-bold">Grade:</span>
        <span className={`px-3 py-1 rounded-full text-xs font-black bg-white/10 border border-white/15 ${colorClass}`}>
          {grade}
        </span>
      </div>
    </div>
  );
}
