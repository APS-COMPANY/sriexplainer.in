import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Download Sri Explainer App • Windows PC & Android APK (v1.2.3)",
  description: "Download the official Sri Explainer native app for Windows PC and Android mobile. Enjoy 4K HDR playback, offline viewing, in-app auto-updates, and Tamil web series.",
  keywords: ["Sri Explainer app download", "Sri Explainer apk", "Sri Explainer Windows exe", "Tamil web series app", "Sri Explainer 1.2.3 apk"],
  openGraph: {
    title: "Download Sri Explainer App • Windows & Android",
    description: "Stream Tamil web series & anime explainers in 4K with offline viewing and instant episode updates.",
    url: "https://sriexplainer.in/download",
    siteName: "Sri Explainer",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Sri Explainer App Download"
      }
    ]
  },
  twitter: {
    card: "summary",
    title: "Download Sri Explainer App • Windows PC & Android APK",
    description: "Stream Tamil web series in 4K with offline viewing and instant episode updates.",
    images: ["/logo.png"]
  }
};

export default function DownloadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
