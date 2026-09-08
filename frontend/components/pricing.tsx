"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Coins, ShieldCheck, HelpCircle, ArrowRight, Check } from "lucide-react";
import { api, getToken, setToken, removeToken } from "../lib/api";
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
      perks: ["Unlock up to 12 Paid Episodes", "Instant Balance Credit", "Permanent Unlocks", "Full 4K & HD Access"]
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const appToken = sp.get("appToken");
      if (appToken && appToken.trim()) {
        setToken(appToken.trim());
      }
      const fromApp = sp.get("fromApp") === "true";
      const autoCheckout = sp.get("autoCheckout") === "true";
      const planParam = sp.get("plan");
      if (fromApp && autoCheckout && planParam) {
        const pkg = coinPackages.find((p) => p.key === planParam) || coinPackages[1];
        handleBuyCoins(pkg.key, pkg.price);
      }
    }
  }, []);

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
    <section className={compact ? "py-8 sm:py-10" : "py-12 md:py-16"}>
      <div className="shell">
        {showTitle && (
          <div className={`text-center mx-auto ${compact ? "max-w-2xl mb-8 space-y-2" : "max-w-3xl mb-12 space-y-4"}`}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/25 text-white text-xs font-black uppercase tracking-wider shadow-sm font-mono">
              <Sparkles size={13} /> Virtual Currency Store
            </div>
            <h2 className={`${compact ? "text-2xl md:text-3xl" : "text-3xl md:text-5xl"} font-black tracking-tight text-white flex items-center justify-center gap-3 font-display`}>
              <span>Buy XP Coins</span>
            </h2>
            <p className={`text-zinc-400 font-primary ${compact ? "text-xs sm:text-sm" : "text-base md:text-lg"}`}>
              Unlock exclusive episodes permanently. Pay once per episode using XP Coins—never pay again to re-watch.
            </p>

            {/* Current Balance Display Header Card */}
            {currentUser && (
              <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xl shadow-xl mt-3">
                <div className="h-8 w-8 rounded-xl bg-white text-black flex items-center justify-center font-bold shadow-md">
                  <Coins size={18} />
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block font-mono">Your Balance</span>
                  <span className="text-base font-black text-white flex items-center gap-1.5 font-display">
                    <span>💠</span> {userXpCoins} <span className="text-xs font-bold text-zinc-300 font-mono">XP Coins</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* XP Coin Purchase Cards Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-3 items-stretch mx-auto ${compact ? "gap-4 sm:gap-6 max-w-5xl" : "gap-8 max-w-6xl"}`}>
          {coinPackages.map((pkg) => (
            <div
              key={pkg.key}
              className={`flex flex-col justify-between relative rounded-3xl transition-all duration-300 ${
                compact ? "p-5 sm:p-6" : "p-8"
              } ${
                pkg.popular
                  ? "bg-[#141414] border-2 border-white shadow-xl shadow-white/5 ring-1 ring-white/20"
                  : "bg-[#0E0E0E] border-[1.5px] border-white/15 hover:border-white/40 shadow-lg shadow-black/60"
              }`}
            >
              {pkg.badge && (
                <div className="w-full flex justify-center absolute -top-3.5 left-0 right-0 pointer-events-none z-10">
                  <div
                    className={`px-3.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider shadow-md flex items-center gap-1.5 font-mono ${
                      pkg.popular ? "bg-white text-black border border-white" : "bg-[#181818] text-white border border-white/30"
                    }`}
                  >
                    <Coins size={13} /> {pkg.badge}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-bold text-zinc-400 text-[11px] uppercase tracking-wider font-mono">XP COINS</span>
                  <span className="text-xl">💠</span>
                </div>

                <h3 className={`${compact ? "text-2xl" : "text-3xl"} font-black text-white mt-2 flex items-center gap-2 font-display`}>
                  <span>{pkg.coins}</span>
                  <span className="text-xs sm:text-sm font-bold text-zinc-400 font-mono">XP Coins</span>
                </h3>

                <div className={compact ? "my-3.5" : "my-6"}>
                  <span className={`${compact ? "text-3xl sm:text-4xl" : "text-5xl"} font-black text-white font-display`}>₹{pkg.price}</span>
                </div>

                <ul className={`text-zinc-300 border-t border-white/10 font-primary ${compact ? "space-y-2 text-xs pt-4" : "space-y-3.5 text-sm pt-6"}`}>
                  {pkg.perks.map((perk, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check size={16} className="text-white shrink-0 mt-0.5" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={compact ? "mt-5" : "mt-8"}>
                <button
                  onClick={() => handleBuyCoins(pkg.key, pkg.price)}
                  disabled={loadingPlan === pkg.key}
                  className={`w-full py-3 px-4 rounded-full font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 font-display ${
                    pkg.popular
                      ? "bg-white text-black hover:bg-zinc-200 shadow-md active:scale-95"
                      : "bg-[#181818] hover:bg-white hover:text-black border border-white/25 text-white active:scale-95"
                  }`}
                >
                  {loadingPlan === pkg.key ? (
                    "Opening Checkout..."
                  ) : (
                    <>
                      Buy Coins <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Feature Comparison / Security Assurance */}
        <div className={`mx-auto rounded-3xl flex flex-col md:flex-row items-center justify-between gap-5 border-[1.5px] border-white/15 bg-[#0E0E0E] shadow-lg ${
          compact ? "mt-8 p-4 sm:p-5 max-w-3xl" : "mt-14 p-6 md:p-8 max-w-4xl"
        }`}>
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-white text-black grid place-items-center shrink-0 shadow-md">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm sm:text-base font-display">100% Secure Checkout via Cashfree Payments</h4>
              <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 font-primary">
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
              <h3 className="text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-2 font-display">
                <HelpCircle size={24} className="text-white" /> Frequently Asked Questions
              </h3>
            </div>
            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="border-[1.5px] border-white/15 bg-[#0E0E0E] rounded-2xl overflow-hidden transition-all shadow-lg"
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
