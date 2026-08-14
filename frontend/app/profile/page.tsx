"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, removeToken } from "../../lib/api";
import { Shield, LogOut, User as UserIcon, Heart, History, Award, KeyRound, Phone, Clock, FileText, Trash2, X, Check, Camera, Bookmark, HelpCircle, Newspaper, Tv } from "lucide-react";
import { SupportSection } from "../../components/support-section";
import { showSuccess, showError } from "../../components/notification-provider";
import { LogoutModal } from "../../components/logout-modal";

export default function Profile() {
  const [activeTab, setActiveTab] = useState<"overview" | "settings" | "security" | "history">("overview");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [changingPass, setChangingPass] = useState(false);
  const [passMsg, setPassMsg] = useState("");

  const [showInvoice, setShowInvoice] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [delPass, setDelPass] = useState("");
  const [deleting, setDeleting] = useState(false);

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.get("/me");
      return res.data;
    },
    retry: false
  });

  const { data: loginHistoryData } = useQuery({
    queryKey: ["login-history"],
    queryFn: async () => (await api.get("/me/login-history")).data,
    enabled: activeTab === "security"
  });

  const { data: watchLaterData } = useQuery({
    queryKey: ["watch-later-profile"],
    queryFn: async () => (await api.get("/watch-later")).data
  });

  const user = data?.user || data;
  const favorites = Array.isArray(data?.favorites) ? data.favorites : [];
  const history = Array.isArray(data?.history) ? data.history : [];
  const watchLaterList = Array.isArray(watchLaterData) ? watchLaterData : [];
  const loginLogs = Array.isArray(loginHistoryData?.history) ? loginHistoryData.history : [];
  const premium = user?.subscriptionEndsAt && new Date(user.subscriptionEndsAt).getTime() > Date.now();

  useEffect(() => {
    if (user) {
      setEditName(user.name || "");
      setEditPhone(user.phone || "");
    }
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get("order_id");
    if (orderId) {
      api.post("/payments/cashfree/verify", { order_id: orderId })
        .then((res) => {
          const added = res.data?.xpCoinsAdded || 0;
          if (added > 0) {
            showSuccess(`🎉 Payment Verified! ${added} XP Coins have been added to your balance.`, "XP Coins Credited");
          } else {
            showSuccess("Payment status verified.", "Payment Verified");
          }
          window.history.replaceState({}, document.title, window.location.pathname);
          refetch();
        })
        .catch(() => refetch());
    }
  }, [refetch]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    setProfileMsg("");
    try {
      await api.put("/me/profile", { name: editName, phone: editPhone });
      setProfileMsg("Profile updated successfully!");
      showSuccess("Profile updated successfully!");
      refetch();
    } catch (err: any) {
      setProfileMsg(err?.response?.data?.message || "Failed to update profile.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPass(true);
    setPassMsg("");
    try {
      await api.put("/me/change-password", { currentPassword: curPass, newPassword: newPass });
      setPassMsg("Password updated successfully!");
      showSuccess("Password updated successfully!");
      setCurPass("");
      setNewPass("");
    } catch (err: any) {
      setPassMsg(err?.response?.data?.message || "Failed to change password.");
    } finally {
      setChangingPass(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delPass) return;
    setDeleting(true);
    try {
      await api.delete("/me/account", { data: { password: delPass } });
      removeToken();
      showSuccess("Your account has been deleted.", "Account Deleted");
      window.location.href = "/";
    } catch (err: any) {
      showError(err?.response?.data?.message || "Incorrect password.", "Delete Failed");
    } finally {
      setDeleting(false);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const executeLogout = () => {
    setShowLogoutModal(false);
    removeToken();
    showSuccess("Successfully signed out.", "Signed Out");
    window.location.href = "/login";
  };

  if (isLoading) {
    return (
      <main className="shell py-20 text-center text-zinc-400 min-h-[60vh] grid place-items-center">
        <div className="space-y-4">
          <div className="h-10 w-10 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-semibold text-zinc-300 font-mono">Loading your profile...</p>
        </div>
      </main>
    );
  }

  if (error || (data && !user)) {
    return (
      <main className="shell py-20 text-center min-h-[60vh] grid place-items-center">
        <div className="p-8 border-[1.5px] border-white/15 bg-[#0E0E0E] text-center space-y-4 rounded-3xl shadow-[3px_3px_0px_rgba(0,0,0,0.8)] max-w-md">
          <UserIcon size={48} className="text-zinc-500 mx-auto" />
          <h2 className="text-2xl font-bold text-white font-display">Sign In Required</h2>
          <p className="text-zinc-400 text-sm font-primary">Please sign in to view your profile, watch history, and saved list.</p>
          <Link href="/login" className="manga-btn-primary inline-block px-8 py-3 bg-white text-black rounded-full font-extrabold text-sm shadow-[2px_2px_0px_rgba(255,255,255,0.25)]">
            Sign In Now
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="shell py-10 space-y-8 select-none">
      {/* Header Profile Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center">
            {premium && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-sm leading-none z-10">👑</span>
            )}
            <div className={`h-14 w-14 rounded-full flex items-center justify-center text-xl font-black ${
              premium ? "bg-white text-black border-2 border-white shadow-md font-mono" : "bg-[#0E0E0E] border border-white/20 text-white font-mono"
            }`}>
              {user?.email ? user.email.charAt(0).toUpperCase() : "U"}
            </div>
          </div>
          <div>
            <span className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest font-mono">Account Profile</span>
            <h1 className="text-2xl sm:text-3xl font-black text-white font-display">{user?.name || "User"}</h1>
            <p className="text-xs text-zinc-400 font-mono">{user?.email} {user?.phone ? `• ${user.phone}` : ""}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user?.role === "admin" && (
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-full bg-white text-black border border-white px-4 py-2.5 text-xs font-black shadow-[2px_2px_0px_rgba(255,255,255,0.25)] hover:scale-105 transition-all"
            >
              <Shield size={16} /> Admin Dashboard
            </Link>
          )}

          <button
            onClick={handleLogoutClick}
            className="flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-600 hover:text-white transition-all"
          >
            <LogOut size={16} /> Log Out
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-white/15 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "overview" ? "bg-white text-black font-extrabold shadow-[2px_2px_0px_rgba(255,255,255,0.25)] border border-white" : "text-zinc-400 hover:text-white hover:bg-white/10"
          }`}
        >
          Overview & Plans
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "settings" ? "bg-white text-black font-extrabold shadow-[2px_2px_0px_rgba(255,255,255,0.25)] border border-white" : "text-zinc-400 hover:text-white hover:bg-white/10"
          }`}
        >
          Edit Profile
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "security" ? "bg-white text-black font-extrabold shadow-[2px_2px_0px_rgba(255,255,255,0.25)] border border-white" : "text-zinc-400 hover:text-white hover:bg-white/10"
          }`}
        >
          Security & History
        </button>
      </div>

      {/* Mobile Features & Quick Links Menu */}
      <div className="md:hidden p-5 border-[1.5px] border-white/15 bg-[#0E0E0E] rounded-2xl space-y-3 shadow-md">
        <h2 className="text-xs font-black text-white uppercase tracking-wider font-mono">Quick Navigation</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Link href="/latest" className="flex items-center gap-2 p-2.5 rounded-xl bg-[#141414] border border-white/10 text-xs font-bold text-white hover:border-white font-mono">
            <Tv size={15} className="text-white" /> Series
          </Link>
          <Link href="/watch-later" className="flex items-center gap-2 p-2.5 rounded-xl bg-[#141414] border border-white/10 text-xs font-bold text-white hover:border-white">
            <Bookmark size={15} className="text-white" /> Watch Later
          </Link>
          <Link href="/history" className="flex items-center gap-2 p-2.5 rounded-xl bg-[#141414] border border-white/10 text-xs font-bold text-white hover:border-white">
            <History size={15} className="text-white" /> History
          </Link>
          <Link href="/pricing" className="flex items-center gap-2 p-2.5 rounded-xl bg-[#141414] border border-white/10 text-xs font-bold text-white hover:border-white">
            <Award size={15} className="text-white" /> XP Store
          </Link>
        </div>
      </div>

      {/* Support & Issue Reporting Section */}
      <SupportSection />

      {/* TAB 1: OVERVIEW & PLANS */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Membership & Saved Cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="p-6 border-[1.5px] border-white/15 bg-[#0E0E0E] space-y-2 rounded-2xl shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-[10px] font-extrabold uppercase tracking-wider font-mono">Membership Plan</span>
                <Award size={18} className="text-white" />
              </div>
              <p className="text-lg font-black text-white font-display">{premium ? "Premium VIP Member" : "Free Explorer"}</p>
              {premium ? (
                <div className="pt-2 flex items-center justify-between font-mono">
                  <span className="text-[11px] font-extrabold text-white">Active Access</span>
                  <button
                    onClick={() => setShowInvoice(true)}
                    className="text-[10px] font-bold text-zinc-400 hover:text-white hover:underline flex items-center gap-1"
                  >
                    <FileText size={12} /> View Invoice
                  </button>
                </div>
              ) : (
                <Link href="/pricing" className="inline-block text-xs font-bold text-zinc-400 hover:text-white hover:underline pt-2 font-mono">
                  Upgrade to Premium →
                </Link>
              )}
            </div>

            <div className="p-6 border-[1.5px] border-white/15 bg-[#0E0E0E] space-y-2 rounded-2xl shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-[10px] font-extrabold uppercase tracking-wider font-mono">Watch Later</span>
                <Bookmark size={18} className="text-white" />
              </div>
              <p className="text-2xl font-black text-white font-display">{watchLaterList.length}</p>
              <Link href="/watch-later" className="inline-block text-xs font-bold text-zinc-400 hover:text-white hover:underline pt-1 font-mono">
                View Saved List →
              </Link>
            </div>
          </div>

          {/* Watch History List */}
          <div className="space-y-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2 font-display uppercase">
              <History size={18} className="text-white" /> Recently Watched Explainers
            </h2>

            <div className="space-y-2">
              {history.length > 0 ? (
                history.map((h: any) => (
                  <Link
                    className="flex items-center justify-between p-4 border-[1.5px] border-white/15 bg-[#0E0E0E] hover:border-white rounded-2xl transition-all shadow-[2px_2px_0px_rgba(0,0,0,0.8)]"
                    key={h._id}
                    href={`/watch/${h.episode?._id}`}
                  >
                    <div>
                      <p className="text-xs font-black text-zinc-400 font-mono uppercase">{h.episode?.series?.title}</p>
                      <p className="font-bold text-white text-xs mt-0.5 font-display">
                        Ep {h.episode?.number}: {h.episode?.title}
                      </p>
                    </div>
                    <span className="text-xs font-extrabold text-white font-mono hover:underline">Watch →</span>
                  </Link>
                ))
              ) : (
                <p className="text-xs text-zinc-500 py-4 font-mono">No watch history yet. Start exploring series!</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EDIT PROFILE */}
      {activeTab === "settings" && (
        <div className="max-w-xl space-y-6">
          <div className="p-6 border-[1.5px] border-white/15 bg-[#0E0E0E] rounded-2xl space-y-4 shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
            <h3 className="text-base font-black text-white font-display">Edit Profile Details</h3>

            {profileMsg && (
              <p className="text-xs font-bold text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/30">
                {profileMsg}
              </p>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 font-mono">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#000000] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-white font-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 font-mono">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full px-4 py-2.5 bg-[#000000] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-white font-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 font-mono">Gmail / Email (Read Only)</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ""}
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-white/10 rounded-xl text-xs text-zinc-500 cursor-not-allowed font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={updatingProfile}
                className="w-full py-3 rounded-full bg-white text-black font-extrabold text-xs shadow-[2px_2px_0px_rgba(255,255,255,0.25)] hover:scale-[1.01] transition-all font-display uppercase tracking-wider"
              >
                {updatingProfile ? "Updating..." : "Save Profile Details"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: SECURITY & HISTORY */}
      {activeTab === "security" && (
        <div className="max-w-xl space-y-6">
          {/* Change Password Card */}
          <div className="p-6 border-[1.5px] border-white/15 bg-[#0E0E0E] rounded-2xl space-y-4 shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
            <h3 className="text-base font-black text-white font-display flex items-center gap-2">
              <KeyRound size={18} className="text-white" /> Change Account Password
            </h3>

            {passMsg && (
              <p className="text-xs font-bold text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/30">
                {passMsg}
              </p>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 font-mono">Current Password</label>
                <input
                  type="password"
                  required
                  value={curPass}
                  onChange={(e) => setCurPass(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#000000] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-white font-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 font-mono">New Password (min 8 chars)</label>
                <input
                  type="password"
                  required
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#000000] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-white font-primary"
                />
              </div>

              <button
                type="submit"
                disabled={changingPass}
                className="w-full py-3 rounded-full bg-white text-black font-extrabold text-xs shadow-[2px_2px_0px_rgba(255,255,255,0.25)] hover:scale-[1.01] transition-all font-display uppercase tracking-wider"
              >
                {changingPass ? "Updating Password..." : "Update Password"}
              </button>
            </form>
          </div>

          {/* Login History Logs */}
          <div className="p-6 border-[1.5px] border-white/15 bg-[#0E0E0E] rounded-2xl space-y-4 shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
            <h3 className="text-base font-black text-white font-display flex items-center gap-2">
              <Clock size={18} className="text-white" /> Recent Account Logins
            </h3>

            <div className="space-y-2">
              {loginLogs.length > 0 ? (
                loginLogs.map((log: any) => (
                  <div key={log.id} className="p-3 bg-[#000000] border border-white/10 rounded-xl text-xs flex items-center justify-between font-mono">
                    <div>
                      <p className="font-bold text-white">{log.ipAddress || "Direct IP"}</p>
                      <p className="text-[10px] text-zinc-400 truncate max-w-xs">{log.userAgent || "Web Browser"}</p>
                    </div>
                    <span className="text-[10px] text-zinc-500">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500 font-mono">Active session established.</p>
              )}
            </div>
          </div>

          {/* Account Self-Deletion Danger Zone */}
          <div className="p-6 border-[1.5px] border-rose-500/30 bg-[#0E0E0E] rounded-2xl space-y-3 shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
            <h3 className="text-base font-black text-rose-400 flex items-center gap-2 font-display">
              <Trash2 size={18} /> Danger Zone: Account Deletion
            </h3>
            <p className="text-xs text-zinc-300 font-primary">
              Permanently remove your profile account identity and session records.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-6 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md font-mono"
            >
              Delete My Account
            </button>
          </div>
        </div>
      )}

      {/* PRINTABLE INVOICE MODAL */}
      {showInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
          <div className="bg-white text-zinc-900 p-8 rounded-2xl max-w-md w-full space-y-6 shadow-2xl relative animate-in zoom-in-95">
            <button
              onClick={() => setShowInvoice(false)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-800"
            >
              <X size={20} />
            </button>

            <div className="border-b border-zinc-200 pb-4">
              <div className="flex items-center justify-between">
                <span className="font-black text-lg tracking-tight text-black font-display">SRI EXPLAINER</span>
                <span className="text-xs font-bold bg-zinc-100 text-black border border-black/20 px-2 py-0.5 rounded font-mono">PAID RECEIPT</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1 font-mono">Official VIP Membership Receipt</p>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between"><span className="text-zinc-500">Customer Email:</span><span className="font-bold">{user?.email}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Membership Tier:</span><span className="font-bold">Premium VIP Pass</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Valid Until:</span><span className="font-bold">{user?.subscriptionEndsAt ? new Date(user.subscriptionEndsAt).toLocaleDateString() : "Active"}</span></div>
              <div className="flex justify-between border-t border-zinc-200 pt-2 font-bold text-sm"><span className="text-zinc-800">Status:</span><span className="text-emerald-600">Active Premium</span></div>
            </div>

            <div className="pt-2 flex gap-3 font-mono">
              <button
                onClick={() => window.print()}
                className="w-full py-2.5 bg-black hover:bg-zinc-800 text-white font-bold rounded-full text-xs shadow-md"
              >
                Print / Save Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACCOUNT DELETION CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
          <div className="bg-[#080808] border border-rose-500/50 p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl relative text-center">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute right-3 top-3 text-zinc-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-black text-white">Confirm Account Deletion</h3>
            <p className="text-xs text-zinc-300">Enter your password to confirm permanent account deletion.</p>

            <form onSubmit={handleDeleteAccount} className="space-y-3">
              <input
                type="password"
                required
                value={delPass}
                onChange={(e) => setDelPass(e.target.value)}
                placeholder="Enter password..."
                className="w-full px-4 py-2.5 bg-[#0E0E0E] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
              />

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-2 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleting}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-md"
                >
                  {deleting ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOGOUT CONFIRMATION MODAL */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={executeLogout}
      />
    </main>
  );
}
