"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Download,
  Smartphone,
  Monitor,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  QrCode,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  Tv,
  FolderDown,
  Laptop,
  Cpu,
  Bell,
  RefreshCw,
  Layers,
  ArrowRight
} from "lucide-react";

export default function DownloadAppsPage() {
  const [userOs, setUserOs] = useState<"windows" | "android" | "other">("other");
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes("android")) {
        setUserOs("android");
      } else if (ua.includes("windows") || ua.includes("win32") || ua.includes("win64")) {
        setUserOs("windows");
      }
    }
  }, []);

  const androidDownloadUrl = "https://github.com/APS-COMPANY/sriexplainer.in/releases/download/v1.2.2/SriExplainer.apk";
  const androidDirectMirror = "/sriexplainer.apk";
  const windowsDownloadUrl = "https://github.com/APS-COMPANY/sriexplainer.in/releases/download/v1.2.2/SriExplainer-Setup.exe";

  const faqs = [
    {
      q: "Are the Sri Explainer Windows and Android apps free to download?",
      a: "Yes! Both the Android mobile app and the Windows desktop app are 100% free to download and use. You get unlimited access to all Tamil web series, anime explainers, and high-speed streaming."
    },
    {
      q: "Will the Android app update automatically on my phone?",
      a: "Yes! Starting with version 1.2.1, Sri Explainer features a built-in In-App Auto-Updater. Whenever a new episode feature or update is released, the app will automatically prompt you with an 'Update Now' button so you never need to reinstall manually."
    },
    {
      q: "What should I do if Android shows 'Install unknown apps' or Play Protect prompt?",
      a: "Because Sri Explainer is distributed directly by the developer and not via Google Play Store, Android will ask you for permission. Simply tap 'Settings' -> enable 'Allow from this source', or on Play Protect tap 'More details' -> 'Install anyway'. The APK is 100% clean, verified, and ad-free."
    },
    {
      q: "What are the system requirements for the Windows Desktop app?",
      a: "Sri Explainer for Windows runs smoothly on Windows 10 and Windows 11 (64-bit). It requires 2 GB of RAM and supports hardware-accelerated 4K/60fps video playback with dedicated keyboard controls."
    },
    {
      q: "Will my watch history and bookmarks sync between the website and apps?",
      a: "Yes! When you log in with your Sri Explainer account, your XP Coins, Watch History, and My Watchlist bookmarks automatically sync across your Windows PC, Android phone, and web browser in real-time."
    }
  ];

  return (
    <main className="min-h-screen bg-[#06040A] text-white selection:bg-purple-500 selection:text-white pb-20">
      {/* 1. GLOW BACKGROUND EFFECTS */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-pink-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-10 left-1/3 w-[700px] h-[700px] bg-indigo-600/10 rounded-full blur-[160px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 space-y-16">
        
        {/* 2. HERO HEADER */}
        <div className="text-center space-y-5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-purple-300 text-xs font-black uppercase tracking-wider font-mono shadow-sm">
            <Sparkles size={14} className="text-yellow-400 animate-pulse" /> Official Sri Explainer Apps • v1.2.1 Live
          </div>
          
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight font-display uppercase leading-tight">
            Stream Anywhere. <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
              Cinema on Every Screen.
            </span>
          </h1>

          <p className="text-zinc-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-primary">
            Download the native Sri Explainer app for your <strong className="text-white">Windows PC</strong> and <strong className="text-white">Android Mobile</strong>. Experience 4K HDR playback, encrypted offline viewing, instant new episode alerts, and in-app auto-updates.
          </p>

          {/* Quick OS Indicator */}
          {userOs !== "other" && (
            <div className="pt-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 size={13} />
                Detected: {userOs === "windows" ? "Windows PC" : "Android Device"} (Recommended version highlighted below)
              </span>
            </div>
          )}
        </div>

        {/* 3. DOWNLOAD CARDS GRID (WINDOWS & ANDROID) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          
          {/* CARD 1: ANDROID APK */}
          <div
            id="android-download-card"
            className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 border ${
              userOs === "android"
                ? "bg-gradient-to-b from-[#170E2B] to-[#0D0818] border-purple-500/60 shadow-[0_0_40px_rgba(139,92,246,0.25)] ring-2 ring-purple-500/30"
                : "bg-[#0E0B18] border-white/15 hover:border-white/30 shadow-xl"
            }`}
          >
            {/* Recommendation Ribbon */}
            {userOs === "android" && (
              <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[11px] font-black uppercase tracking-wider font-mono shadow-md">
                ★ Best for your Phone
              </div>
            )}

            <div className="space-y-6">
              {/* Top Header & Icon */}
              <div className="flex items-center justify-between">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg text-white">
                  <Smartphone size={30} />
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded-md bg-white/10 text-purple-300 text-xs font-bold font-mono">
                    APK • v1.2.2
                  </span>
                  <span className="block text-[11px] text-zinc-400 font-mono mt-0.5">
                    22.2 MB • Android 7.0+
                  </span>
                </div>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-black font-display text-white">
                  Sri Explainer for Android
                </h2>
                <p className="text-zinc-300 text-xs sm:text-sm mt-1 leading-relaxed">
                  Native Android OTT streaming app engineered with Jetpack Compose, ExoPlayer, and real-time community chat.
                </p>
              </div>

              {/* Feature Highlights List */}
              <div className="space-y-2.5 text-xs text-zinc-200">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-purple-400 shrink-0" />
                  <span><strong>In-App Auto-Updates</strong>: Never manually install APKs again</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-purple-400 shrink-0" />
                  <span><strong>My Watchlist & Bookmarks</strong>: Save series for later with 1 tap</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-purple-400 shrink-0" />
                  <span><strong>Episode Comments</strong>: Discuss episodes with live community chat</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-purple-400 shrink-0" />
                  <span><strong>Release Radar</strong>: Bell notification for fresh episode drops</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-purple-400 shrink-0" />
                  <span><strong>ExoPlayer & Resume</strong>: Auto-heals buffers & remembers timestamp</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-8 space-y-3">
              <a
                href={androidDownloadUrl}
                download="SriExplainer.apk"
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-sm uppercase tracking-wider font-display flex items-center justify-center gap-3 shadow-[0_4px_20px_rgba(168,85,247,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Download size={18} />
                <span>Download Android APK (v1.2.2)</span>
              </a>

              <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-zinc-400 font-mono">
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck size={12} /> 100% Safe & Verified
                </span>
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="hover:text-white flex items-center gap-1 transition-colors"
                >
                  <QrCode size={12} /> Scan QR Code
                </button>
              </div>
            </div>
          </div>

          {/* CARD 2: WINDOWS PC */}
          <div
            id="windows-download-card"
            className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 border ${
              userOs === "windows"
                ? "bg-gradient-to-b from-[#0E1528] to-[#080D18] border-cyan-500/60 shadow-[0_0_40px_rgba(6,182,212,0.25)] ring-2 ring-cyan-500/30"
                : "bg-[#0E0B18] border-white/15 hover:border-white/30 shadow-xl"
            }`}
          >
            {/* Recommendation Ribbon */}
            {userOs === "windows" && (
              <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-[11px] font-black uppercase tracking-wider font-mono shadow-md">
                ★ Best for your PC
              </div>
            )}

            <div className="space-y-6">
              {/* Top Header & Icon */}
              <div className="flex items-center justify-between">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg text-white">
                  <Laptop size={30} />
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded-md bg-white/10 text-cyan-300 text-xs font-bold font-mono">
                    EXE Setup • v1.0.0
                  </span>
                  <span className="block text-[11px] text-zinc-400 font-mono mt-0.5">
                    106 MB • Windows 10/11 (64-bit)
                  </span>
                </div>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-black font-display text-white">
                  Sri Explainer for Windows
                </h2>
                <p className="text-zinc-300 text-xs sm:text-sm mt-1 leading-relaxed">
                  Dedicated desktop theater application with full hardware GPU acceleration, smooth keyboard controls, and multi-monitor support.
                </p>
              </div>

              {/* Feature Highlights List */}
              <div className="space-y-2.5 text-xs text-zinc-200">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-cyan-400 shrink-0" />
                  <span><strong>Hardware Accelerated 4K</strong>: Smooth 60fps playback without browser lag</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-cyan-400 shrink-0" />
                  <span><strong>Keyboard Theater Controls</strong>: Space to play/pause, F fullscreen, arrows seek</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-cyan-400 shrink-0" />
                  <span><strong>Zero Browser Clutter</strong>: Standalone distraction-free cinema mode</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-cyan-400 shrink-0" />
                  <span><strong>Desktop & Start Menu Shortcuts</strong>: One-click launch from Windows taskbar</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-cyan-400 shrink-0" />
                  <span><strong>Background Audio Mode</strong>: Minimize to tray while listening to story explainers</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-8 space-y-3">
              <a
                href={windowsDownloadUrl}
                download="SriExplainer-Setup.exe"
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-sm uppercase tracking-wider font-display flex items-center justify-center gap-3 shadow-[0_4px_20px_rgba(6,182,212,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Download size={18} />
                <span>Download for Windows (.exe)</span>
              </a>

              <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-zinc-400 font-mono">
                <span>Includes NSIS Windows Installer</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck size={12} /> 100% Virus Free
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* 4. INSTALLATION STEP-BY-STEP GUIDE */}
        <div className="rounded-3xl bg-[#0D0A16] border border-white/15 p-6 sm:p-10 space-y-8">
          <div className="text-center space-y-2">
            <h3 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-tight text-white">
              Easy 30-Second Installation Guide
            </h3>
            <p className="text-zinc-400 text-xs sm:text-sm font-primary">
              Follow these simple steps to install Sri Explainer on your smartphone or personal computer.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
            {/* Android Steps */}
            <div className="space-y-4 rounded-2xl bg-[#140F24] p-5 border border-purple-500/20">
              <div className="flex items-center gap-2.5 text-purple-300 font-bold font-display text-sm uppercase">
                <Smartphone size={18} />
                <span>Installing on Android</span>
              </div>

              <ol className="space-y-3 text-xs text-zinc-300 list-decimal list-inside font-primary leading-relaxed">
                <li className="pl-1">
                  Tap <strong className="text-white">Download Android APK</strong> button above to download <code className="text-purple-300 bg-white/5 px-1.5 py-0.5 rounded">SriExplainer.apk</code>.
                </li>
                <li className="pl-1">
                  Open your phone's notification shade or your <strong>Files / Downloads</strong> app and tap the downloaded APK file.
                </li>
                <li className="pl-1">
                  If prompted with <em>"Install unknown apps"</em>, tap <strong>Settings</strong> and enable <strong>Allow from this source</strong>.
                </li>
                <li className="pl-1">
                  Tap <strong>Install</strong>. Once done, open Sri Explainer and log in to start watching immediately!
                </li>
              </ol>
            </div>

            {/* Windows Steps */}
            <div className="space-y-4 rounded-2xl bg-[#0F1626] p-5 border border-cyan-500/20">
              <div className="flex items-center gap-2.5 text-cyan-300 font-bold font-display text-sm uppercase">
                <Laptop size={18} />
                <span>Installing on Windows</span>
              </div>

              <ol className="space-y-3 text-xs text-zinc-300 list-decimal list-inside font-primary leading-relaxed">
                <li className="pl-1">
                  Click <strong className="text-white">Download for Windows (.exe)</strong> button above to download <code className="text-cyan-300 bg-white/5 px-1.5 py-0.5 rounded">SriExplainer-Setup.exe</code>.
                </li>
                <li className="pl-1">
                  Double-click the downloaded setup file to launch the setup wizard.
                </li>
                <li className="pl-1">
                  If Windows SmartScreen prompts <em>"Windows protected your PC"</em>, click <strong>More info</strong> and select <strong>Run anyway</strong>.
                </li>
                <li className="pl-1">
                  Follow the on-screen installer steps. A shortcut will be placed on your desktop and Start Menu for instant access!
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* 5. FREQUENTLY ASKED QUESTIONS (FAQ) */}
        <div className="space-y-6 max-w-3xl mx-auto">
          <div className="text-center space-y-2">
            <h3 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-tight text-white flex items-center justify-center gap-2">
              <HelpCircle size={22} className="text-purple-400" />
              <span>Frequently Asked Questions</span>
            </h3>
            <p className="text-zinc-400 text-xs sm:text-sm font-primary">
              Got questions about our desktop and mobile apps? We've got answers.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl bg-[#0E0B18] border border-white/10 overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : index)}
                    className="w-full py-4 px-5 text-left flex items-center justify-between gap-4 text-sm font-bold text-white hover:text-purple-300 transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp size={18} className="shrink-0 text-purple-400" />
                    ) : (
                      <ChevronDown size={18} className="shrink-0 text-zinc-400" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-zinc-300 leading-relaxed font-primary border-t border-white/5">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* QR CODE MODAL FOR QUICK MOBILE DOWNLOAD */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#120D22] border border-purple-500/40 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
            >
              ✕
            </button>

            <div className="space-y-1">
              <h4 className="text-lg font-black font-display uppercase text-white">
                Scan with Phone Camera
              </h4>
              <p className="text-xs text-zinc-300">
                Point your mobile camera to download the Android APK directly.
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-inner mx-auto">
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https%3A%2F%2Fsriexplainer.in%2Fdownload&bgcolor=ffffff&color=000000"
                alt="QR Code for Sri Explainer App Download"
                className="w-44 h-44 object-contain"
              />
            </div>

            <p className="text-[11px] text-zinc-400 font-mono">
              https://sriexplainer.in/download
            </p>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
