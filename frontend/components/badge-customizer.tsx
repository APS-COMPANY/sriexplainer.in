"use client";

import { useState } from "react";
import { EmojiPickerModal } from "./emoji-picker-modal";
import { Smile, Sparkles } from "lucide-react";
import { AutoFitBadge } from "./auto-fit-badge";
import { SeriesStatusBadge } from "./series-status-badge";

export type PosterBadgesConfig = {
  topLeft: { text: string; enabled: boolean };
  topRight: { text: string; enabled: boolean };
  bottomLeft: { text: string; enabled: boolean };
  bottomRight?: { text: string; enabled: boolean };
};

export const DEFAULT_POSTER_BADGES: PosterBadgesConfig = {
  topLeft: { text: "EP 1 • 1080P", enabled: true },
  topRight: { text: "ANIME", enabled: true },
  bottomLeft: { text: "💎 5 COINS", enabled: true },
  bottomRight: { text: "ONGOING", enabled: true }
};

const PRESETS = [
  "💎 5 COINS",
  "💎 10 COINS",
  "💎 20 COINS",
  "🆓 FREE",
  "🔥 TRENDING",
  "🆕 NEW",
  "🎬 ANIME",
  "🎌 DONGHUA",
  "📺 AI ANIME",
  "⭐ FEATURED",
  "EP 1",
  "EP 2",
  "720P",
  "1080P",
  "4K"
];

