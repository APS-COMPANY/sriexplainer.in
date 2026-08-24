"use client";

import React from "react";

export function AutoFitBadge({
  text,
  badgeClassName = "",
  textClassName = "",
  icon
}: {
  text: string;
  badgeClassName?: string;
  textClassName?: string;
  icon?: React.ReactNode;
}) {
  if (!text) return null;

  return (
    <div
      className={`pointer-events-auto inline-flex items-center justify-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md border shadow-sm backdrop-blur-md transition-all shrink-0 ${badgeClassName}`}
    >
      {icon && <span className="shrink-0 flex items-center">{icon}</span>}
      <span
        className={`font-black text-[9px] sm:text-[10px] leading-none uppercase tracking-wider whitespace-nowrap ${textClassName}`}
      >
        {text}
      </span>
    </div>
  );
}


