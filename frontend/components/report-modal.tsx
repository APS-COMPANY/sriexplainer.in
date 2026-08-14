"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, X, Send, LifeBuoy } from "lucide-react";
import { api } from "../lib/api";

type ReportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  defaultRoute?: string;
};

export const ISSUE_TYPES = [
  "Website not loading",
  "Video not playing",
  "Episode problem",
  "Series problem",
  "Search not working",
  "Premium problem",
  "Subscription problem",
  "Login/account problem",
  "Payment problem",
  "App/PWA problem",
  "Other"
];

export function ReportModal({ isOpen, onClose, defaultRoute = "" }: ReportModalProps) {
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0]);
  const [description, setDescription] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; success: boolean } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    setMsg(null);

    try {
      const route = defaultRoute || (typeof window !== "undefined" ? window.location.pathname : "");
      const res = await api.post("/reports", {
        issueType,
        description: description.trim(),
        contactInfo: contactInfo.trim(),
        pageRoute: route
      });

      setMsg({
        text: res.data?.message || "Report submitted successfully! Our team will review it.",
        success: true
      });
      setDescription("");
      setContactInfo("");
      setTimeout(() => {
        setMsg(null);
        onClose();
      }, 2000);
    } catch (err: any) {
      setMsg({
        text: err?.response?.data?.message || "Failed to submit report. Please try again.",
        success: false
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0E0E0E] border-[1.5px] border-white/20 p-6 sm:p-7 shadow-[4px_4px_0px_rgba(0,0,0,0.8)] space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/15 pb-3">
          <div className="flex items-center gap-2 text-white">
            <LifeBuoy size={20} />
            <h2 className="text-base sm:text-lg font-black text-white font-display uppercase">Report a Problem</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Feedback Message */}
        {msg && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 font-mono ${
              msg.success
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
            }`}
          >
            {msg.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{msg.text}</span>
          </div>
        )}

        {/* Report Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider font-mono">
              Issue Type
            </label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#000000] border border-white/15 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-white cursor-pointer font-primary"
            >
              {ISSUE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider font-mono">
              Problem Description *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue you encountered..."
              className="w-full px-4 py-2.5 bg-[#000000] border border-white/15 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white resize-none font-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider font-mono">
              Optional Contact Information (Email / Telegram)
            </label>
            <input
              type="text"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="e.g. user@gmail.com or @telegram_handle"
              className="w-full px-4 py-2.5 bg-[#000000] border border-white/15 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white font-primary"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-white/15 text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/10 transition-all font-mono"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 font-black text-xs shadow-[2px_2px_0px_rgba(255,255,255,0.25)] transition-all disabled:opacity-50 font-display uppercase tracking-wider"
            >
              <Send size={14} />
              <span>{submitting ? "Submitting..." : "Submit Report"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
