"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, setToken, getToken } from "../../lib/api";
import { GoogleAuthButton } from "../../components/google-auth";
import { ErrorBoundary } from "../../components/error-boundary";

import { useSearchParams } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const existingToken = getToken();
    console.log("[Route Change]: Login page mounted.");
    console.log("[Auth Initialization]: Session token status ->", existingToken ? "Token present" : "No token");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[Login Button Click]: Initiating password login for email:", email);
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      const d = res.data;
      console.log("[API Response]: Login response received successfully.");
      if (d.token) {
        setToken(d.token);
        console.log("[Auth State]: Password login successful, session persisted.");
        const targetUrl = searchParams.get("redirect") || "/";
        window.location.href = targetUrl;
      } else {
        setError("No token received from server");
      }
    } catch (err: any) {
      console.error("[Uncaught Exception/Error]: Login request error ->", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Could not sign in";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <main className="px-4 py-12 flex items-center justify-center min-h-[75vh] w-full select-none">
        <form onSubmit={handleSubmit} className="w-full max-w-md p-8 rounded-3xl bg-[#0E0E0E] border-[1.5px] border-white/15 shadow-[4px_4px_0px_rgba(0,0,0,0.9)] space-y-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight font-display uppercase">Welcome back</h1>
            <p className="text-xs text-zinc-400 mt-1 font-primary">Sign in to sync your watch history and access VIP explainers.</p>
          </div>

          <div className="pt-2 font-mono">
            <GoogleAuthButton label="Sign in with Google" />
          </div>

          <div className="my-4 flex items-center gap-3 font-mono">
            <div className="h-[1px] flex-1 bg-white/15" />
            <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest">OR WITH EMAIL</span>
            <div className="h-[1px] flex-1 bg-white/15" />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold font-mono">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-bold text-zinc-300 font-mono">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full py-2.5 px-4 text-xs bg-[#000000] border border-white/15 rounded-full text-white placeholder-zinc-500 focus:outline-none focus:border-white font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-zinc-300 font-mono">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full py-2.5 px-4 text-xs bg-[#000000] border border-white/15 rounded-full text-white placeholder-zinc-500 focus:outline-none focus:border-white font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full bg-white text-black hover:bg-zinc-200 font-black text-xs shadow-[2px_2px_0px_rgba(255,255,255,0.25)] hover:opacity-95 transition-all font-display uppercase tracking-wider disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in to VIP Stream"}
          </button>

          <div className="pt-2 flex justify-between text-xs font-bold font-mono text-zinc-400">
            <Link href="/forgot-password" className="hover:text-white transition-colors">Forgot password?</Link>
            <Link href="/register" className="text-white hover:underline">Create account</Link>
          </div>
        </form>
      </main>
    </ErrorBoundary>
  );
}
