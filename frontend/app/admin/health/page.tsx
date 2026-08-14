"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { showError, showSuccess } from "../../../components/notification-provider";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  MessageSquare,
  Shield,
  Users,
  Send,
  Save,
  Clock,
  ArrowLeft,
  Filter,
  Check,
  ChevronRight,
  Search,
  Globe
} from "lucide-react";
import { api } from "../../../lib/api";

export default function AdminHealthPage() {
  const [telegramInput, setTelegramInput] = useState("");
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [telegramNotice, setTelegramNotice] = useState("");
  const [reportFilter, setReportFilter] = useState<string>("ALL");
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);
  const [clearingLogs, setClearingLogs] = useState(false);

  const handleClearErrorLogs = async () => {
    setClearingLogs(true);
    try {
      await api.post("/admin/health-analytics", { action: "clear_errors" });
      showSuccess("Error logs cleared and system status reset to HEALTHY!");
      refetch();
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to clear error logs");
    } finally {
      setClearingLogs(false);
    }
  };

  // 1. Fetch Health Analytics & Stats
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-health-analytics"],
    queryFn: async () => (await api.get("/admin/health-analytics")).data,
    refetchInterval: 30000
  });

  // 1b. Fetch SEO Engine Stats
  const { data: seoData, refetch: refetchSeo } = useQuery({
    queryKey: ["admin-seo-stats"],
    queryFn: async () => (await api.get("/admin/seo-stats")).data,
    refetchInterval: 60000
  });

  // 2. Fetch User Reports
  const { data: reportsData, refetch: refetchReports } = useQuery({
    queryKey: ["admin-user-reports", reportFilter],
    queryFn: async () => (await api.get(`/admin/reports?status=${reportFilter}`)).data,
    refetchInterval: 30000
  });

  // 3. Fetch Settings (Telegram ID)
  const { data: settingsData, refetch: refetchSettings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const res = await api.get("/settings");
      if (res.data?.supportTelegram || res.data?.telegram_url) {
        setTelegramInput(res.data.supportTelegram || res.data.telegram_url || "");
      }
      return res.data;
    }
  });

  // 4. Fetch NASA Cyber Shield Firewall Data & Banned IPs
  const { data: firewallData, refetch: refetchFirewall } = useQuery({
    queryKey: ["admin-firewall-bans"],
    queryFn: async () => (await api.get("/admin/firewall")).data,
    refetchInterval: 10000
  });

  const [manualIp, setManualIp] = useState("");
  const [manualReason, setManualReason] = useState("");
  const [banningIp, setBanningIp] = useState(false);

  const handleBanIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIp.trim()) return;
    setBanningIp(true);
    try {
      await api.post("/admin/firewall", {
        action: "ban",
        ipAddress: manualIp.trim(),
        reason: manualReason || "Manual Admin Ban"
      });
      showSuccess(`IP ${manualIp} has been auto-banned by NASA Cyber Shield!`);
      setManualIp("");
      setManualReason("");
      refetchFirewall();
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to ban IP address.");
    } finally {
      setBanningIp(false);
    }
  };

  const handleUnbanIp = async (ip: string) => {
    try {
      await api.post("/admin/firewall", { action: "unban", ipAddress: ip });
      showSuccess(`IP ${ip} has been unbanned.`);
      refetchFirewall();
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to unban IP.");
    }
  };

  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTelegram(true);
    setTelegramNotice("");
    try {
      const res = await api.post("/admin/settings", {
        supportTelegram: telegramInput.trim(),
        telegram_url: telegramInput.trim()
      });
      if (res.data?.supportTelegram) {
        setTelegramInput(res.data.supportTelegram);
      }
      setTelegramNotice("✓ Telegram setting saved successfully!");
      refetchSettings();
    } catch (err: any) {
      setTelegramNotice(err?.response?.data?.message || "Unable to save Telegram setting. Please try again.");
    } finally {
      setSavingTelegram(false);
    }
  };

  const handleUpdateReportStatus = async (reportId: string, newStatus: string) => {
    setUpdatingReportId(reportId);
    try {
      await api.patch(`/admin/reports/${reportId}`, { status: newStatus });
      refetchReports();
      refetch();
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingReportId(null);
    }
  };

  const stats = data?.stats || {
    totalReports: 0,
    openReports: 0,
    inProgressReports: 0,
    resolvedReports: 0,
    closedReports: 0,
    errorsToday: 0,
    totalErrors: 0,
    serverErrors: 0,
    securityEvents: 0,
    activeUsers: 0,
    totalSeries: 0,
    totalEpisodes: 0
  };

  const healthStatus: "HEALTHY" | "DEGRADED" | "CRITICAL" = data?.healthStatus || "HEALTHY";
  const recentErrors = Array.isArray(data?.recentErrors) ? data.recentErrors : [];
  const reportsList = Array.isArray(reportsData?.reports) ? reportsData.reports : [];

  const handleDownloadExcel = async () => {
    try {
      const token = typeof window !== "undefined" ? (localStorage.getItem("sri_auth_token") || localStorage.getItem("token") || "") : "";
      const res = await fetch("/api/admin/export-excel", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to generate Excel report");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sri_explainer_daily_report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      showError(err?.message || "Failed to download Excel report");
    }
  };

  return (
    <main className="px-4 sm:px-8 py-8 w-full max-w-7xl 3xl:max-w-[2200px] mx-auto space-y-8 select-none min-h-screen">
      {/* Sleek Top Banner & Header Bar */}
      <div className="relative overflow-hidden rounded-3xl border-[1.5px] border-white/15 bg-[#0E0E0E] p-6 sm:p-8 shadow-[3px_3px_0px_rgba(0,0,0,0.8)]">
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#141414] border border-white/15 text-zinc-300 hover:text-white hover:border-white text-xs font-bold transition-all shadow-sm font-mono"
            >
              <ArrowLeft size={14} /> Back to Admin Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3 mt-1 font-display uppercase">
              <Activity className="text-white animate-pulse" size={28} /> Website Health & Issue Analytics
            </h1>
            <p className="text-xs text-zinc-400 max-w-2xl font-primary">
              Real-time monitoring of user issue reports, application errors, system status, SEO health score, and support contact details.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap font-mono">
            <button
              onClick={handleDownloadExcel}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-black shadow-[2px_2px_0px_rgba(255,255,255,0.25)] transition-all hover:scale-[1.02] active:scale-95"
            >
              <span>📊 Download Daily Excel</span>
            </button>

            <button
              onClick={() => { refetch(); refetchReports(); refetchSeo(); }}
              disabled={isFetching}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#141414] border border-white/15 hover:border-white text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-50 shadow-sm"
            >
              <RefreshCw size={15} className={isFetching ? "animate-spin text-white" : "text-zinc-300"} />
              <span>{isFetching ? "Refreshing..." : "Refresh"}</span>
            </button>

            <button
              onClick={handleClearErrorLogs}
              disabled={clearingLogs}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-rose-500/10 border border-rose-500/30 hover:bg-rose-600 text-xs font-bold text-rose-300 hover:text-white transition-all active:scale-95 disabled:opacity-50 shadow-sm"
            >
              <CheckCircle2 size={15} className="text-rose-400" />
              <span>{clearingLogs ? "Clearing..." : "Clear Logs"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* HEALTH OVERVIEW CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* Status Card */}
        <div className="group relative overflow-hidden rounded-3xl border-[1.5px] border-white/15 bg-[#0E0E0E] p-6 transition-all duration-300 hover:border-white shadow-[2px_2px_0px_rgba(0,0,0,0.8)] space-y-4">
          <div className="flex items-center justify-between text-zinc-400 font-mono">
            <span className="text-[10px] font-black uppercase tracking-wider">System Status</span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-white border border-white/20">
              <Activity size={16} />
            </div>
          </div>
          <div>
            {healthStatus === "HEALTHY" && (
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black font-mono">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> HEALTHY
              </span>
            )}
            {healthStatus === "DEGRADED" && (
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black font-mono">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" /> DEGRADED
              </span>
            )}
            {healthStatus === "CRITICAL" && (
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-black font-mono">
                <span className="h-2 w-2 rounded-full bg-rose-400 animate-ping" /> CRITICAL
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400 font-primary">
            {healthStatus === "HEALTHY" ? "All services running smoothly with low error rate." : "Elevated error rate detected."}
          </p>
        </div>

        {/* SEO Engine Health Card */}
        <div className="group relative overflow-hidden rounded-3xl border-[1.5px] border-white/15 bg-[#0E0E0E] p-6 transition-all duration-300 hover:border-white shadow-[2px_2px_0px_rgba(0,0,0,0.8)] space-y-3">
          <div className="flex items-center justify-between text-zinc-400 font-mono">
            <span className="text-[10px] font-black uppercase tracking-wider">SEO Engine Health</span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-white border border-white/20">
              <Search size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight font-display">
            {seoData?.seoScore ?? 100}%
          </p>
          <p className="text-[11px] text-zinc-400 font-mono">
            {seoData?.totalIndexedUrls ?? 0} URLs indexed
          </p>
        </div>

        {/* Open Reports Card */}
        <div className="group relative overflow-hidden rounded-3xl border-[1.5px] border-white/15 bg-[#0E0E0E] p-6 transition-all duration-300 hover:border-white shadow-[2px_2px_0px_rgba(0,0,0,0.8)] space-y-3">
          <div className="flex items-center justify-between text-zinc-400 font-mono">
            <span className="text-[10px] font-black uppercase tracking-wider">Open Reports</span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-white border border-white/20">
              <MessageSquare size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight font-display">{stats.openReports}</p>
          <p className="text-[11px] text-zinc-400 font-mono">
            {stats.totalReports} total submitted
          </p>
        </div>

        {/* Errors Today Card */}
        <div className="group relative overflow-hidden rounded-3xl border-[1.5px] border-white/15 bg-[#0E0E0E] p-6 transition-all duration-300 hover:border-white shadow-[2px_2px_0px_rgba(0,0,0,0.8)] space-y-3">
          <div className="flex items-center justify-between text-zinc-400 font-mono">
            <span className="text-[10px] font-black uppercase tracking-wider">Errors Today</span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-white border border-white/20">
              <AlertTriangle size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight font-display">{stats.errorsToday}</p>
          <p className="text-[11px] text-zinc-400 font-mono">
            {stats.serverErrors} server 500 errors
          </p>
        </div>

        {/* Security & Active Users Card */}
        <div className="group relative overflow-hidden rounded-3xl border-[1.5px] border-white/15 bg-[#0E0E0E] p-6 transition-all duration-300 hover:border-white shadow-[2px_2px_0px_rgba(0,0,0,0.8)] space-y-3">
          <div className="flex items-center justify-between text-zinc-400 font-mono">
            <span className="text-[10px] font-black uppercase tracking-wider">Security & Users</span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-white border border-white/20">
              <Shield size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight font-display">{stats.activeUsers}</p>
          <p className="text-[11px] text-zinc-400 font-mono">
            {stats.securityEvents || 0} security events
          </p>
        </div>
      </div>

      {/* TELEGRAM SUPPORT CONFIGURATION CARD */}
      <div className="rounded-3xl border-[1.5px] border-white/15 bg-[#0E0E0E] p-6 sm:p-8 space-y-5 shadow-[3px_3px_0px_rgba(0,0,0,0.8)] max-w-3xl">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 text-white border border-white/20">
            <Send size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight font-display uppercase">Support Telegram Contact</h2>
            <p className="text-xs text-zinc-400 font-primary">
              Configure the public Telegram ID displayed to users when they click "Contact on Telegram".
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <form onSubmit={handleSaveTelegram} className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="text"
              value={telegramInput}
              onChange={(e) => setTelegramInput(e.target.value)}
              placeholder="e.g. @YourTelegramID or https://t.me/YourTelegramID"
              className="flex-1 px-4 py-2.5 bg-[#000000] border border-white/15 rounded-full text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-all font-mono"
            />
            <button
              type="submit"
              disabled={savingTelegram}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 font-black text-xs shadow-[2px_2px_0px_rgba(255,255,255,0.25)] transition-all disabled:opacity-50 shrink-0 font-display uppercase tracking-wider"
            >
              <Save size={15} />
              <span>{savingTelegram ? "Saving..." : "Save Telegram"}</span>
            </button>
          </form>

          <button
            type="button"
            onClick={async () => {
              try {
                const res = await api.post("/admin/test-alert");
                setTelegramNotice(res.data?.message || "✓ Test alert sent successfully!");
              } catch (err: any) {
                showError(err?.response?.data?.message || "Failed to trigger test alert");
              }
            }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#141414] border border-white/15 text-zinc-300 hover:text-white hover:border-white font-extrabold text-xs transition-all shrink-0 font-mono"
          >
            <Send size={15} />
            <span>Test Alert</span>
          </button>
        </div>

        {telegramNotice && (
          <p className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 font-mono">
            <Check size={15} /> {telegramNotice}
          </p>
        )}
      </div>

      {/* NASA CYBER SHIELD AUTOMATED FIREWALL & BANNED IPS SECTION */}
      <div className="rounded-3xl border-[1.5px] border-white/15 bg-[#0E0E0E] p-6 sm:p-8 space-y-6 shadow-[3px_3px_0px_rgba(0,0,0,0.8)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[11px] font-black uppercase tracking-widest font-mono">
              <Shield className="text-white animate-pulse" size={14} /> NASA Cyber Defense Shield
            </div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3 font-display uppercase">
              Automated Intrusion Prevention & Firewall Banning
            </h2>
            <p className="text-xs text-zinc-400 font-primary">
              Real-time signature inspection auto-blocks SQL Injections, XSS scripts, path traversals, and DDoS flooding attacks. Attacker IPs are permanently auto-banned and alerted to Telegram.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap font-mono">
            <button
              onClick={async () => {
                try {
                  const res = await api.post("/admin/firewall", { action: "test_autoban", ipAddress: "test" });
                  showSuccess(res.data?.message || "✓ Test Auto-Ban triggered!");
                  refetchFirewall();
                } catch (err: any) {
                  showError(err?.response?.data?.message || "Failed to trigger test auto-ban");
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#141414] border border-white/15 text-zinc-300 hover:text-white hover:border-white text-xs font-bold transition-all active:scale-95 shadow-sm"
            >
              <Shield size={14} className="text-white" />
              <span>🧪 Test Auto-Ban</span>
            </button>

            <div className="flex items-center gap-2 bg-[#000000] border border-white/15 px-4 py-2 rounded-full text-white text-xs font-black shrink-0">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Shield Active: {(firewallData?.bannedIps || []).length} IPs Banned</span>
            </div>
          </div>
        </div>

        {/* Manual Ban IP Form */}
        <form onSubmit={handleBanIp} className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-[#000000] p-4 rounded-2xl border border-white/15">
          <div className="sm:col-span-4">
            <input
              type="text"
              value={manualIp}
              onChange={(e) => setManualIp(e.target.value)}
              placeholder="IP Address (e.g. 185.220.101.4)"
              className="w-full px-4 py-2.5 bg-[#0E0E0E] border border-white/15 rounded-full text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white font-mono"
              required
            />
          </div>
          <div className="sm:col-span-5">
            <input
              type="text"
              value={manualReason}
              onChange={(e) => setManualReason(e.target.value)}
              placeholder="Ban Reason (e.g. Suspicious DDoS / Brute Force Probe)"
              className="w-full px-4 py-2.5 bg-[#0E0E0E] border border-white/15 rounded-full text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white font-primary"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={banningIp}
              className="w-full py-2.5 px-4 rounded-full bg-white text-black hover:bg-zinc-200 font-black text-xs shadow-[2px_2px_0px_rgba(255,255,255,0.25)] transition-all flex items-center justify-center gap-2 font-display uppercase tracking-wider"
            >
              <Shield size={14} />
              <span>{banningIp ? "Banning..." : "Auto-Ban IP"}</span>
            </button>
          </div>
        </form>

        {/* Banned IPs Table */}
        <div className="overflow-x-auto rounded-2xl border border-white/15 bg-[#000000]">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-white/5 uppercase text-[10px] font-black text-white tracking-wider font-mono">
              <tr>
                <th className="p-3.5">IP Address</th>
                <th className="p-3.5">Attack Signature / Reason</th>
                <th className="p-3.5">Attack Payload Snippet</th>
                <th className="p-3.5">Banned Date</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(firewallData?.bannedIps || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-zinc-500 text-xs font-mono">
                    🛡️ No IPs currently banned. NASA Cyber Shield is monitoring all incoming traffic 24/7.
                  </td>
                </tr>
              ) : (
                (firewallData?.bannedIps || []).map((item: any) => (
                  <tr key={item.ipAddress} className="hover:bg-white/5 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-white">{item.ipAddress}</td>
                    <td className="p-3.5 font-semibold text-white">{item.attackType || item.reason}</td>
                    <td className="p-3.5 font-mono text-[11px] text-zinc-400 max-w-xs truncate" title={item.payload}>
                      {item.payload || "Auto-detected malicious probe"}
                    </td>
                    <td className="p-3.5 text-zinc-400 text-[11px] font-mono">
                      {new Date(item.bannedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleUnbanIp(item.ipAddress)}
                        className="px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-white font-bold hover:bg-white hover:text-black text-[11px] transition-all font-mono"
                      >
                        Unban IP
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* USER ISSUE REPORTS MANAGEMENT SECTION */}
      <div className="rounded-3xl border-[1.5px] border-white/15 bg-[#0E0E0E] p-6 sm:p-8 space-y-6 shadow-[3px_3px_0px_rgba(0,0,0,0.8)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3 font-display uppercase">
              <MessageSquare size={22} className="text-white" /> User Issue Reports & Complaints
            </h2>
            <p className="text-xs text-zinc-400 mt-1 font-primary">
              Review problems reported by website visitors and update resolution status in real-time.
            </p>
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none max-w-full p-1.5 bg-[#000000] rounded-full border border-white/15 font-mono">
            {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((st) => (
              <button
                key={st}
                onClick={() => setReportFilter(st)}
                className={`px-4 py-1.5 rounded-full text-xs font-black transition-all duration-200 shrink-0 ${
                  reportFilter === st
                    ? "bg-white text-black shadow-[2px_2px_0px_rgba(255,255,255,0.25)] border border-white scale-[1.02]"
                    : "bg-[#0E0E0E] border border-white/15 text-zinc-400 hover:text-white hover:border-white"
                }`}
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Reports Table */}
        <div className="overflow-x-auto scrollbar-none">
          {reportsList.length === 0 ? (
            <div className="text-center py-10 text-xs text-zinc-400 font-medium bg-[#000000] rounded-2xl border border-white/10 font-mono">
              No issue reports found matching status "{reportFilter}".
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/15 text-zinc-400 uppercase text-[10px] font-black tracking-wider bg-[#000000] font-mono">
                  <th className="p-4 rounded-l-xl">Date</th>
                  <th className="p-4">Issue Type</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Page Route</th>
                  <th className="p-4">Contact / User</th>
                  <th className="p-4 text-right rounded-r-xl">Status Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reportsList.map((r: any) => (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 text-zinc-400 whitespace-nowrap font-mono">
                      {new Date(r.createdAt).toLocaleDateString()} {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4 font-bold text-white">
                      <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[10px] font-black font-mono">
                        {r.issueType}
                      </span>
                    </td>
                    <td className="p-4 text-white max-w-xs truncate font-primary" title={r.description}>
                      {r.description}
                    </td>
                    <td className="p-4 text-zinc-400 font-mono text-[11px]">
                      {r.pageRoute || "/"}
                    </td>
                    <td className="p-4 text-zinc-400 font-mono">
                      {r.userEmail || r.contactInfo || "Anonymous"}
                    </td>
                    <td className="p-4 text-right">
                      <select
                        value={r.status || "OPEN"}
                        disabled={updatingReportId === r.id}
                        onChange={(e) => handleUpdateReportStatus(r.id, e.target.value)}
                        className="px-3 py-1.5 rounded-full text-xs font-black bg-[#000000] border border-white/20 text-white focus:outline-none cursor-pointer font-mono"
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* RECENT APPLICATION ERRORS SECTION */}
      <div className="rounded-3xl border-[1.5px] border-white/15 bg-[#0E0E0E] p-6 sm:p-8 space-y-6 shadow-[3px_3px_0px_rgba(0,0,0,0.8)]">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3 font-display uppercase">
              <AlertTriangle size={22} className="text-white" /> Recent Application Errors & Logs
            </h2>
            <p className="text-xs text-zinc-400 mt-1 font-primary">
              Sanitized application error events captured automatically by the backend system.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-none">
          {recentErrors.length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-300 font-extrabold flex items-center justify-center gap-2 bg-[#000000] rounded-2xl border border-white/10 font-mono">
              <CheckCircle2 size={18} className="text-emerald-400" /> No application errors recorded recently!
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/15 text-zinc-400 uppercase text-[10px] font-black tracking-wider bg-[#000000] font-mono">
                  <th className="p-4 rounded-l-xl">Time</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Route</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 rounded-r-xl">Sanitized Error Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentErrors.map((err: any) => (
                  <tr key={err.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 text-zinc-400 whitespace-nowrap font-mono">
                      {new Date(err.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="p-4 font-bold text-white">
                      <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[10px] font-black font-mono">
                        {err.errorType}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-400 font-mono text-[11px]">
                      {err.route || "/"}
                    </td>
                    <td className="p-4 font-bold text-white">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black font-mono bg-white/10 text-white border border-white/20">
                        {err.statusCode || 500}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-300 font-mono text-[11px] max-w-md truncate" title={err.message}>
                      {err.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
