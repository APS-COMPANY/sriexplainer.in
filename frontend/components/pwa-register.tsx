"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { setToken } from "../lib/api";

export function PWARegister() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // 1. Android Capacitor Back Button Handling & Deep Links
    let backListener: any;
    let urlListener: any;
    if (typeof window !== "undefined") {
      import("@capacitor/app")
        .then(({ App }) => {
          App.addListener("backButton", ({ canGoBack }) => {
            if (canGoBack && pathname !== "/") {
              window.history.back();
            } else if (pathname !== "/") {
              router.push("/");
            }
          })
            .then((l) => {
              backListener = l;
            })
            .catch(() => {});

          App.addListener("appUrlOpen", (data: any) => {
            if (data?.url && data.url.includes("token=")) {
              try {
                const match = data.url.match(/token=([^&]+)/);
                const token = match ? match[1] : new URL(data.url).searchParams.get("token");
                if (token) {
                  setToken(token);
                  window.location.href = "/";
                }
              } catch (e) {
                console.error("Error handling deep link token:", e);
              }
            }
          })
            .then((l) => {
              urlListener = l;
            })
            .catch(() => {});
        })
        .catch(() => {});
    }

    // 2. PWA Service Worker Registration
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PWA Service Worker]: Registered successfully with scope:", reg.scope);
        })
        .catch((err) => {
          console.warn("[PWA Service Worker Registration Notice]:", err?.message || err);
        });

      const handleOffline = () => {
        if (pathname !== "/offline" && !pathname.startsWith("/watch/")) {
          router.push("/offline");
        }
      };

      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("offline", handleOffline);
        if (backListener && typeof backListener.remove === "function") {
          backListener.remove();
        }
      };
    }
  }, [pathname, router]);

  return null;
}
