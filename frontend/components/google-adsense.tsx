"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

export function GoogleAdSense() {
  return (
    <Script
      id="google-adsense-script"
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1260032713613791"
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}

interface AdSenseBannerProps {
  slot?: string;
  format?: "auto" | "fluid" | "rectangle" | "horizontal" | "vertical";
  responsive?: boolean;
  className?: string;
}

export function AdSenseBanner({
  slot,
  format = "auto",
  responsive = true,
  className = "",
}: AdSenseBannerProps) {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!slot) return;
    try {
      if (typeof window !== "undefined" && !pushedRef.current) {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        pushedRef.current = true;
      }
    } catch (e) {
      console.warn("AdSense banner push warning:", e);
    }
  }, [slot]);

  if (!slot) return null;

  return (
    <div className={`overflow-hidden my-4 text-center min-h-[90px] flex items-center justify-center ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-1260032713613791"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}
