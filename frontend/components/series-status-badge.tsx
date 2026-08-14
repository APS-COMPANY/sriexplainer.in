"use client";

import React from "react";
import { AutoFitBadge } from "./auto-fit-badge";

export function StatusDot({ color }: { color: "red" | "blue" | "yellow" | "purple" | "white" | string }) {
  let colorClasses = "bg-white shadow-[0_0_6px_rgba(255,255,255,0.85)]";
  if (color === "red") {
    colorClasses = "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.85)]";
  } else if (color === "blue") {
    colorClasses = "bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.85)]";
  } else if (color === "yellow" || color === "gold" || color === "amber") {
    colorClasses = "bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.85)]";
  }

  return (
    <span className="relative inline-flex items-center justify-center h-2 w-2 shrink-0">
      <span className={`h-1.5 w-1.5 rounded-full ${colorClasses} animate-status-dot inline-block`} />
    </span>
  );
}

export function getSeriesStatusBadgeConfig(status?: string) {
  const rawStatus = (status || "Ongoing").trim();
  const statusLower = rawStatus.toLowerCase();
  const displayText = rawStatus.toUpperCase();

  if (statusLower === "ongoing") {
    return {
      text: displayText,
      dotColor: "white",
      badgeClassName: "bg-black/90 border-white/25 text-white shadow-sm"
    };
  }

  if (statusLower === "completed") {
    return {
      text: displayText,
      dotColor: "white",
      badgeClassName: "bg-white text-black border-black font-extrabold shadow-sm"
    };
  }

  if (statusLower === "upcoming") {
    return {
      text: displayText,
      dotColor: "white",
      badgeClassName: "bg-black/90 border-white/25 text-white shadow-sm"
    };
  }

  // Fallback for any other saved status string
  return {
    text: displayText,
    dotColor: "white",
    badgeClassName: "bg-black/90 border-white/25 text-white shadow-sm"
  };
}

export function SeriesStatusBadge({ status, className }: { status?: string; className?: string }) {
  const config = getSeriesStatusBadgeConfig(status);

  return (
    <AutoFitBadge
      text={config.text}
      icon={<StatusDot color={config.dotColor} />}
      badgeClassName={`${config.badgeClassName} ${className || ""}`}
    />
  );
}
