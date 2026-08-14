"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LifeBuoy, Send, MessageCircle } from "lucide-react";
import { api } from "../lib/api";
import { ReportModal } from "./report-modal";

export function SupportSection({ className = "" }: { className?: string }) {
  const [modalOpen, setModalOpen] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => (await api.get("/settings")).data,
    staleTime: 60000
  });

  const rawTelegram = (
    settings?.supportTelegram ||
    settings?.support_telegram ||
    settings?.telegramUrl ||
    settings?.telegram_url ||
    "SriExplainer"
  ).trim();

  let telegramLink = "";
  let telegramLabel = "";

  if (rawTelegram) {
    if (rawTelegram.startsWith("http://") || rawTelegram.startsWith("https://")) {
      telegramLink = rawTelegram;
      const parts = rawTelegram.split("/");
      telegramLabel = `@${parts[parts.length - 1] || "Support"}`;
    } else {
      const cleanHandle = rawTelegram.replace(/^@/, "");
      telegramLink = `https://t.me/${cleanHandle}`;
      telegramLabel = `@${cleanHandle}`;
    }
  }

  return (
    <>
      <div className={`p-6 sm:p-8 rounded-3xl border-[1.5px] border-white/15 bg-[#0E0E0E] shadow-[3px_3px_0px_rgba(0,0,0,0.8)] space-y-4 max-w-4xl mx-auto ${className}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-zinc-400 font-black text-xs uppercase tracking-wider font-mono">
              <LifeBuoy size={16} className="text-white" />
              <span>Need Help & Support?</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white font-display">Having a problem or something not working?</h2>
            <p className="text-xs text-zinc-400 font-primary">
              Report an issue directly to our team or contact us via Telegram for immediate assistance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto shrink-0">
            <button
              onClick={() => setModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 font-extrabold text-xs shadow-[2px_2px_0px_rgba(255,255,255,0.25)] transition-all font-display uppercase tracking-wider"
            >
              <Send size={14} />
              <span>Report a Problem</span>
            </button>

            {telegramLink ? (
              <a
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#141414] border border-white/20 hover:border-white text-white font-extrabold text-xs transition-all font-mono"
              >
                <MessageCircle size={14} />
                <span>Contact Telegram ({telegramLabel})</span>
              </a>
            ) : (
              <span className="text-xs text-zinc-500 italic font-mono">Telegram support coming soon</span>
            )}
          </div>
        </div>
      </div>

      <ReportModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
