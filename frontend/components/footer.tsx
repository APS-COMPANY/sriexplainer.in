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
      <div className="px-4 sm:px-8 space-y-8 max-w-4xl mx-auto">
        {/* VIP Community Card Container matching Help Card */}
        <div className="p-6 sm:p-8 rounded-3xl border-[1.5px] border-white/15 bg-[#0E0E0E] shadow-[3px_3px_0px_rgba(0,0,0,0.8)] flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1 text-left">
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 font-display tracking-tight">
              <Sparkles size={16} className="text-white animate-pulse" /> Sri Explainer VIP Community
            </h3>
            <p className="text-xs text-zinc-400 max-w-md font-primary leading-relaxed">
              Join our official WhatsApp & Telegram channels to get instant notifications, exclusive episode updates, and connect with fellow viewers.
            </p>
          </div>

          {/* Community Channel Buttons */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 md:flex-none min-w-[150px] flex items-center justify-center gap-2 rounded-full bg-white text-black hover:bg-zinc-200 border border-white px-5 py-2.5 text-xs sm:text-sm font-bold shadow-md active:scale-95 transition-all font-display"
              >
                <WhatsAppIcon className="w-4 h-4 text-black" /> Join WhatsApp
              </a>
            )}

            {telegramUrl && (
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 md:flex-none min-w-[150px] flex items-center justify-center gap-2 rounded-full bg-[#141414] text-white hover:bg-white hover:text-black border border-white/20 px-5 py-2.5 text-xs sm:text-sm font-bold shadow-md active:scale-95 transition-all font-display"
              >
                <TelegramIcon className="w-4 h-4 text-current" /> Join Telegram
              </a>
            )}
          </div>
        </div>

        {/* Footer Navigation Links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-zinc-300 font-primary">
            <Link href="/" className="hover:text-white transition-colors py-1 px-1.5 rounded hover:bg-white/5">Home</Link>
            <Link href="/latest" className="hover:text-white transition-colors py-1 px-1.5 rounded hover:bg-white/5">Explore</Link>
            <Link href="/ongoing" className="hover:text-white transition-colors py-1 px-1.5 rounded hover:bg-white/5">Ongoing</Link>
            <Link href="/completed" className="hover:text-white transition-colors py-1 px-1.5 rounded hover:bg-white/5">Completed</Link>
            <Link href="/pricing" className="hover:text-white transition-colors py-1 px-1.5 rounded hover:bg-white/5">Pricing</Link>
          </div>

          <p className="text-zinc-500 text-xs text-center sm:text-right font-mono">
            © {new Date().getFullYear()} Sri Explainer. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
