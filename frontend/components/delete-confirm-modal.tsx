"use client";

import React, { useEffect } from "react";
import { Trash2, X } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function DeleteConfirmModal({
  isOpen,
  title = "Delete Item?",
  message = "Are you sure you want to delete this item? This action cannot be undone.",
  onClose,
  onConfirm,
  isDeleting = false
}: DeleteConfirmModalProps) {
  // Listen for Escape key to close modal
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
      aria-labelledby="delete-modal-title"
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

        {/* Red Glowing Trash Badge */}
        <div className="h-16 w-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 grid place-items-center mx-auto shadow-lg shadow-rose-500/10">
          <Trash2 size={28} />
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h2 id="delete-modal-title" className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal max-w-xs mx-auto">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-3 px-5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs sm:text-sm font-bold text-zinc-200 hover:text-white transition-all active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-xs sm:text-sm font-black text-white shadow-xl shadow-rose-600/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Trash2 size={16} />
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
