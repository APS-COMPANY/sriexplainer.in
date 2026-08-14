"use client";

import { useEffect } from "react";

export function SecurityGuard() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Console Security Warning for Developers inspecting the browser console
    const warningTitle = "%c⚠️ SECURITY WARNING!";
    const warningTitleStyle = "color: #EF4444; font-size: 24px; font-weight: 900; -webkit-text-stroke: 1px black;";
    const warningBody = "%cThis is a browser feature intended for developers. Do not paste or inspect unauthorized scripts here. API keys, database credentials, and video stream links are tokenized and protected on server-side nodes.";
    const warningBodyStyle = "color: #A1A1AA; font-size: 13px; font-weight: 600;";

    console.log(warningTitle, warningTitleStyle);
    console.log(warningBody, warningBodyStyle);

    // 2. Block Inspect Element / DevTools keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 key
      if (e.key === "F12" || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+I (DevTools), Ctrl+Shift+J (Console), Ctrl+Shift+C (Inspect), Ctrl+U (View Source)
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c"))
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+U / Cmd+U (View Page Source)
      if ((e.ctrlKey || e.metaKey) && (e.key === "u" || e.key === "U")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // 3. Disable Right-Click Context Menu on Video Player Elements & Protection Classes
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "VIDEO" ||
          target.tagName === "IFRAME" ||
          target.closest(".video-player-container") ||
          target.closest(".watch-page-container"))
      ) {
        e.preventDefault();
        return false;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("contextmenu", handleContextMenu, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("contextmenu", handleContextMenu, true);
    };
  }, []);

  return null;
}
