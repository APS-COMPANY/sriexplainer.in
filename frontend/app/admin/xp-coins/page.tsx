"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, Search, Plus, Minus, ShieldCheck, ArrowLeft, RefreshCw } from "lucide-react";
import { api } from "../../../lib/api";
import { showSuccess, showError } from "../../../components/notification-provider";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  xpCoins: number;
  createdAt: string;
}

export default function AdminXpCoinsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [actionType, setActionType] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState<number>(50);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundOrderId, setRefundOrderId] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [isRefunding, setIsRefunding] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-xp-users", searchTerm],
    queryFn: async () => {
      const res = await api.get(`/admin/xp-coins?q=${encodeURIComponent(searchTerm)}`);
      return res.data;
    }
  });

  const users: UserItem[] = data?.users || [];

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundOrderId.trim() || isRefunding) return;

    setIsRefunding(true);
    try {
      const res = await api.post("/admin/xp-coins/refund", {
        order_id: refundOrderId.trim(),
        reason: refundReason.trim()
      });
      showSuccess(res.data?.message || "Refund processed successfully.");
      setShowRefundModal(false);
      setRefundOrderId("");
      setRefundReason("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["admin-xp-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
      queryClient.invalidateQueries({ queryKey: ["xp-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["user-xp"] });
    } catch (err: any) {
      showError(err.response?.data?.message || "Refund processing failed.");
    } finally {
      setIsRefunding(false);
    }
  };

  const handleUpdateCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || isSubmitting) return;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || !Number.isInteger(numAmount) || numAmount <= 0 || numAmount > 1000000) {
      showError("Invalid XP Coin amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post("/admin/xp-coins", {
        userId: selectedUser.id,
        action: actionType,
        amount: numAmount,
        note: note.trim()
      });
      showSuccess(res.data?.message || `${numAmount} XP Coins ${actionType === "add" ? "added" : "deducted"} successfully.`);
      setSelectedUser(null);
      setNote("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["admin-xp-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
      queryClient.invalidateQueries({ queryKey: ["xp-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["user-xp"] });
    } catch (err: any) {
      showError(err.response?.data?.message || "Failed to update XP Coins.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="shell py-10 min-h-screen select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <Link href="/admin" className="text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-1 mb-2 font-mono">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 font-display uppercase">
            <span className="text-3xl">💠</span> XP Coins Management
          </h1>
          <p className="text-zinc-400 text-xs mt-1 font-primary">
            Search users, view XP Coin balances, grant or adjust XP Coins, and process purchase refunds.
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono">
          <button
            onClick={() => setShowRefundModal(true)}
            className="px-5 py-2.5 rounded-full bg-rose-600/15 border border-rose-500/30 text-rose-300 hover:bg-rose-600 hover:text-white transition-colors flex items-center gap-2 text-xs font-bold"
          >
            <Minus size={14} /> Process Order Refund
          </button>
          <button
            onClick={() => refetch()}
            className="px-5 py-2.5 rounded-full bg-[#141414] border border-white/15 text-white hover:border-white transition-colors flex items-center gap-2 text-xs font-bold"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Search Bar & User Counter */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="p-2 rounded-full border-[1.5px] border-white/15 bg-[#0E0E0E] max-w-xl w-full">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-3 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by user email, name, or ID..."
              className="w-full py-2 pl-11 pr-4 text-xs bg-[#000000] border border-white/15 rounded-full text-white placeholder-zinc-500 focus:outline-none focus:border-white font-mono"
            />
          </div>
        </div>

        <div className="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-xs font-black font-mono">
          👥 Showing {users.length} of {data?.totalUsers || users.length} Registered Users
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl border-[1.5px] border-white/15 bg-[#0E0E0E] overflow-hidden shadow-[3px_3px_0px_rgba(0,0,0,0.8)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-[#000000] text-zinc-400 uppercase text-[10px] tracking-wider border-b border-white/15 font-mono">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">XP Coin Balance</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-zinc-500 font-mono">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-zinc-500 font-mono">
                    No users found matching "{searchTerm}"
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-black text-white font-display">
                      <div>{u.name || "User"}</div>
                      <div className="text-[11px] text-zinc-400 font-normal font-mono">{u.email}</div>
                    </td>
                    <td className="p-4 uppercase font-bold text-[10px] font-mono">
                      <span className={`px-2.5 py-0.5 rounded-full ${u.role === "admin" ? "bg-white/10 text-white border border-white/20" : "bg-[#000000] border border-white/15 text-zinc-400"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 font-mono">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#000000] border border-white/15 text-white font-black text-xs">
                        <span>💠</span> {Number(u.xpCoins || 0).toLocaleString()} XP
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setActionType("add");
                            setAmount(5);
                          }}
                          className="px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white hover:text-black text-xs font-bold flex items-center gap-1 transition-all"
                        >
                          <Plus size={13} /> Grant Coins
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setActionType("remove");
                            setAmount(5);
                          }}
                          className="px-3.5 py-1.5 rounded-full bg-rose-600/10 border border-rose-500/30 text-rose-300 hover:bg-rose-600 hover:text-white text-xs font-bold flex items-center gap-1 transition-all"
                        >
                          <Minus size={13} /> Adjust Coins
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Action Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm grid place-items-center p-4">
          <div className="bg-[#0E0E0E] max-w-md w-full p-8 border-[1.5px] border-white/20 rounded-3xl space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 font-mono">
            <h3 className="text-xl font-black text-white flex items-center gap-2 font-display uppercase">
              <span>{actionType === "add" ? "Grant XP Coins" : "Adjust / Remove XP Coins"}</span>
            </h3>
            <p className="text-xs text-zinc-300 font-primary">
              User: <strong className="text-white font-mono">{selectedUser.email}</strong> (Current Balance: {Number(selectedUser.xpCoins || 0).toLocaleString()} XP)
            </p>

            <form onSubmit={handleUpdateCoins} className="space-y-4 pt-2">
              <label className="block text-xs font-bold text-zinc-300">
                Amount of XP Coins
                <input
                  type="number"
                  min="1"
                  max="1000000"
                  step="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="mt-1.5 w-full py-2.5 px-4 bg-[#000000] border border-white/15 rounded-full text-white text-sm font-bold focus:outline-none focus:border-white"
                />
              </label>

              <label className="block text-xs font-bold text-zinc-300">
                Reason / Note (optional)
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Promotional Reward / Customer Support"
                  className="mt-1.5 w-full py-2.5 px-4 bg-[#000000] border border-white/15 rounded-full text-white text-xs focus:outline-none focus:border-white font-primary"
                />
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-full bg-[#141414] hover:border-white border border-white/15 text-white font-bold text-xs disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-full font-black text-xs text-black bg-white hover:bg-zinc-200 shadow-lg disabled:opacity-50 font-display uppercase tracking-wider"
                >
                  {isSubmitting ? "Processing..." : actionType === "add" ? "Confirm Grant" : "Confirm Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Refund Order Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm grid place-items-center p-4">
          <div className="bg-[#0E0E0E] max-w-md w-full p-8 border-[1.5px] border-rose-500/40 rounded-3xl space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 font-mono">
            <h3 className="text-xl font-black text-white flex items-center gap-2 font-display uppercase">
              <span className="text-rose-400">Process Order Refund</span>
            </h3>
            <p className="text-xs text-zinc-300 font-primary">
              Enter the payment Order ID (e.g. <code className="text-white font-mono">cf_17234...</code> or <code className="text-white font-mono">order_...</code>). The exact XP Coins granted for that order will be safely reversed.
            </p>

            <form onSubmit={handleProcessRefund} className="space-y-4 pt-2">
              <label className="block text-xs font-bold text-zinc-300">
                Order ID / Reference ID *
                <input
                  type="text"
                  required
                  value={refundOrderId}
                  onChange={(e) => setRefundOrderId(e.target.value)}
                  placeholder="e.g. cf_1739261543_891 or order_usr_..."
                  className="mt-1.5 w-full py-2.5 px-4 bg-[#000000] border border-white/15 rounded-full text-white text-xs font-mono focus:outline-none focus:border-white"
                />
              </label>

              <label className="block text-xs font-bold text-zinc-300">
                Refund Reason / Note (optional)
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Cashfree Customer Requested Refund"
                  className="mt-1.5 w-full py-2.5 px-4 bg-[#000000] border border-white/15 rounded-full text-white text-xs focus:outline-none focus:border-white font-primary"
                />
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  disabled={isRefunding}
                  className="flex-1 py-3 rounded-full bg-[#141414] border border-white/15 hover:border-white text-white font-bold text-xs disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRefunding}
                  className="flex-1 py-3 rounded-full font-black text-xs text-white bg-rose-600 hover:bg-rose-500 shadow-lg disabled:opacity-50 font-display uppercase tracking-wider"
                >
                  {isRefunding ? "Reversing Coins..." : "Confirm Reverse Refund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
