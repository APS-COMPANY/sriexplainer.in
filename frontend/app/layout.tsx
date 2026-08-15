import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Providers } from "../components/providers";
import { ClientHeader } from "../components/client-header";
import { GlobalBg } from "../components/global-bg";
import { Footer } from "../components/footer";
import { PWAInstallPrompt } from "../components/pwa-install";
import { HilltopAds } from "../components/hilltop-ads";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";

import { SecurityGuard } from "../components/security-guard";
import { AdBlockDetector } from "../components/adblock-detector";
import { FloatingPipPlayer } from "../components/floating-pip-player";

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export const metadata: Metadata = {
  metadataBase: new URL("https://sriexplainer.in"),
  title: { default: "Sri Explainer | Premium Comic & Anime Explanations", template: "%s | Sri Explainer" },
  description: "Watch captivating comic explanations, anime series breakdowns, and exclusive stories in high quality on Sri Explainer.",
  alternates: {
    canonical: "/"
  },
  manifest: "/manifest.json",
  verification: {
    other: {
      "1bfbc8e9ef995b019928fc00aaf8e20022f892fb": ["1bfbc8e9ef995b019928fc00aaf8e20022f892fb"]
    }
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sri Explainer"
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png"
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://sriexplainer.in",
    siteName: "Sri Explainer",
    title: "Sri Explainer | Premium Comic & Anime Explanations",
    description: "Watch captivating comic explanations, anime series breakdowns, and exclusive stories on Sri Explainer.",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "Sri Explainer"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Sri Explainer | Premium Comic & Anime Explanations",
    description: "Watch captivating comic explanations, anime series breakdowns, and exclusive stories on Sri Explainer.",
    images: ["/icon-512.png"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  }
};

import { Suspense } from "react";
import { AuthGuard } from "../components/auth-guard";
import { AppShell } from "../components/app-shell";

import { PWARegister } from "../components/pwa-register";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="1bfbc8e9ef995b019928fc00aaf8e20022f892fb" content="1bfbc8e9ef995b019928fc00aaf8e20022f892fb" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning className="bg-[#000000] text-white min-h-screen flex flex-col relative antialiased">
        <Providers>
          <Suspense fallback={
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#000000] text-white">
              <div className="h-12 w-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
            </div>
          }>
            <AuthGuard>
              <PWARegister />
              <SecurityGuard />
              <AdBlockDetector />
              <FloatingPipPlayer />
              <GlobalBg />
              <AppShell>{children}</AppShell>
              <PWAInstallPrompt />
              <HilltopAds />
              <SpeedInsights />
              <Analytics />
            </AuthGuard>
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
