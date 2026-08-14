"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Coins, ShieldCheck, HelpCircle, ArrowRight, Check } from "lucide-react";
import { api, getToken, removeToken } from "../lib/api";
import { showSuccess, showError } from "./notification-provider";

declare global {
  interface Window {
    Cashfree: any;
  }
}

interface PricingProps {
  showTitle?: boolean;
  compact?: boolean;
}

export function PricingSection({ showTitle = true, compact = false }: PricingProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  // Authenticated Session & XP Coins State
  const { data: authData, isLoading: isAuthLoading, refetch } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const token = getToken();
      if (!token) return null;
      try {
        const res = await api.get("/me");
        return res.data;
      } catch (e) {
        return null;
      }
    },
    retry: false,
    staleTime: 15000
  });

  const currentUser = authData?.user;
  const userXpCoins = Number(currentUser?.xpCoins || 0);

  const handleBuyCoins = async (planKey: "60_coins" | "110_coins" | "220_coins", amount: number) => {
    try {
      if (isAuthLoading) {
        setLoadingPlan(planKey);
        return;
      }

      const token = getToken();
      if (!token && !currentUser) {
        window.location.href = "/login";
        return;
      }

      setLoadingPlan(planKey);

      // Create Cashfree Order for XP Coins Package
      const { data } = await api.post("/payments/cashfree/order", { plan: planKey, amount });

      if (data?.payment_session_id) {
        const loadCashfreeScript = () =>
          new Promise<boolean>((resolve) => {
            if (window.Cashfree) return resolve(true);
            const s = document.createElement("script");
            s.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
            s.onload = () => resolve(true);
            s.onerror = () => resolve(false);
            document.body.appendChild(s);
          });

        const cfLoaded = await loadCashfreeScript();
        if (cfLoaded && window.Cashfree) {
          const cashfree = window.Cashfree({
            mode: data.environment === "PRODUCTION" ? "production" : "sandbox",
          });
          
          cashfree.checkout({
            paymentSessionId: data.payment_session_id,
            redirectTarget: "_self",
          });
          setLoadingPlan(null);
          return;
        }
      }
    } catch (cfErr: any) {
      console.error("[Payment Initialization Error]:", cfErr);
      if (cfErr?.response?.status === 401 || cfErr?.response?.data?.message?.includes("expired")) {
        removeToken();
        window.location.href = "/login";
        return;
      }
      showError(cfErr?.response?.data?.message || "Cashfree payment gateway configuration is being updated. Please try again shortly.", "Payment Notice");
    } finally {
      setLoadingPlan(null);
    }
  };

  const coinPackages = [
    {
      key: "60_coins" as const,
      coins: 60,
      price: 29,
      badge: "Starter Pack",
      popular: false,
      perks: ["Unlock up to 12 Paid Episodes", "Instant Balance Credit", "Permanent Unlocks"]
    },
    {
      key: "110_coins" as const,
      coins: 110,
      price: 49,
      badge: "Most Popular",
      popular: true,
      perks: ["Unlock up to 22 Paid Episodes", "Best Value per Coin", "Instant Balance Credit", "Permanent Unlocks"]
    },
    {
      key: "220_coins" as const,
      coins: 220,
      price: 99,
      badge: "Mega Value",
      popular: false,
      perks: ["Unlock up to 44 Paid Episodes", "Maximum Coin Savings", "Instant Balance Credit", "Permanent Unlocks"]
    }
  ];

  const faqs = [
    {
      q: "What are XP Coins?",
      a: "XP Coins are virtual currency used on Sri Explainer to unlock exclusive paid episodes. Once unlocked, you can re-watch the episode permanently without paying again.",
    },
    {
      q: "How many XP Coins does an episode cost?",
      a: "Default paid episodes cost 5 XP Coins to unlock permanently.",
    },
    {
      q: "Do XP Coins expire?",
      a: "No! XP Coins stored in your account balance never expire.",
    },
    {
      q: "How are payments processed?",
      a: "Payments are securely processed through Cashfree Payments (UPI, Google Pay, PhonePe, Paytm, BHIM, Cards, NetBanking).",
    }
  ];

  return (
    <section className="py-12 md:py-16">
      <div className="shell">
        {showTitle && (
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/25 text-white text-xs font-black uppercase tracking-wider shadow-sm font-mono">
              <Sparkles size={14} /> Virtual Currency Store
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white flex items-center justify-center gap-3 font-display">
              <span>Buy XP Coins</span>
            </h2>
            <p className="text-zinc-400 text-base md:text-lg font-primary">
              Unlock exclusive episodes permanently. Pay once per episode using XP Coins—never pay again to re-watch.
            </p>

            {/* Current Balance Display Header Card */}
            {currentUser && (
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xl shadow-xl mt-4">
                <div className="h-9 w-9 rounded-xl bg-white text-black flex items-center justify-center font-bold shadow-md">
                  <Coins size={20} />
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block font-mono">Your Balance</span>
                  <span className="text-lg font-black text-white flex items-center gap-1.5 font-display">
                    <span>💠</span> {userXpCoins} <span className="text-xs font-bold text-zinc-300 font-mono">XP Coins</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* XP Coin Purchase Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {coinPackages.map((pkg) => (
            <div
              key={pkg.key}
              className={`p-8 flex flex-col justify-between relative rounded-3xl transition-all duration-200 ${
                pkg.popular
                  ? "bg-[#141414] border-2 border-white shadow-[4px_4px_0px_rgba(255,255,255,0.3)] md:-translate-y-2"
                  : "bg-[#0E0E0E] border-[1.5px] border-white/15 hover:border-white shadow-[2px_2px_0px_rgba(0,0,0,0.8)] hover:shadow-[4px_4px_0px_rgba(255,255,255,0.2)]"
              }`}
            >
              {pkg.badge && (
                <div
                  className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1.5 font-mono ${
                    pkg.popular ? "bg-white text-black border border-white" : "bg-[#0E0E0E] text-white border border-white/30"
                  }`}
                >
                  <Coins size={14} /> {pkg.badge}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-zinc-400 text-xs uppercase tracking-wider font-mono">XP COINS</span>
                  <span className="text-2xl">💠</span>
                </div>

                <h3 className="text-3xl font-black text-white mt-3 flex items-center gap-2 font-display">
                  <span>{pkg.coins}</span>
                  <span className="text-sm font-bold text-zinc-400 font-mono">XP Coins</span>
                </h3>

                <div className="my-6">
                  <span className="text-5xl font-black text-white font-display">₹{pkg.price}</span>
                </div>

                <ul className="space-y-3.5 text-sm text-zinc-200 border-t border-white/10 pt-6 font-primary">
                  {pkg.perks.map((perk, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check size={18} className="text-white shrink-0 mt-0.5" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => handleBuyCoins(pkg.key, pkg.price)}
                  disabled={loadingPlan === pkg.key}
                  className={`w-full py-4 px-4 rounded-full font-black text-base shadow-md transition-all flex items-center justify-center gap-2 font-display ${
                    pkg.popular
                      ? "manga-btn-primary bg-white text-black shadow-[3px_3px_0px_rgba(255,255,255,0.3)] hover:scale-[1.02]"
                      : "bg-white/10 hover:bg-white hover:text-black border border-white/25 text-white"
                  }`}
                >
                  {loadingPlan === pkg.key ? (
                    "Opening Checkout..."
                  ) : (
                    <>
                      BUY COINS <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Feature Comparison / Security Assurance */}
        <div className="mt-16 max-w-4xl mx-auto rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border-[1.5px] border-white/15 bg-[#0E0E0E] shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white text-black grid place-items-center shrink-0 shadow-md">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h4 className="font-bold text-white text-base font-display">100% Secure Checkout via Cashfree Payments</h4>
              <p className="text-xs text-zinc-400 mt-0.5 font-primary">
                Pay safely using UPI (GPay, PhonePe, Paytm), Cards, and NetBanking.
              </p>
            </div>
          </div>
          <div className="text-xs text-zinc-400 flex items-center gap-4 shrink-0 font-mono">
            <span>🔒 256-Bit SSL</span>
            <span>⚡ Instant Credit</span>
          </div>
        </div>

        {/* FAQ Section */}
        {!compact && (
          <div className="mt-20 max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h3 className="text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-2 font-display uppercase">
                <HelpCircle size={24} className="text-white" /> Frequently Asked Questions
              </h3>
            </div>
            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="border-[1.5px] border-white/15 bg-[#0E0E0E] rounded-2xl overflow-hidden transition-all shadow-[2px_2px_0px_rgba(0,0,0,0.8)]"
                >
                  <button
                    onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
                    className="w-full px-6 py-4 text-left font-semibold text-white flex items-center justify-between gap-4 hover:bg-white/5 font-primary"
                  >
                    <span>{faq.q}</span>
                    <span className="text-white text-xl font-mono">{faqOpen === idx ? "−" : "+"}</span>
                  </button>
                  {faqOpen === idx && (
                    <div className="px-6 pb-4 text-sm text-zinc-400 border-t border-white/10 pt-3 font-primary">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
