"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import Link from "next/link";
import { Search, Filter, ArrowUpDown, ShieldAlert, CheckCircle2, Clock, XCircle, Users, ArrowLeft, RefreshCw, Sparkles, UserCheck, Download } from "lucide-react";
import { showError, showWarning } from "../../../components/notification-provider";

export default function AdminSubscriptions() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("expiry_desc");
  const [refundTarget, setRefundTarget] = useState<{ subscriptionId: string; userId: string; userEmail: string; paymentId: string; amount: number } | null>(null);
  const [refunding, setRefunding] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<{ subscriptionId: string; userId: string; userEmail: string } | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [actionNotice, setActionNotice] = useState("");
  const [extendingId, setExtendingId] = useState<string | null>(null);

  // Manual Grant State
  const [grantEmail, setGrantEmail] = useState("");
  const [grantDuration, setGrantDuration] = useState<string>("30");
  const [granting, setGranting] = useState(false);
  const [grantNotice, setGrantNotice] = useState("");
  const [grantStatus, setGrantStatus] = useState<"success" | "error" | "">("");

  // Verify Admin session
  const { data: me, isLoading: isMeLoading, error: meError } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/auth/me")).data,
    retry: false
  });

  // Fetch Premium Subscriptions
  const { data: subData, isLoading, refetch } = useQuery({
    queryKey: ["admin-subscriptions", search, statusFilter, sortBy],
    queryFn: async () => {
      const res = await api.get("/admin/subscriptions", {
        params: { search, status: statusFilter, sortBy }
      });
      return res.data;
    },
    enabled: me?.role === "admin" || me?.role === "co_admin"
  });

  const handleGrantPremium = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantEmail.trim()) return;

    const daysNum = Number(grantDuration);
    if (!grantDuration || isNaN(daysNum) || daysNum <= 0 || !Number.isInteger(daysNum)) {
      setGrantStatus("error");
      setGrantNotice("Please enter a valid positive whole number of days (e.g. 1, 7, 30, 45, 90, 365, 1000).");
      return;
    }

    setGranting(true);
    setGrantNotice("");
    setGrantStatus("");
    try {
      const res = await api.post("/admin/subscriptions/grant-access", {
        email: grantEmail.trim(),
        days: daysNum
      });
      setGrantStatus("success");
      setGrantNotice(res.data?.message || `Premium access (${daysNum} Days) granted successfully to ${grantEmail}`);
      setGrantEmail("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (err: any) {
      setGrantStatus("error");
      setGrantNotice(err?.response?.data?.message || "User not found. Ask the user to create an account first.");
    } finally {
      setGranting(false);
    }
  };

  const handleRevokeGrant = async (email: string) => {
    if (!confirm(`Are you sure you want to revoke Admin-granted Premium for ${email}?`)) return;
    try {
      const res = await api.post("/admin/subscriptions/revoke-grant", { email });
      setActionNotice(res.data?.message || `Admin Premium revoked for ${email}`);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to revoke admin premium");
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    setActionNotice("");
    try {
      await api.post("/admin/subscriptions/cancel", {
        subscriptionId: cancelTarget.subscriptionId,
        userId: cancelTarget.userId
      });
      setActionNotice(`Premium membership cancelled for ${cancelTarget.userEmail}`);
      setCancelTarget(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  };

  const handleRefundConfirm = async () => {
    if (!refundTarget) return;
    setRefunding(true);
    setActionNotice("");
    try {
      await api.post("/admin/subscriptions/refund", {
        subscriptionId: refundTarget.subscriptionId,
        userId: refundTarget.userId,
        paymentId: refundTarget.paymentId,
        notes: "Full Refund & Access Revocation by Admin"
      });
      setActionNotice(`Full refund of ₹${refundTarget.amount} processed for ${refundTarget.userEmail}. Premium access revoked.`);
      setRefundTarget(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to process refund");
    } finally {
      setRefunding(false);
    }
  };

  const handleExtend = async (subscriptionId: string, userId: string, userEmail: string) => {
    const input = window.prompt(`Enter number of days to extend subscription for ${userEmail}:`, "30");
    if (!input) return;
    const days = parseInt(input.trim(), 10);
    if (isNaN(days) || days <= 0 || !Number.isInteger(days)) {
      showWarning("Please enter a valid positive whole number of days (e.g. 1, 7, 30, 45, 90, 365, 1000).", "Invalid Input");
      return;
    }

    setExtendingId(subscriptionId);
    setActionNotice("");
    try {
      await api.post("/admin/subscriptions/extend", {
        subscriptionId,
        userId,
        days
      });
      setActionNotice(`Subscription extended by ${days} days for ${userEmail}`);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to extend subscription");
    } finally {
      setExtendingId(null);
    }
  };

  if (isMeLoading) {
    return (
      <main className="px-4 sm:px-8 py-16 text-center select-none">
        <p className="text-zinc-400 text-sm">Verifying admin access...</p>
      </main>
    );
  }

  if (meError || (me?.role !== "admin" && me?.role !== "co_admin")) {
    return (
      <main className="px-4 sm:px-8 py-16 grid place-items-center select-none">
        <div className="rounded-3xl border border-rose-500/20 bg-gradient-to-b from-[#1F0A10]/90 to-[#0A0406]/95 max-w-md p-8 text-center space-y-4 shadow-2xl backdrop-blur-2xl">
          <ShieldAlert size={48} className="text-rose-500 mx-auto" />
          <h1 className="text-xl font-black text-white">Access Denied</h1>
          <p className="text-xs text-zinc-400">You must be logged in as an Administrator to access the Premium Management Panel.</p>
          <Link href="/login" className="inline-block px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 font-extrabold text-white text-xs shadow-lg">
            Sign In as Admin
          </Link>
        </div>
      </main>
    );
  }

  const stats = subData?.stats || { totalUsers: 0, activeUsers: 0, expiredUsers: 0, cancelledUsers: 0 };
  const subscriptions = subData?.subscriptions || [];

  return (
    <main className="px-4 sm:px-8 py-8 w-full max-w-7xl 3xl:max-w-[2200px] mx-auto space-y-8 select-none min-h-screen">
      {/* Sleek Top Banner Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#0F172A]/90 via-[#0B0F19]/90 to-[#05070E]/95 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl shadow-purple-950/20">
        <div className="absolute -top-24 -left-20 h-64 w-64 rounded-full bg-purple-600/20 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-violet-600/20 blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-purple-300 hover:text-white hover:border-purple-400/50 text-xs font-bold transition-all shadow-sm"
            >
              <ArrowLeft size={14} /> Back to Admin Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3 mt-1">
              <Sparkles className="text-purple-400" size={28} /> Admin Premium Management Panel
            </h1>
            <p className="text-xs text-[#94A3B8] max-w-2xl">
              Manage member subscriptions, view real-time expiry dates, grant manual entitlements, and manage cancellations/refunds.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/admin/export/csv`}
              download="subscriptions_report.csv"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:scale-[1.02] text-xs font-extrabold text-white shadow-[0_0_20px_rgba(139,44,255,0.4)] hover:shadow-[0_0_30px_rgba(139,44,255,0.6)] transition-all active:scale-95 border border-purple-400/30"
            >
              <Download size={15} /> Export CSV Report
            </a>

            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900/90 border border-white/10 hover:border-purple-400/50 text-xs font-bold text-white transition-all active:scale-95 shadow-sm"
            >
              <RefreshCw size={15} className={isLoading ? "animate-spin text-purple-400" : "text-purple-300"} />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>
      </div>

      {actionNotice && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-between shadow-lg">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice("")} className="text-emerald-400 font-extrabold hover:underline">Dismiss</button>
        </div>
      )}

      {/* MANUAL PREMIUM ACCESS GRANT CARD */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#0F172A]/90 via-[#0B0F19]/90 to-[#05070E]/95 p-6 sm:p-8 space-y-5 backdrop-blur-2xl shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">Manual Premium Access</h2>
            <p className="text-xs text-[#94A3B8]">
              Grant instant Premium streaming entitlement to any registered user by email. No payment required.
            </p>
          </div>
        </div>

        {grantNotice && (
          <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between ${
            grantStatus === "error"
              ? "bg-rose-500/10 border border-rose-500/30 text-rose-400"
              : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
          }`}>
            <span>{grantNotice}</span>
            <button onClick={() => setGrantNotice("")} className="underline text-[11px] font-extrabold">Dismiss</button>
          </div>
        )}

        <form onSubmit={handleGrantPremium} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="email"
              required
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
              placeholder="Enter user email (e.g. user@gmail.com)..."
              className="w-full px-4 py-3 bg-[#030712]/90 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all shadow-inner"
            />
          </div>

          <div className="w-full sm:w-44 flex items-center gap-2">
            <input
              type="number"
              min="1"
              step="1"
              required
              value={grantDuration}
              onChange={(e) => setGrantDuration(e.target.value)}
              placeholder="30"
              className="w-full px-4 py-3 bg-[#030712]/90 border border-white/10 rounded-xl text-xs font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-all shadow-inner"
            />
            <span className="text-xs font-black text-[#94A3B8] shrink-0 uppercase tracking-wider">Days</span>
          </div>

          <button
            type="submit"
            disabled={granting}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:scale-[1.01] font-extrabold text-white text-xs shadow-[0_0_20px_rgba(139,44,255,0.4)] transition-all disabled:opacity-50 shrink-0"
          >
            <Sparkles size={15} />
            <span>{granting ? "Granting..." : "Grant Premium Access"}</span>
          </button>
        </form>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {/* Total Premium Users */}
        <div className="group relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-[#110E24]/90 via-[#0A0914]/80 to-[#06050E]/95 p-6 backdrop-blur-xl transition-all duration-500 hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.25)] hover:-translate-y-1 space-y-3">
          <div className="flex items-center justify-between text-indigo-300/70">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Premium Users</span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Users size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">{stats.totalUsers}</p>
        </div>

        {/* Active Premium */}
        <div className="group relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-[#0B2418]/90 via-[#0A140F]/80 to-[#050E09]/95 p-6 backdrop-blur-xl transition-all duration-500 hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] hover:-translate-y-1 space-y-3">
          <div className="flex items-center justify-between text-emerald-300/70">
            <span className="text-[10px] font-black uppercase tracking-wider">Active Premium</span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-400 tracking-tight">{stats.activeUsers}</p>
        </div>

        {/* Expired Users */}
        <div className="group relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-[#241A0B]/90 via-[#14100A]/80 to-[#0E0B05]/95 p-6 backdrop-blur-xl transition-all duration-500 hover:border-amber-500/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.25)] hover:-translate-y-1 space-y-3">
          <div className="flex items-center justify-between text-amber-300/70">
            <span className="text-[10px] font-black uppercase tracking-wider">Expired Users</span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-400 tracking-tight">{stats.expiredUsers}</p>
        </div>

        {/* Cancelled Users */}
        <div className="group relative overflow-hidden rounded-3xl border border-rose-500/20 bg-gradient-to-br from-[#240B14]/90 via-[#140A0D]/80 to-[#0E0507]/95 p-6 backdrop-blur-xl transition-all duration-500 hover:border-rose-500/50 hover:shadow-[0_0_30px_rgba(244,63,94,0.25)] hover:-translate-y-1 space-y-3">
          <div className="flex items-center justify-between text-rose-300/70">
            <span className="text-[10px] font-black uppercase tracking-wider">Cancelled Users</span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <XCircle size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-rose-400 tracking-tight">{stats.cancelledUsers}</p>
        </div>
      </div>

      {/* Filters & Search Table */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#0F172A]/90 via-[#0B0F19]/90 to-[#05070E]/95 p-6 sm:p-8 space-y-6 backdrop-blur-2xl shadow-2xl">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by Gmail address or User ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#030712]/90 border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 transition-all shadow-inner"
            />
          </div>

          {/* Filter Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-[#030712]/90 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
              <Filter size={15} className="text-purple-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent border-none text-white focus:outline-none font-bold cursor-pointer"
              >
                <option value="all" className="bg-[#0B0F19]">All Memberships</option>
                <option value="active" className="bg-[#0B0F19]">Active Premium</option>
                <option value="expired" className="bg-[#0B0F19]">Expired</option>
                <option value="cancelled" className="bg-[#0B0F19]">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-[#030712]/90 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
              <ArrowUpDown size={15} className="text-purple-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border-none text-white focus:outline-none font-bold cursor-pointer"
              >
                <option value="expiry_desc" className="bg-[#0B0F19]">Expiry Date (Latest First)</option>
                <option value="expiry_asc" className="bg-[#0B0F19]">Expiry Date (Earliest First)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[#94A3B8] uppercase text-[10px] font-black tracking-wider bg-[#030712]/80">
                <th className="p-4 rounded-l-xl">User Details</th>
                <th className="p-4">Plan & Source</th>
                <th className="p-4">Payment ID</th>
                <th className="p-4">Purchase Date</th>
                <th className="p-4">Expiry Date</th>
                <th className="p-4">Days Left</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right rounded-r-xl">Admin Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-300">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-500 font-bold">Loading member records...</td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-500 font-bold">No member records match your search query.</td>
                </tr>
              ) : (
                subscriptions.map((sub: any) => (
                  <tr key={sub.subscriptionId} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <p className="font-extrabold text-white text-sm">{sub.userName}</p>
                      <p className="text-[#94A3B8] text-[11px] font-mono">{sub.userEmail}</p>
                      <p className="text-zinc-500 text-[10px] font-mono mt-0.5">ID: {sub.userId}</p>
                    </td>
                    <td className="p-4 font-medium">
                      <span className="text-white block font-bold">{sub.planName}</span>
                      {sub.paymentId === "ADMIN_GRANTED" || sub.source === "Admin Granted" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2.5 py-0.5 rounded-full mt-1">
                          <Sparkles size={10} /> Admin Granted
                        </span>
                      ) : (
                        <span className="text-amber-400 text-[11px] font-bold block mt-0.5">Paid (₹{sub.amount})</span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-zinc-400 text-[11px]">
                      {sub.paymentId}
                    </td>
                    <td className="p-4 text-[#94A3B8]">
                      {sub.purchaseDate ? new Date(sub.purchaseDate).toLocaleDateString("en-IN") : "N/A"}
                    </td>
                    <td className="p-4 text-white font-bold">
                      {sub.expiryDate ? new Date(sub.expiryDate).toLocaleDateString("en-IN") : "N/A"}
                    </td>
                    <td className="p-4 font-extrabold">
                      {sub.status === "active" ? (
                        <span className="text-emerald-400">{sub.remainingDays} days left</span>
                      ) : (
                        <span className="text-zinc-500">0 days</span>
                      )}
                    </td>
                    <td className="p-4">
                      {sub.status === "active" && (
                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black text-[10px] uppercase shadow-sm">
                          Active
                        </span>
                      )}
                      {sub.status === "expired" && (
                        <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-black text-[10px] uppercase shadow-sm">
                          Expired
                        </span>
                      )}
                      {sub.status === "cancelled" && (
                        <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-black text-[10px] uppercase shadow-sm">
                          Cancelled
                        </span>
                      )}
                      {sub.status === "refunded" && (
                        <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-black text-[10px] uppercase shadow-sm">
                          Refunded
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {sub.paymentId === "ADMIN_GRANTED" || sub.source === "Admin Granted" ? (
                          <button
                            onClick={() => handleRevokeGrant(sub.userEmail)}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 font-extrabold text-[11px] transition-all shadow-sm"
                          >
                            Revoke Admin Premium
                          </button>
                        ) : (
                          <>
                            {sub.status === "active" && (
                              <>
                                <button
                                  onClick={() => handleExtend(sub.subscriptionId, sub.userId, sub.userEmail)}
                                  disabled={extendingId === sub.subscriptionId}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 font-extrabold text-[11px] transition-all shadow-sm"
                                >
                                  {extendingId === sub.subscriptionId ? "Extending..." : "+ Extend Days"}
                                </button>
                                <button
                                  onClick={() => setRefundTarget({ subscriptionId: sub.subscriptionId, userId: sub.userId, userEmail: sub.userEmail, paymentId: sub.paymentId, amount: sub.amount })}
                                  className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 font-extrabold text-[11px] transition-all shadow-sm"
                                >
                                  Refund & Revoke
                                </button>
                                <button
                                  onClick={() => setCancelTarget({ subscriptionId: sub.subscriptionId, userId: sub.userId, userEmail: sub.userEmail })}
                                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 font-extrabold text-[11px] transition-all shadow-sm"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                            {sub.status !== "active" && (
                              <button
                                onClick={() => handleExtend(sub.subscriptionId, sub.userId, sub.userEmail)}
                                disabled={extendingId === sub.subscriptionId}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 font-extrabold text-[11px] transition-all shadow-sm"
                              >
                                Re-Activate (+30d)
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refund Confirmation Modal */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md grid place-items-center p-4">
          <div className="rounded-3xl border border-purple-500/30 bg-gradient-to-b from-[#1F0A24]/95 via-[#0F0717]/95 to-[#08040C]/98 max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-in fade-in">
            <div className="flex items-center gap-3 text-purple-400">
              <ShieldAlert size={28} />
              <h2 className="text-lg font-black text-white">Confirm Subscription Refund</h2>
            </div>
            <p className="text-xs text-zinc-300">
              Are you sure you want to process a full refund of <strong className="text-amber-400 font-extrabold">₹{refundTarget.amount}</strong> for this user?
            </p>
            <div className="p-4 rounded-2xl bg-[#030712]/90 border border-white/10 text-xs space-y-1 font-mono text-zinc-400">
              <p><strong className="text-white">User:</strong> {refundTarget.userEmail}</p>
              <p><strong className="text-white">Payment ID:</strong> {refundTarget.paymentId}</p>
              <p><strong className="text-white">Amount:</strong> ₹{refundTarget.amount}</p>
            </div>
            <p className="text-xs text-purple-300 font-bold">
              Notice: Processing a refund will automatically revoke Premium access, set status to Refunded, and update the database in real time.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRefundTarget(null)}
                disabled={refunding}
                className="px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-zinc-300 font-bold text-xs hover:text-white"
              >
                Cancel Action
              </button>
              <button
                onClick={handleRefundConfirm}
                disabled={refunding}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30"
              >
                {refunding ? "Refunding..." : "Confirm Full Refund"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md grid place-items-center p-4">
          <div className="rounded-3xl border border-rose-500/30 bg-gradient-to-b from-[#240A10]/95 via-[#17070B]/95 to-[#0C0406]/98 max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-in fade-in">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldAlert size={28} />
              <h2 className="text-lg font-black text-white">Confirm Subscription Cancellation</h2>
            </div>
            <p className="text-xs text-zinc-300">
              Are you sure you want to cancel this user's Premium membership?
            </p>
            <div className="p-4 rounded-2xl bg-[#030712]/90 border border-white/10 text-xs space-y-1 font-mono text-zinc-400">
              <p><strong className="text-white">User:</strong> {cancelTarget.userEmail}</p>
              <p><strong className="text-white">ID:</strong> {cancelTarget.userId}</p>
            </div>
            <p className="text-xs text-rose-400 font-bold">
              Notice: The user's account will immediately return to Free status.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
                className="px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-zinc-300 font-bold text-xs hover:text-white"
              >
                Keep Active
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={cancelling}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30"
              >
                {cancelling ? "Cancelling..." : "Yes, Cancel Premium"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
