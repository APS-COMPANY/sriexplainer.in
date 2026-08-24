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
      className={`pointer-events-auto inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-md border shadow-sm backdrop-blur-md transition-all shrink-0 max-w-[85%] ${badgeClassName}`}
    >
      {icon && <span className="shrink-0 flex items-center">{icon}</span>}
      <span
        className={`font-bold text-[10px] leading-tight uppercase tracking-wide truncate ${textClassName}`}
      >
        {text}
      </span>
    </div>
  );
}

