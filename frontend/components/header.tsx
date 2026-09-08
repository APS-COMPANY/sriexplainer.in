"use client";

import Link from "next/link";
import {
  Home,
  Compass,
  Film,
  Tv,
  ListPlus,
  Bookmark,
  History,
  Settings,
  HelpCircle,
  Search,
  User,
  LogOut,
  Sparkles,
  Menu,
  X,
  Sun,
  Moon,
  Clock,
  ChevronDown,
  Trophy,
  Download,
  Flame,
  CheckCircle2,
  Coins,
  Shield
} from "lucide-react";
import { ScheduledBanner } from "./scheduled-banner";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, getToken, removeToken, image } from "../lib/api";
import { showSuccess } from "./notification-provider";
import { LogoutModal } from "./logout-modal";

export function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.301-.15-1.78-.879-2.056-.98-.276-.1-.477-.15-.678.15-.2.301-.778.98-.954 1.18-.176.2-.351.226-.652.075-.301-.15-1.272-.469-2.423-1.496-.895-.799-1.5-1.786-1.676-2.087-.176-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.176.2-.301.301-.502.101-.2.05-.376-.025-.527-.075-.15-.678-1.635-.929-2.238-.244-.588-.493-.508-.678-.517-.176-.009-.377-.009-.578-.009s-.528.075-.804.376c-.276.301-1.054 1.03-1.054 2.513s1.079 2.915 1.23 3.116c.15.201 2.122 3.24 5.141 4.544.718.31 1.279.495 1.716.634.722.23 1.378.197 1.898.12.579-.087 1.78-.727 2.031-1.429.251-.703.251-1.305.176-1.429-.075-.125-.276-.201-.577-.351zM12.004 21.75c-1.748 0-3.414-.45-4.885-1.242l-.35-.19-3.627.952.969-3.535-.208-.332A9.704 9.704 0 012.25 12.003c0-5.385 4.379-9.753 9.754-9.753 2.604 0 5.053 1.015 6.895 2.858 1.842 1.843 2.857 4.292 2.857 6.896 0 5.385-4.369 9.746-9.752 9.746zm0-17.75c-4.412 0-8.004 3.582-8.004 7.999 0 1.554.444 3.011 1.218 4.261l.193.315-.576 2.102 2.155-.565.303.18c1.205.719 2.593 1.107 4.711 1.107 4.412 0 8.004-3.582 8.004-8.001 0-2.137-.832-4.146-2.344-5.658-1.512-1.512-3.52-2.34-5.661-2.34z"/>
    </svg>
  );
}

export function TelegramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 8.16l-2.02 9.53c-.15.68-.56.84-1.13.52l-3.1-2.28-1.5 1.44c-.17.17-.31.31-.63.31l.22-3.17 5.77-5.21c.25-.22-.05-.34-.39-.12l-7.13 4.49-3.08-.96c-.67-.21-.68-.67.14-.99l12.05-4.64c.56-.2 1.05.14.8.99z"/>
    </svg>
  );
}

