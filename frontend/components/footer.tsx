"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { WhatsAppIcon, TelegramIcon } from "./header";
import { Sparkles, Shield, Heart } from "lucide-react";

export function Footer() {
  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => (await api.get("/settings")).data,
    staleTime: 60000
  });

  const whatsappUrl = settings?.whatsappUrl;
  const telegramUrl = settings?.telegramUrl;

  return (
    <footer className="border-t border-white/15 bg-[#000000] text-zinc-300 py-10 text-xs mt-auto relative z-10 w-full select-none">
      <div className="px-4 sm:px-8 space-y-8 max-w-[1920px] mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-white/15">
          <div className="space-y-1.5 text-center md:text-left">
            <h3 className="text-base sm:text-lg font-black text-white flex items-center justify-center md:justify-start gap-2 font-display uppercase tracking-tight">
              <Sparkles size={16} className="text-white animate-pulse" /> Sri Explainer VIP Community
            </h3>
            <p className="text-xs text-zinc-400 max-w-lg font-primary leading-relaxed">
              Join our official WhatsApp & Telegram channels to get instant notifications, exclusive episode updates, and connect with fellow viewers.
            </p>
          </div>

          {/* Community Channel Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 font-mono">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full bg-white text-black hover:bg-zinc-200 border border-white px-5 py-2.5 text-xs font-black uppercase tracking-wider font-display shadow-[2px_2px_0px_rgba(255,255,255,0.25)] hover:scale-105 active:scale-95 transition-all"
              >
                <WhatsAppIcon className="w-4 h-4 text-black" /> Join WhatsApp
              </a>
            )}

            {telegramUrl && (
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full bg-[#141414] text-white hover:bg-white hover:text-black border border-white/20 px-5 py-2.5 text-xs font-black uppercase tracking-wider font-display shadow-[2px_2px_0px_rgba(0,0,0,0.8)] hover:scale-105 active:scale-95 transition-all"
              >
                <TelegramIcon className="w-4 h-4 text-current" /> Join Telegram
              </a>
            )}
          </div>
        </div>

        {/* Footer Navigation Links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center justify-center gap-4 text-zinc-400 font-medium font-mono">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/latest" className="hover:text-white transition-colors">Explore</Link>
            <Link href="/ongoing" className="hover:text-white transition-colors">Ongoing</Link>
            <Link href="/completed" className="hover:text-white transition-colors">Completed</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          </div>

          <p className="text-zinc-500 text-center sm:text-right font-mono">
            © {new Date().getFullYear()} Sri Explainer. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
