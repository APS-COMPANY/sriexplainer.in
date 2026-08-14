"use client";

import { Globe, Share2 } from "lucide-react";

export function SocialPreview({
  domain,
  url,
  title,
  description,
  ogImage
}: {
  domain: string;
  url: string;
  title: string;
  description: string;
  ogImage?: string;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Google Search Snippet Preview */}
      <div className="rounded-3xl border border-white/10 bg-[#080C16]/90 p-6 space-y-3 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-2 text-xs font-black text-purple-400 uppercase tracking-widest border-b border-white/10 pb-3">
          <Globe size={16} /> Google Search Preview
        </div>
        <div className="space-y-1 select-none">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="truncate max-w-xs">{domain}</span>
            <span>›</span>
          </div>
          <h3 className="text-base font-extrabold text-indigo-400 hover:underline cursor-pointer line-clamp-1">
            {title || domain}
          </h3>
          <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
            {description || "No description provided."}
          </p>
        </div>
      </div>

      {/* WhatsApp / Telegram Social Share Card Preview */}
      <div className="rounded-3xl border border-white/10 bg-[#080C16]/90 p-6 space-y-3 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-2 text-xs font-black text-emerald-400 uppercase tracking-widest border-b border-white/10 pb-3">
          <Share2 size={16} /> Social Media Share Card
        </div>
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0D1322] space-y-2 select-none">
          {ogImage ? (
            <img src={ogImage} alt="OG Preview" className="w-full h-36 object-cover" />
          ) : (
            <div className="w-full h-28 bg-gradient-to-r from-purple-950 to-indigo-950 flex items-center justify-center text-xs font-bold text-zinc-400">
              No OpenGraph Image Found
            </div>
          )}
          <div className="p-3 space-y-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">{domain}</span>
            <p className="text-xs font-black text-white line-clamp-1">{title || domain}</p>
            <p className="text-[11px] text-zinc-400 line-clamp-2">{description || "No description provided."}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
