"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Eye,
  Globe,
  RefreshCw,
  Shield,
  ShieldAlert,
  Smartphone,
  TrendingUp,
  Users,
  Video,
  Clock,
  ArrowLeft,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Tv,
  Check,
  Zap,
  Radio,
  Sliders,
  ExternalLink,
  Layers
} from "lucide-react";
import { api } from "../../../lib/api";
import { showError, showSuccess } from "../../../components/notification-provider";

export default function AdminControlCenter() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "monetization" | "errors" | "audience">("overview");
  const [clearingLogs, setClearingLogs] = useState(false);
  const [togglingAds, setTogglingAds] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);

  // Fetch complete control center telemetry every 15 seconds
  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["admin-control-center"],
    queryFn: async () => (await api.get("/admin/control-center")).data,
    refetchInterval: 15000,
    retry: 1
  });

  const handleToggleAds = async () => {
    if (!data?.monetization) return;
    const nextState = !data.monetization.adsEnabled;
    setTogglingAds(true);
    try {
      await api.post("/admin/settings", { ads_enabled: nextState });
      showSuccess(nextState ? "Google Ads turned ON worldwide!" : "Google Ads PAUSED worldwide!");
      refetch();
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to update ads setting");
    } finally {
      setTogglingAds(false);
    }
  };

  const handleToggleMaintenance = async () => {
    if (!data?.controls) return;
    const nextState = !data.controls.maintenanceMode;
    setTogglingMaintenance(true);
    try {
      await api.post("/admin/settings", { maintenance_mode: nextState });
      showSuccess(nextState ? "Emergency Maintenance Mode ACTIVATED" : "Maintenance Mode DEACTIVATED");
      refetch();
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to update maintenance mode");
    } finally {
      setTogglingMaintenance(false);
    }
  };

  const handleClearErrorLogs = async () => {
    setClearingLogs(true);
    try {
      await api.post("/admin/health-analytics", { action: "clear_errors" });
      showSuccess("Error logs cleared successfully! System status reset to Optimal.");
      refetch();
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to clear error logs");
    } finally {
      setClearingLogs(false);
    }
  };

  if (error) {
    return (
      <main className="shell py-24 text-center">
        <div className="max-w-md mx-auto p-8 rounded-3xl bg-[#0E0E0E] border border-rose-500/30 shadow-2xl">
          <ShieldAlert size={48} className="text-rose-500 mx-auto mb-4 animate-bounce" />
          <h1 className="text-2xl font-black text-white font-display uppercase tracking-wide">
            Admin Access Required
          </h1>
          <p className="mt-2 text-sm text-zinc-400 font-primary leading-relaxed">
            Please sign in with an authorized administrator account to open the Sri Explainer Control Center.
          </p>
          <a
            href="/login"
            className="mt-6 inline-block rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg hover:opacity-90"
          >
            Sign In to Admin
          </a>
        </div>
      </main>
    );
  }

  const status = data?.systemStatus || "OPTIMAL";
  const monetization = data?.monetization;
  const traffic = data?.traffic;
  const health = data?.health;
  const controls = data?.controls;

  return (
    <main className="px-4 sm:px-8 py-8 w-full max-w-7xl 3xl:max-w-[2200px] 4xl:max-w-[2800px] mx-auto space-y-8 font-primary">
      {/* Executive Command Header */}
      <div className="relative overflow-hidden rounded-3xl border-[1.5px] border-white/15 bg-gradient-to-br from-[#120D1D] via-[#0E0E12] to-[#080808] p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.8)]">
        {/* Glow ambient decoration */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-600/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-pink-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs text-zinc-300 font-mono transition-all"
              >
                <ArrowLeft size={13} />
                <span>Standard Admin</span>
              </Link>

              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-black tracking-wider uppercase">
                <Radio size={12} className="text-purple-400 animate-pulse" />
                <span>Mission Control • Windows Desktop</span>
              </span>

              {status === "OPTIMAL" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                  <CheckCircle2 size={13} />
                  <span>SYSTEM OPTIMAL</span>
                </span>
              )}

              {status === "ATTENTION" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold animate-pulse">
                  <AlertTriangle size={13} />
                  <span>ATTENTION REQUIRED</span>
                </span>
              )}

              {status === "CRITICAL" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-mono font-bold animate-bounce">
                  <ShieldAlert size={13} />
                  <span>CRITICAL ALERTS</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight font-display uppercase">
              Sri Explainer Control Center
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Unified command system for Website and Mobile App. Real-time telemetry on Google monetization, server errors, and user audience traffic.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 font-mono">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={14} className={isFetching ? "animate-spin text-purple-400" : ""} />
              <span>{isFetching ? "Syncing..." : "Sync Telemetry"}</span>
            </button>

            <button
              onClick={handleClearErrorLogs}
              disabled={clearingLogs}
              className="px-4 py-3 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 size={14} />
              <span>{clearingLogs ? "Resetting..." : "Clear Errors"}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="relative z-10 flex flex-wrap gap-2 pt-6 mt-6 border-t border-white/10 font-mono">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === "overview"
                ? "bg-white text-black shadow-md scale-[1.02]"
                : "bg-white/5 border border-white/10 text-zinc-400 hover:text-white"
            }`}
          >
            <Activity size={14} />
            <span>Overview Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab("monetization")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === "monetization"
                ? "bg-white text-black shadow-md scale-[1.02]"
                : "bg-white/5 border border-white/10 text-zinc-400 hover:text-white"
            }`}
          >
            <DollarSign size={14} />
            <span>Monetization & Ads</span>
            {monetization?.adsEnabled ? (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px]">LIVE</span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px]">PAUSED</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("errors")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === "errors"
                ? "bg-white text-black shadow-md scale-[1.02]"
                : "bg-white/5 border border-white/10 text-zinc-400 hover:text-white"
            }`}
          >
            <AlertTriangle size={14} />
            <span>Error Radar</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${health?.errorsToday > 0 ? "bg-rose-500 text-white font-bold" : "bg-white/10 text-zinc-400"}`}>
              {health?.errorsToday || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("audience")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === "audience"
                ? "bg-white text-black shadow-md scale-[1.02]"
                : "bg-white/5 border border-white/10 text-zinc-400 hover:text-white"
            }`}
          >
            <Users size={14} />
            <span>Audience Traffic</span>
            <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px]">
              {traffic?.totalUsers || 0}
            </span>
          </button>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {(activeTab === "overview" || activeTab === "audience") && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <TrendingUp size={16} className="text-purple-400" />
              <span>Audience & Platform Vital Metrics</span>
            </h2>
            <span className="text-xs text-zinc-400 font-mono">
              Auto-refreshes every 15s
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 font-mono">
            {/* Total Users */}
            <div className="p-5 rounded-2xl bg-[#0E0E0E] border border-white/15 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold uppercase tracking-wider">Total Users</span>
                <Users size={18} className="text-purple-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-display">
                {traffic?.totalUsers?.toLocaleString() || 0}
              </div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-sans">
                <span>+{traffic?.newUsersToday || 0} registered today</span>
              </div>
            </div>

            {/* Total Video Views */}
            <div className="p-5 rounded-2xl bg-[#0E0E0E] border border-white/15 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold uppercase tracking-wider">Total Stream Views</span>
                <Eye size={18} className="text-cyan-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-display">
                {traffic?.totalViews?.toLocaleString() || 0}
              </div>
              <div className="text-[11px] text-zinc-400 font-sans">
                Across {traffic?.totalEpisodes || 0} published episodes
              </div>
            </div>

            {/* Total Watch Hours */}
            <div className="p-5 rounded-2xl bg-[#0E0E0E] border border-white/15 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold uppercase tracking-wider">Watch Time</span>
                <Clock size={18} className="text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-display">
                {traffic?.totalWatchHours?.toLocaleString() || 0} <span className="text-sm text-zinc-400">hrs</span>
              </div>
              <div className="text-[11px] text-zinc-400 font-sans">
                Accumulated viewing duration
              </div>
            </div>

            {/* Active Paid Subscribers */}
            <div className="p-5 rounded-2xl bg-[#0E0E0E] border border-white/15 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold uppercase tracking-wider">Paid Subscribers</span>
                <DollarSign size={18} className="text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-display">
                {traffic?.activeSubscribers || 0}
              </div>
              <div className="text-[11px] text-emerald-400 font-sans">
                ₹{monetization?.subscriptions?.totalRevenue?.toLocaleString() || 0} total revenue
              </div>
            </div>
          </div>

          {/* Top Series Leaderboard */}
          <div className="p-6 rounded-3xl bg-[#0E0E0E] border border-white/15 shadow-sm space-y-4">
            <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-mono flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Tv size={15} className="text-pink-400" />
                <span>Top 5 Trending Anime & Web Series</span>
              </span>
              <Link href="/admin" className="text-purple-400 hover:text-purple-300 normal-case font-sans text-xs">
                Manage Series →
              </Link>
            </h3>

            <div className="divide-y divide-white/10 font-sans">
              {(traffic?.topSeries || []).map((series: any, idx: number) => {
                const maxViews = traffic?.topSeries?.[0]?.views || 1;
                const percent = Math.min(100, Math.round(((series.views || 0) / maxViews) * 100));

                return (
                  <div key={series.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <span className="w-6 text-center text-xs font-mono font-black text-zinc-500">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-extrabold text-white truncate font-display">
                          {series.title}
                        </div>
                        <div className="w-full max-w-md bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:text-right shrink-0 font-mono">
                      <span className="text-sm font-black text-white font-display">
                        {(series.views || 0).toLocaleString()} <span className="text-[11px] font-normal text-zinc-400 font-sans">views</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MONETIZATION TAB */}
      {(activeTab === "overview" || activeTab === "monetization") && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-400" />
              <span>Monetization & Ad Network Command Center</span>
            </h2>

            {/* Master Ads Switch */}
            <div className="flex items-center gap-3 font-mono">
              <span className="text-xs text-zinc-300 font-bold hidden sm:inline">
                Master Ads Switch:
              </span>
              <button
                onClick={handleToggleAds}
                disabled={togglingAds}
                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  monetization?.adsEnabled
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                    : "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30"
                }`}
              >
                {monetization?.adsEnabled ? (
                  <>
                    <ToggleRight size={18} className="text-emerald-400" />
                    <span>ADS ACTIVE</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft size={18} className="text-rose-400" />
                    <span>ADS PAUSED</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
            {/* Google AdMob (Android App) */}
            <div className="p-6 rounded-3xl bg-[#0E0E0E] border border-white/15 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Smartphone size={18} className="text-purple-400" />
                  <span className="text-sm font-black text-white font-display uppercase tracking-wide">
                    Google AdMob (App)
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-black">
                  LIVE PRODUCTION
                </span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Native SDK monetization for Android app v1.2.5. Test devices disabled, pure live production units configured.
              </p>

              <div className="space-y-2.5 pt-2 font-mono text-[11px]">
                <div className="p-2.5 rounded-xl bg-[#000000] border border-white/10 space-y-1">
                  <span className="text-zinc-500 uppercase block text-[10px]">App ID</span>
                  <code className="text-purple-300 block truncate">{monetization?.googleAdMob?.appId}</code>
                </div>

                <div className="p-2.5 rounded-xl bg-[#000000] border border-white/10 space-y-1">
                  <span className="text-zinc-500 uppercase block text-[10px]">Home Banner Unit</span>
                  <code className="text-purple-300 block truncate">{monetization?.googleAdMob?.homeBannerId}</code>
                </div>

                <div className="p-2.5 rounded-xl bg-[#000000] border border-white/10 space-y-1">
                  <span className="text-zinc-500 uppercase block text-[10px]">Episode Interstitial Video Unit</span>
                  <code className="text-purple-300 block truncate">{monetization?.googleAdMob?.interstitialVideoId}</code>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-white/10 font-mono">
                <span>app-ads.txt:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Check size={12} /> Crawled & Active
                </span>
              </div>
            </div>

            {/* Google AdSense (Website) */}
            <div className="p-6 rounded-3xl bg-[#0E0E0E] border border-white/15 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Globe size={18} className="text-cyan-400" />
                  <span className="text-sm font-black text-white font-display uppercase tracking-wide">
                    Google AdSense (Web)
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-mono font-black">
                  CONNECTED
                </span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Client script loaded on sriexplainer.in with Google Auto-Ads enabled and crawler verification verified.
              </p>

              <div className="space-y-2.5 pt-2 font-mono text-[11px]">
                <div className="p-2.5 rounded-xl bg-[#000000] border border-white/10 space-y-1">
                  <span className="text-zinc-500 uppercase block text-[10px]">Publisher ID</span>
                  <code className="text-cyan-300 block truncate">{monetization?.googleAdSense?.publisherId}</code>
                </div>

                <div className="p-2.5 rounded-xl bg-[#000000] border border-white/10 space-y-1">
                  <span className="text-zinc-500 uppercase block text-[10px]">Client ID</span>
                  <code className="text-cyan-300 block truncate">{monetization?.googleAdSense?.clientId}</code>
                </div>

                <div className="p-2.5 rounded-xl bg-[#000000] border border-white/10 space-y-1">
                  <span className="text-zinc-500 uppercase block text-[10px]">Auto-Ads Status</span>
                  <span className="text-emerald-400 block font-bold">Enabled in layout.tsx</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-white/10 font-mono">
                <span>ads.txt:</span>
                <a
                  href="/ads.txt"
                  target="_blank"
                  className="text-cyan-400 hover:underline flex items-center gap-1 font-bold"
                >
                  <span>View Live</span>
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>

            {/* Subscriptions & Direct Revenue */}
            <div className="p-6 rounded-3xl bg-[#0E0E0E] border border-white/15 space-y-4 shadow-sm md:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Zap size={18} className="text-amber-400" />
                  <span className="text-sm font-black text-white font-display uppercase tracking-wide">
                    VIP Subscriptions
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-mono font-black">
                  CASHFREE GATEWAY
                </span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Direct monthly and yearly subscriber income processed via Cashfree UPI, Cards, and NetBanking.
              </p>

              <div className="space-y-2.5 pt-2 font-mono text-[11px]">
                <div className="p-2.5 rounded-xl bg-[#000000] border border-white/10 space-y-1">
                  <span className="text-zinc-500 uppercase block text-[10px]">Active Paying VIPs</span>
                  <span className="text-xl font-black text-white font-display block">
                    {monetization?.subscriptions?.activeSubscribers || 0}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#000000] border border-white/10 space-y-1">
                  <span className="text-zinc-500 uppercase block text-[10px]">Total Subscription Revenue</span>
                  <span className="text-xl font-black text-emerald-400 font-display block">
                    ₹{monetization?.subscriptions?.totalRevenue?.toLocaleString() || 0}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10">
                <Link
                  href="/admin/subscriptions"
                  className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs text-zinc-300 hover:text-white font-mono flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>Manage Subscriptions</span>
                  <ExternalLink size={11} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ERRORS & HEALTH TAB */}
      {(activeTab === "overview" || activeTab === "errors") && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <ShieldAlert size={16} className="text-rose-400" />
              <span>Real-Time Error Stream & Platform Health Radar</span>
            </h2>

            <button
              onClick={handleClearErrorLogs}
              disabled={clearingLogs}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 size={12} />
              <span>{clearingLogs ? "Clearing..." : "Clear Log"}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
            <div className="p-4 rounded-2xl bg-[#0E0E0E] border border-white/15">
              <span className="text-[11px] text-zinc-400 uppercase block">Errors Today</span>
              <span className={`text-xl sm:text-2xl font-black font-display ${health?.errorsToday > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                {health?.errorsToday || 0}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0E0E0E] border border-white/15">
              <span className="text-[11px] text-zinc-400 uppercase block">500 Server Errors</span>
              <span className={`text-xl sm:text-2xl font-black font-display ${health?.serverErrorsToday > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                {health?.serverErrorsToday || 0}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0E0E0E] border border-white/15">
              <span className="text-[11px] text-zinc-400 uppercase block">Open Bug Reports</span>
              <span className={`text-xl sm:text-2xl font-black font-display ${health?.openReports > 0 ? "text-amber-400" : "text-zinc-300"}`}>
                {health?.openReports || 0}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0E0E0E] border border-white/15">
              <span className="text-[11px] text-zinc-400 uppercase block">Security Threat Events</span>
              <span className="text-xl sm:text-2xl font-black text-cyan-400 font-display">
                {health?.securityEventsToday || 0}
              </span>
            </div>
          </div>

          {/* Recent Errors Table */}
          <div className="rounded-3xl bg-[#0E0E0E] border border-white/15 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-mono">
                Recent 20 Application Errors (Web & App)
              </h3>
              <span className="text-[11px] text-zinc-500 font-mono">
                Recorded in Turso Database
              </span>
            </div>

            {(!health?.recentErrors || health.recentErrors.length === 0) ? (
              <div className="py-12 text-center text-zinc-500 font-mono text-xs space-y-2">
                <CheckCircle2 size={32} className="text-emerald-500 mx-auto" />
                <p>No active errors! System is running cleanly at 100% health.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-zinc-400 text-[11px]">
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Method & Path</th>
                      <th className="py-2.5 px-3">Error Message</th>
                      <th className="py-2.5 px-3">Client IP</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {health.recentErrors.map((err: any) => {
                      const is500 = err.statusCode >= 500;
                      const is404 = err.statusCode === 404;

                      return (
                        <tr key={err.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                is500
                                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                  : is404
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              }`}
                            >
                              {err.statusCode || 500}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-white max-w-[200px] truncate">
                            <span className="text-zinc-500 mr-1.5">{err.method || "GET"}</span>
                            <span>{err.path}</span>
                          </td>
                          <td className="py-3 px-3 text-zinc-300 max-w-[320px] truncate">
                            {err.message || "Unknown error"}
                          </td>
                          <td className="py-3 px-3 text-zinc-500 text-[11px]">
                            {err.clientIp || "Direct"}
                          </td>
                          <td className="py-3 px-3 text-zinc-500 text-[11px] whitespace-nowrap">
                            {new Date(err.createdAt).toLocaleTimeString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PLATFORM CONTROLS TAB / FOOTER */}
      <div className="p-6 rounded-3xl bg-[#0E0E0E] border border-white/15 shadow-sm space-y-4 font-mono">
        <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
          <Sliders size={15} className="text-purple-400" />
          <span>Emergency Platform Controls</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-[#000000] border border-white/10 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-white">Emergency Maintenance Mode</div>
              <div className="text-[11px] text-zinc-400 font-sans">
                Temporarily pause public streaming and show maintenance message
              </div>
            </div>
            <button
              onClick={handleToggleMaintenance}
              disabled={togglingMaintenance}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                controls?.maintenanceMode
                  ? "bg-rose-500 text-white"
                  : "bg-white/10 text-zinc-400 hover:text-white"
              }`}
            >
              {controls?.maintenanceMode ? "ACTIVE" : "OFF"}
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-[#000000] border border-white/10 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-white">Android APK v1.2.5 Distribution</div>
              <div className="text-[11px] text-zinc-400 font-sans">
                Release live on GitHub Releases and https://sriexplainer.in/sriexplainer.apk
              </div>
            </div>
            <a
              href="https://github.com/APS-COMPANY/sriexplainer.in/releases/tag/v1.2.5"
              target="_blank"
              className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all shrink-0 flex items-center gap-1"
            >
              <span>Release</span>
              <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
