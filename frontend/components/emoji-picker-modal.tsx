"use client";

import { useState } from "react";
import { X } from "lucide-react";

type EmojiCategory = {
  name: string;
  icon: string;
  emojis: string[];
};

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: "Popular",
    icon: "🔥",
    emojis: ["🔥", "💎", "⭐", "🆕", "🟢", "🔴", "🎬", "🎌", "📺", "👑", "🔒", "🔓", "⏳", "🆓", "⚔️", "✨", "💀", "❤️"]
  },
  {
    name: "Smileys",
    icon: "😀",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "🤪", "😎", "🤩", "🥳"]
  },
  {
    name: "Status & Badges",
    icon: "🟢",
    emojis: ["🟢", "🔴", "🟡", "🔵", "🟣", "⚫", "⚪", "🆓", "🆕", "⏳", "🔥", "⭐", "⚡", "💥", "✨", "💎", "👑", "🏆"]
  },
  {
    name: "Entertainment",
    icon: "🎬",
    emojis: ["🎬", "📺", "🎌", "⚔️", "🎮", "🕹️", "🍿", "🎥", "🎞️", "🎧", "🔊", "🎶", "🎵", "💬", "👁️", "💀", "👻", "🤖"]
  },
  {
    name: "Hearts & Stars",
    icon: "❤️",
    emojis: ["❤️", "💖", "💗", "💓", "💞", "💕", "❣️", "💔", "⭐", "🌟", "✨", "💫", "⚡", "🔥", "💯", "🎯", "🎉", "🎊"]
  }
];

export function EmojiPickerModal({
  isOpen,
  onClose,
  onSelectEmoji
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
}) {
  const [activeCategory, setActiveCategory] = useState<number>(0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">😀</span>
            <h3 className="font-bold text-sm text-slate-100">Select Emoji Badge</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-2 mb-3 scrollbar-none border-b border-white/5">
          {EMOJI_CATEGORIES.map((cat, idx) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => setActiveCategory(idx)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === idx
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Emoji Grid */}
        <div className="grid grid-cols-6 gap-2 max-h-56 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-white/20">
          {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onSelectEmoji(emoji);
                onClose();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-xl hover:bg-purple-600/30 hover:scale-110 active:scale-95 transition-all"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