export function Header() {
  const [q, setQ] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [annDismissed, setAnnDismissed] = useState(false);
  const [logoErr, setLogoErr] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [browseOpen, setBrowseOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const browseRef = useRef<HTMLDivElement>(null);
  const r = useRouter();
  const pathname = usePathname();

  // Close browse dropdown when route changes
  useEffect(() => {
    setBrowseOpen(false);
    setDrawerOpen(false);
  }, [pathname]);

  // Handle click outside browse dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (browseRef.current && !browseRef.current.contains(event.target as Node)) {
        setBrowseOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Theme synchronization
  useEffect(() => {
    const saved = localStorage.getItem("sri_theme") as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
      if (saved === "light") document.documentElement.classList.add("light");
      else document.documentElement.classList.remove("light");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("sri_theme", next);
    document.documentElement.setAttribute("data-theme", next);
    if (next === "light") document.documentElement.classList.add("light");
    else document.documentElement.classList.remove("light");
  };

  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => (await api.get("/settings")).data,
    staleTime: 60000
  });

  const { data: announcement } = useQuery({
    queryKey: ["active-announcement"],
    queryFn: async () => (await api.get("/announcements/active")).data,
    staleTime: 30000
  });

  const { data: authData } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const token = getToken();
      if (!token) return null;
      try {
        const res = await api.get("/me");
        return res.data;
      } catch {
        return null;
      }
    },
    staleTime: 30000,
    retry: false
  });

  const currentUser = authData?.user || authData;
  const userEmail = (currentUser?.email || "").toLowerCase().trim();
  const initialLetter = userEmail ? userEmail.charAt(0).toUpperCase() : "";
  const isMainAdmin = Boolean(
    authData?.isMainAdmin ||
    currentUser?.isMainAdmin ||
    ["appua26145@gmail.com", "dddr04268@gmail.com"].includes(userEmail)
  );
  const isCoAdmin = Boolean(
    authData?.isCoAdmin ||
    currentUser?.isCoAdmin ||
    currentUser?.role === "co_admin"
  );
  const isAdmin = Boolean(
    currentUser?.role === "admin" ||
    isMainAdmin ||
    isCoAdmin
  );

  const customLogo = settings?.siteLogo || settings?.logoUrl || settings?.siteLogoUrl || "";
  const userXpCoins = Number(currentUser?.xpCoins || 0);

  useEffect(() => {
    const token = getToken();
    setIsLoggedIn(!!token || !!userEmail);
  }, [userEmail]);

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) {
      r.push(`/search?q=${encodeURIComponent(q.trim())}`);
      setDrawerOpen(false);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
    setDrawerOpen(false);
  };

  const executeLogout = () => {
    setShowLogoutModal(false);
    removeToken();
    setIsLoggedIn(false);
    showSuccess("Successfully signed out.", "Signed Out");
    window.location.href = "/login";
  };

  return (
    <>
      {/* 1. TOP GLOBAL ANNOUNCEMENT BANNER */}
      {announcement?.message && !annDismissed && (
        <div className="bg-white text-black text-xs font-black py-2 px-4 flex items-center justify-between shadow-md border-b border-black select-none z-50 relative font-mono">
          <div className="flex items-center justify-center gap-2 mx-auto truncate">
            <span>⚡ {announcement.message}</span>
            {announcement.link && (
              <a href={announcement.link} className="underline hover:text-black font-extrabold ml-1">
                Learn More →
              </a>
            )}
          </div>
          <button
            onClick={() => setAnnDismissed(true)}
            className="p-1 hover:bg-black/10 rounded transition-colors"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 2. MAIN HORIZONTAL TOP NAVIGATION HEADER */}
      <header className="sticky top-0 z-40 bg-[#000000]/95 backdrop-blur-xl border-b border-white/15 w-full select-none shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-3 lg:gap-6">
          {/* LEFT: Logo / Brand */}
          <Link href="/" className="flex items-center gap-2 xs:gap-2.5 sm:gap-3 shrink-0 group">
            <div className="h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10 rounded-xl overflow-hidden bg-white text-black flex items-center justify-center font-black text-xs xs:text-sm sm:text-base shadow-[2px_2px_0px_rgba(255,255,255,0.25)] border-2 border-white group-hover:scale-105 transition-transform shrink-0">
              {customLogo && !logoErr ? (
                <img
                  src={image(customLogo)}
                  alt="Logo"
                  onError={() => setLogoErr(true)}
                  className="h-full w-full object-contain p-0.5"
                />
              ) : (
                <span className="font-display font-black">S</span>
              )}
            </div>
            <span className="font-display font-black text-white text-xs xs:text-sm sm:text-base lg:text-lg tracking-tight leading-none group-hover:text-zinc-300 transition-colors uppercase whitespace-nowrap">
              SRI EXPLAINER
            </span>
          </Link>

          {/* LEFT-CENTER: Visually Prominent Manga Search Bar (Desktop / Tablet) */}
          <form onSubmit={go} className="hidden md:flex flex-1 max-w-xs lg:max-w-md relative">
            <div className="relative w-full">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search series, creators, episodes..."
                aria-label="Search series, creators, episodes"
                className="w-full py-2 pl-9 pr-8 text-xs sm:text-sm bg-[#0E0E0E] border-[1.5px] border-white/20 rounded-full focus:outline-none focus:border-white focus:bg-[#141414] focus:shadow-[2px_2px_0px_rgba(255,255,255,0.25)] text-white placeholder-zinc-400 transition-all font-primary"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </form>

          {/* CENTER: Main Horizontal Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            <Link
              href="/"
              className={`px-3.5 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider font-display transition-all ${
                pathname === "/"
                  ? "bg-white text-black shadow-[2px_2px_0px_rgba(255,255,255,0.25)] border border-white"
                  : "text-zinc-300 hover:text-white hover:bg-white/10"
              }`}
            >
              Home
            </Link>

            {/* Browse Dropdown */}
            <div className="relative" ref={browseRef}>
              <button
                onClick={() => setBrowseOpen(!browseOpen)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider font-display transition-all ${
                  browseOpen || pathname === "/ongoing" || pathname === "/completed"
                    ? "bg-white/15 text-white border border-white/30"
                    : "text-zinc-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>Browse</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${browseOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown Menu */}
              {browseOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-[#0E0E0E] border-[1.5px] border-white/20 rounded-2xl p-1.5 shadow-[3px_3px_0px_rgba(0,0,0,0.8)] z-50 space-y-0.5 animate-in fade-in zoom-in-95">
                  <Link
                    href="/ongoing"
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold font-primary transition-colors ${
                      pathname === "/ongoing" ? "bg-white text-black font-extrabold" : "text-zinc-300 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Tv size={15} />
                    <span>Ongoing Series</span>
                  </Link>
                  <Link
                    href="/completed"
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold font-primary transition-colors ${
                      pathname === "/completed" ? "bg-white text-black font-extrabold" : "text-zinc-300 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <CheckCircle2 size={15} />
                    <span>Completed Series</span>
                  </Link>
                </div>
              )}
            </div>

            <Link
              href="/my-list"
              className={`px-3.5 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider font-display transition-all ${
                pathname === "/my-list"
                  ? "bg-white text-black shadow-[2px_2px_0px_rgba(255,255,255,0.25)] border border-white"
                  : "text-zinc-300 hover:text-white hover:bg-white/10"
              }`}
            >
              My List
            </Link>

            <Link
              href="/pricing"
              className={`px-3.5 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider font-display transition-all ${
                pathname === "/pricing"
                  ? "bg-white text-black shadow-[2px_2px_0px_rgba(255,255,255,0.25)] border border-white"
                  : "text-zinc-300 hover:text-white hover:bg-white/10"
              }`}
            >
              XP Store
            </Link>

            <Link
              href="/download"
              className={`px-3.5 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider font-display transition-all flex items-center gap-1.5 ${
                pathname === "/download"
                  ? "bg-white text-black shadow-[2px_2px_0px_rgba(255,255,255,0.25)] border border-white"
                  : "text-purple-300 hover:text-white hover:bg-white/10 bg-purple-500/10 border border-purple-500/30"
              }`}
            >
              <Download size={13} className="text-purple-400" />
              <span>Get App</span>
            </Link>
          </nav>

          {/* RIGHT: Action & Account Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* XP Coins Balance Pill */}
            <Link
              href="/pricing"
              title="Buy XP Coins / Virtual Currency"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white hover:text-black border border-white/25 text-xs font-black text-white transition-all shadow-sm font-mono"
            >
              <span className="text-xs">💠</span>
              <span>{userXpCoins} XP</span>
            </Link>

            {/* Dark / Light Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-[#0E0E0E] border border-white/20 flex items-center justify-center text-zinc-300 hover:text-white hover:border-white transition-all shadow-sm active:scale-95"
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} className="text-zinc-800" />}
            </button>

            {/* Profile Avatar / Login Button */}
            <Link
              href="/profile"
              title="My Account Profile"
              className="flex items-center gap-2 p-0.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white text-black border border-white font-black text-xs sm:text-sm flex items-center justify-center shadow-[2px_2px_0px_rgba(255,255,255,0.25)] font-mono">
                {initialLetter ? (
                  <span>{initialLetter}</span>
                ) : (
                  <User size={15} />
                )}
              </div>
            </Link>

            {/* Hamburger Drawer Menu Button ☰ */}
            <button
              onClick={() => setDrawerOpen(!drawerOpen)}
              title="Navigation Menu"
              aria-label="Open Navigation Menu"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-[#0E0E0E] border border-white/20 flex items-center justify-center text-white hover:border-white hover:bg-white/10 transition-all shadow-sm"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>

        {/* MOBILE SEARCH BAR (ROW 2 UNDER 768PX) */}
        <div className="md:hidden px-4 pb-3 pt-1 border-t border-white/5">
          <form onSubmit={go} className="relative w-full">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search series, creators..."
              aria-label="Search series, creators"
              className="w-full py-1.5 pl-9 pr-8 text-xs bg-[#0E0E0E] border border-white/20 rounded-full focus:outline-none focus:border-white text-white placeholder-zinc-400 shadow-inner font-primary"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Clear mobile search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </form>
        </div>
      </header>

      {/* 2.5 UPCOMING SCHEDULED RELEASE BANNER */}
      <ScheduledBanner />

      {/* 3. SLIDE-OVER COMIC / MANGA NAVIGATION DRAWER */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end select-none">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <aside className="relative w-full max-w-xs sm:max-w-sm bg-[#080808] border-l-[1.5px] border-white/20 h-full p-6 flex flex-col justify-between overflow-y-auto shadow-2xl z-10 animate-in slide-in-from-right duration-200">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/15">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-white text-black font-black flex items-center justify-center text-xs border border-white shrink-0">
                    S
                  </div>
                  <span className="font-display font-black text-white text-sm sm:text-base uppercase tracking-tight">
                    SRI EXPLAINER
                  </span>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="h-8 w-8 rounded-xl bg-[#0E0E0E] border border-white/20 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Navigation Links Group */}
              <nav className="space-y-1.5 font-primary">
                <Link
                  href="/"
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    pathname === "/" ? "bg-white text-black font-black shadow-sm" : "text-zinc-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Home size={16} />
                  <span>Home</span>
                </Link>
                <Link
                  href="/my-list"
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    pathname === "/my-list" ? "bg-white text-black font-black shadow-sm" : "text-zinc-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <ListPlus size={16} />
                  <span>My List</span>
                </Link>
                <Link
                  href="/watch-later"
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    pathname === "/watch-later" ? "bg-white text-black font-black shadow-sm" : "text-zinc-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Bookmark size={16} />
                  <span>Watch Later</span>
                </Link>
                <Link
                  href="/history"
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    pathname === "/history" ? "bg-white text-black font-black shadow-sm" : "text-zinc-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <History size={16} />
                  <span>Watch History</span>
                </Link>
                <Link
                  href="/pricing"
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    pathname === "/pricing" ? "bg-white text-black font-black shadow-sm" : "text-zinc-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Coins size={16} />
                    <span>Buy XP Coins</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-mono font-bold">
                    {userXpCoins} XP
                  </span>
                </Link>
                <Link
                  href="/download"
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    pathname === "/download" ? "bg-white text-black font-black shadow-sm" : "text-purple-300 hover:text-white bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Download size={16} className="text-purple-400" />
                    <span>Download App (PC & APK)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold">
                    v1.2.1
                  </span>
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    pathname === "/profile" ? "bg-white text-black font-black shadow-sm" : "text-zinc-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <User size={16} />
                  <span>My Profile</span>
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      pathname.startsWith("/admin") ? "bg-white text-black font-black shadow-sm" : "text-zinc-300 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Shield size={16} />
                    <span>Admin Dashboard</span>
                  </Link>
                )}
              </nav>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="pt-6 border-t border-white/15 space-y-3">
              {isLoggedIn ? (
                <button
                  onClick={handleLogoutClick}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-full border border-rose-500/40 bg-rose-500/10 text-rose-400 font-extrabold text-xs hover:bg-rose-600 hover:text-white transition-all font-display uppercase tracking-wider"
                >
                  <LogOut size={15} />
                  <span>Log Out</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setDrawerOpen(false)}
                  className="manga-btn-primary w-full flex items-center justify-center gap-2 py-3 rounded-full bg-white text-black font-extrabold text-xs shadow-md font-display uppercase tracking-wider"
                >
                  <User size={15} />
                  <span>Sign In</span>
                </Link>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={executeLogout}
      />

      {/* 4. MOBILE BOTTOM NAVIGATION RAIL */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[calc(3.3rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-[#000000]/95 backdrop-blur-2xl border-t border-white/15 z-40 flex items-center justify-around px-3 text-center">
        <Link href="/" className={`flex flex-col items-center gap-0.5 text-[9px] font-extrabold whitespace-nowrap ${pathname === "/" ? "text-white" : "text-zinc-300"}`}>
          <Home size={17} />
          <span>Home</span>
        </Link>
        <Link href="/latest" className={`flex flex-col items-center gap-0.5 text-[9px] font-extrabold whitespace-nowrap ${pathname === "/latest" ? "text-white" : "text-zinc-300"}`}>
          <Compass size={17} />
          <span>Explore</span>
        </Link>
        <Link href="/my-list" className={`flex flex-col items-center gap-0.5 text-[9px] font-extrabold whitespace-nowrap ${pathname === "/my-list" ? "text-white" : "text-zinc-300"}`}>
          <ListPlus size={17} />
          <span>My List</span>
        </Link>
        <Link href="/pricing" className={`flex flex-col items-center gap-0.5 text-[9px] font-extrabold whitespace-nowrap ${pathname === "/pricing" ? "text-white" : "text-zinc-300"}`}>
          <Coins size={17} />
          <span>XP Coins</span>
        </Link>
        <button onClick={() => setDrawerOpen(true)} aria-label="Open navigation menu" className="flex flex-col items-center gap-0.5 text-[9px] font-extrabold whitespace-nowrap text-zinc-300 hover:text-white">
          <Menu size={17} />
          <span>Menu</span>
        </button>
      </nav>
    </>
  );
}
