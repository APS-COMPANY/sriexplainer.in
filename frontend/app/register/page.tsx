"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, setToken } from "../../lib/api";
import { GoogleAuthButton } from "../../components/google-auth";

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const d = (await api.post("/auth/register", { name, email, password })).data;
      if (d.token) {
        setToken(d.token);
        console.log("[Auth State]: Registration successful, session persisted.");
        window.location.href = "/profile";
      }

    } catch (e: any) {
      setError(e.response?.data?.message || "Could not create account");
    }
  };

  return (
    <main className="shell grid min-h-[75vh] place-items-center py-12 select-none">
      <form onSubmit={handleSubmit} className="w-full max-w-md p-8 rounded-3xl bg-[#0E0E0E] border-[1.5px] border-white/15 shadow-[4px_4px_0px_rgba(0,0,0,0.9)] space-y-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight font-display uppercase">Create your account</h1>
          <p className="text-xs text-zinc-400 mt-1 font-primary">Join Sri Explainer to unlock VIP manga episodes & XP coins.</p>
        </div>

        <div className="pt-2 font-mono">
          <GoogleAuthButton label="Sign up with Google" />
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
          <label className="block text-xs font-bold text-zinc-300 font-mono">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full py-2.5 px-4 text-xs bg-[#000000] border border-white/15 rounded-full text-white placeholder-zinc-500 focus:outline-none focus:border-white font-mono"
          />
        </div>

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
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full py-2.5 px-4 text-xs bg-[#000000] border border-white/15 rounded-full text-white placeholder-zinc-500 focus:outline-none focus:border-white font-mono"
          />
        </div>

        <button className="w-full py-3.5 rounded-full bg-white text-black hover:bg-zinc-200 font-black text-xs shadow-[2px_2px_0px_rgba(255,255,255,0.25)] hover:opacity-95 transition-all font-display uppercase tracking-wider">
          Create account
        </button>

        <p className="pt-2 text-center text-xs font-mono text-zinc-400">
          Already a member?{" "}
          <Link className="text-white font-bold hover:underline" href="/login">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
