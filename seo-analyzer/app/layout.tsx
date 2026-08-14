import "./globals.css";
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#8B2CFF",
  width: "device-width",
  initialScale: 1
};

export const metadata: Metadata = {
  title: "SEO Web Analyzer | Instant Real-Time Audit Engine",
  description: "Audit any website URL in real time. Get instant SEO health scores, meta tag checks, social preview cards, and actionable optimization fixes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#050811] text-[#F8FAFC] min-h-screen flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
