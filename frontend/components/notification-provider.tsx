"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { CheckCircle2, AlertOctagon, AlertTriangle, Info, X } from "lucide-react";

export type NotificationType = "success" | "error" | "warning" | "info";

export type NotificationOptions = {
  type?: NotificationType;
  title?: string;
  message: string;
  autoDismissMs?: number;
};

type NotificationContextType = {
  showNotification: (options: NotificationOptions | string) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

let globalShowNotification: ((options: NotificationOptions | string) => void) | null = null;

export function showNotification(options: NotificationOptions | string) {
  if (globalShowNotification) {
    globalShowNotification(options);
  } else {
    // Fallback if context not mounted yet
    const msg = typeof options === "string" ? options : options.message;
    console.log("[Notification]:", msg);
  }
}

export function showSuccess(message: string, title?: string) {
  showNotification({ type: "success", title: title || "Success!", message });
}

export function showError(message: string, title?: string) {
  showNotification({ type: "error", title: title || "Error", message });
}

export function showWarning(message: string, title?: string) {
  showNotification({ type: "warning", title: title || "Notice", message });
}

export function showInfo(message: string, title?: string) {
  showNotification({ type: "info", title: title || "Information", message });
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notification, setNotification] = useState<(NotificationOptions & { id: number }) | null>(null);

  const handleShowNotification = useCallback((options: NotificationOptions | string) => {
    const opts: NotificationOptions = typeof options === "string" ? { message: options } : options;
    const type = opts.type || "success";
    
    let title = opts.title;
    if (!title) {
      if (type === "success") title = "Success!";
      else if (type === "error") title = "Error";
      else if (type === "warning") title = "Notice";
      else title = "Information";
    }

    setNotification({
      ...opts,
      type,
      title,
      id: Date.now()
    });
  }, []);

  useEffect(() => {
    globalShowNotification = handleShowNotification;
    return () => {
      globalShowNotification = null;
    };
  }, [handleShowNotification]);

  const close = useCallback(() => {
    setNotification(null);
  }, []);

  useEffect(() => {
    if (!notification) return;

    // Auto dismiss for success and info (default 3500ms)
    const isAutoDismiss = notification.type === "success" || notification.type === "info";
    const dismissMs = notification.autoDismissMs || (isAutoDismiss ? 3500 : 0);

    let timer: NodeJS.Timeout | null = null;
    if (dismissMs > 0) {
      timer = setTimeout(() => {
        close();
      }, dismissMs);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [notification, close]);

  const contextValue: NotificationContextType = {
    showNotification: handleShowNotification,
    showSuccess: (message, title) => handleShowNotification({ type: "success", title: title || "Success!", message }),
    showError: (message, title) => handleShowNotification({ type: "error", title: title || "Error", message }),
    showWarning: (message, title) => handleShowNotification({ type: "warning", title: title || "Notice", message }),
    showInfo: (message, title) => handleShowNotification({ type: "info", title: title || "Information", message })
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}

      {notification && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none">
          {/* Subtle Glassmorphism Backdrop Overlay */}
          <div
            onClick={close}
            className="fixed inset-0 bg-black/65 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
          />

          {/* Centered Modal Surface */}
          <div className="relative w-full max-w-sm rounded-3xl bg-[#0D1322] border border-white/10 p-6 sm:p-8 shadow-2xl shadow-purple-950/40 text-center flex flex-col items-center space-y-4 z-10 animate-in fade-in zoom-in-95 duration-200">
            {/* Close Cross Top Right */}
            <button
              onClick={close}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Close notification"
            >
              <X size={18} />
            </button>

            {/* Icon Banner */}
            {notification.type === "success" && (
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                <CheckCircle2 size={32} />
              </div>
            )}

            {notification.type === "error" && (
              <div className="h-16 w-16 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/20 shrink-0">
                <AlertOctagon size={32} />
              </div>
            )}

            {notification.type === "warning" && (
              <div className="h-16 w-16 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                <AlertTriangle size={32} />
              </div>
            )}

            {notification.type === "info" && (
              <div className="h-16 w-16 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                <Info size={32} />
              </div>
            )}

            {/* Title */}
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              {notification.title}
            </h3>

            {/* Message */}
            <p className="text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed max-w-xs">
              {notification.message}
            </p>

            {/* Action OK Button */}
            <div className="w-full pt-2">
              <button
                onClick={close}
                className="w-full py-3 rounded-2xl brand-gradient brand-glow font-extrabold text-white text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    return {
      showNotification,
      showSuccess,
      showError,
      showWarning,
      showInfo
    };
  }
  return context;
}