export function BadgeCustomizer({
  value,
  onChange,
  posterUrl,
  seriesTitle,
  seriesStatus
}: {
  value?: PosterBadgesConfig;
  onChange: (newValue: PosterBadgesConfig) => void;
  posterUrl?: string;
  seriesTitle?: string;
  seriesStatus?: string;
}) {
  const config: PosterBadgesConfig = {
    topLeft: { text: value?.topLeft?.text ?? DEFAULT_POSTER_BADGES.topLeft.text, enabled: value?.topLeft?.enabled ?? true },
    topRight: { text: value?.topRight?.text ?? DEFAULT_POSTER_BADGES.topRight.text, enabled: value?.topRight?.enabled ?? true },
    bottomLeft: { text: value?.bottomLeft?.text ?? DEFAULT_POSTER_BADGES.bottomLeft.text, enabled: value?.bottomLeft?.enabled ?? true },
    bottomRight: { text: value?.bottomRight?.text ?? DEFAULT_POSTER_BADGES.bottomRight?.text ?? "ONGOING", enabled: value?.bottomRight?.enabled ?? true }
  };

  const [activePickerKey, setActivePickerKey] = useState<keyof PosterBadgesConfig | null>(null);

  const updateCorner = (key: keyof PosterBadgesConfig, text: string, enabled: boolean) => {
    onChange({
      ...config,
      [key]: { text, enabled }
    });
  };

  const handleEmojiSelect = (emoji: string) => {
    if (!activePickerKey) return;
    const current = config[activePickerKey];
    if (current) {
      updateCorner(activePickerKey, `${current.text} ${emoji}`.trim(), current.enabled);
    }
  };

  return (
    <div className="space-y-6 rounded-3xl bg-slate-900/90 border border-purple-500/30 p-4 sm:p-6 text-white shadow-2xl backdrop-blur-xl max-w-full overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3.5 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-purple-300">
            Poster Badge Customization
          </h3>
        </div>
        <span className="text-xs font-bold text-slate-400 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
          3 Corner Controls + Auto Status
        </span>
      </div>

      {/* Main Layout Grid: Left Controls (60%), Right Live Preview (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start relative">
        {/* Left Side: 3 Badge Control Boxes */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-5 w-full min-w-0">
          {(
            [
              { key: "topLeft", label: "TOP LEFT BADGE", pos: "↖️" },
              { key: "topRight", label: "TOP RIGHT BADGE", pos: "↗️" },
              { key: "bottomLeft", label: "BOTTOM LEFT BADGE", pos: "↙️" }
            ] as const
          ).map((item) => {
            const corner = config[item.key];
            if (!corner) return null;
            return (
              <div
                key={item.key}
                className="rounded-2xl bg-white/5 border border-white/10 p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 hover:border-purple-500/40 transition-all shadow-md min-w-0"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5 flex-wrap gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">{item.pos}</span>
                    <span className="text-xs font-extrabold text-white tracking-wider truncate">
                      {item.label}
                    </span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none bg-black/40 border border-white/10 px-3 py-1 rounded-lg hover:border-purple-500/40 transition-all shrink-0">
                    <input
                      type="checkbox"
                      checked={corner.enabled}
                      onChange={(e) => updateCorner(item.key, corner.text, e.target.checked)}
                      className="rounded accent-purple-600 h-4 w-4 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-300">Enable</span>
                  </label>
                </div>

                {corner.enabled && (
                  <div className="space-y-3 pt-1 min-w-0">
                    {/* Manual Input Row */}
                    <div className="space-y-1 min-w-0">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Custom Badge Text
                      </label>
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="text"
                          value={corner.text}
                          onChange={(e) => updateCorner(item.key, e.target.value, corner.enabled)}
                          placeholder="Type custom text or choose preset..."
                          className="flex-1 min-w-0 rounded-xl bg-black/60 border border-white/10 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={() => setActivePickerKey(item.key)}
                          title="Add Emoji"
                          className="flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 hover:bg-purple-600 hover:text-white transition-all shrink-0 shadow-md"
                        >
                          <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Presets Row */}
                    <div className="space-y-1 min-w-0">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Quick Presets
                      </label>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/20 max-w-full">
                        {PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => updateCorner(item.key, preset, corner.enabled)}
                            className="shrink-0 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-purple-600/30 hover:border-purple-500/60 hover:text-white transition-all shadow-sm"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Side: Large Live Preview Poster Card */}
        <div className="lg:col-span-5 flex flex-col items-center lg:items-start lg:sticky lg:top-24 pt-2 lg:pt-0 w-full min-w-0">
          <div className="w-full max-w-full flex flex-col items-center rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5 space-y-4 shadow-xl overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/10 pb-2 w-full justify-center">
              <span className="text-xs font-black text-purple-300 uppercase tracking-widest">
                Large Live Preview
              </span>
            </div>

            {/* Substantially Larger Poster Card */}
            <div className="relative aspect-[2/3] w-36 sm:w-44 md:w-52 max-w-full rounded-2xl bg-slate-950 border border-purple-500/40 overflow-hidden shadow-2xl shadow-purple-950/60 transition-all poster-container @container">
              {posterUrl ? (
                <img src={posterUrl} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-tr from-slate-950 via-slate-900 to-purple-950/50">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-200 line-clamp-3 break-words">
                    {seriesTitle || "Series Title"}
                  </span>
                </div>
              )}

              {/* Live Top Corner Badges Row */}
              <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-start justify-between gap-1 pointer-events-none">
                {/* Live Top-Left Badge */}
                {config.topLeft.enabled && config.topLeft.text ? (
                  <AutoFitBadge
                    text={config.topLeft.text}
                    badgeClassName="bg-black/85 border-white/10 text-white"
                  />
                ) : <div />}

                {/* Live Top-Right Badge */}
                {config.topRight.enabled && config.topRight.text ? (
                  <AutoFitBadge
                    text={config.topRight.text}
                    badgeClassName="bg-purple-600/90 border-purple-400/50 text-white"
                  />
                ) : <div />}
              </div>

              {/* Live Bottom Corner Badges Row */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-end justify-between gap-1 pointer-events-none">
                {/* Live Bottom-Left Badge */}
                {config.bottomLeft.enabled && config.bottomLeft.text ? (
                  <AutoFitBadge
                    text={config.bottomLeft.text}
                    badgeClassName="bg-purple-600/90 border-purple-400/50 text-white"
                  />
                ) : <div />}

                {/* Live Bottom-Right Badge (AUTOMATIC FROM SERIES STATUS) */}
                <SeriesStatusBadge status={seriesStatus || "Ongoing"} />
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center font-medium">
              Real-time representation of how your poster badges will display to users.
            </p>
          </div>
        </div>
      </div>

      <EmojiPickerModal
        isOpen={Boolean(activePickerKey)}
        onClose={() => setActivePickerKey(null)}
        onSelectEmoji={handleEmojiSelect}
      />
    </div>
  );
}

