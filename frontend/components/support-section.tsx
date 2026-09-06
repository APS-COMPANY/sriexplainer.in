"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LifeBuoy } from "lucide-react";
import { TelegramIcon } from "./header";
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-zinc-400 font-bold text-xs font-primary">
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
              className="flex-1 sm:flex-none min-w-[160px] sm:min-w-[170px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all font-display"
            >
              <LifeBuoy size={15} />
              <span>Report a Problem</span>
            </button>

            {telegramLink ? (
              <a
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none min-w-[160px] sm:min-w-[170px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#141414] border border-white/20 hover:border-white hover:bg-white hover:text-black text-white font-bold text-xs sm:text-sm active:scale-95 transition-all font-display"
              >
                <TelegramIcon className="w-4 h-4 text-current" />
                <span>Contact Telegram</span>
              </a>
            ) : (
              <span className="text-xs text-zinc-300 italic font-mono">Telegram support coming soon</span>
            )}
          </div>
        </div>
      </div>

      <ReportModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
