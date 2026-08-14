"use client";

import React, { useEffect } from "react";
import { LogOut, X, AlertTriangle } from "lucide-react";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function LogoutModal({ isOpen, onClose, onConfirm }: LogoutModalProps) {
  // Listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
    >
      <div
        className="relative w-full max-w-md bg-[#0E0E0E] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <X size={16} />
        </button>

        {/* Warning Icon Badge */}
        <div className="h-16 w-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 grid place-items-center mx-auto shadow-lg shadow-rose-500/10">
          <LogOut size={28} className="translate-x-0.5" />
        </div>

        {/* Modal Text Header */}
        <div className="space-y-2">
          <h2 id="logout-modal-title" className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Sign out of SriExplainer?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal max-w-xs mx-auto">
            Are you sure you want to sign out of your account? You can sign back in anytime.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs sm:text-sm font-bold text-zinc-200 hover:text-white transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-xs sm:text-sm font-black text-white shadow-xl shadow-rose-600/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
