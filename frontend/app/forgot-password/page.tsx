"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <main className="shell grid min-h-[75vh] place-items-center py-12 select-none">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await api.post("/auth/forgot-password", { email });
          setDone(true);
        }}
        className="w-full max-w-md p-8 rounded-3xl bg-[#0E0E0E] border-[1.5px] border-white/15 shadow-[4px_4px_0px_rgba(0,0,0,0.9)] space-y-4"
      >
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight font-display uppercase">Reset password</h1>
          <p className="text-xs text-zinc-400 mt-1 font-primary">Enter your account email to receive reset instructions.</p>
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

        <button className="w-full py-3.5 rounded-full bg-white text-black hover:bg-zinc-200 font-black text-xs shadow-[2px_2px_0px_rgba(255,255,255,0.25)] hover:opacity-95 transition-all font-display uppercase tracking-wider">
          Send instructions
        </button>

        {done && (
          <p className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-mono">
            ✓ If an account exists, instructions are on their way.
          </p>
        )}

        <p className="pt-2 text-center text-xs font-mono text-zinc-400">
          Remember your password?{" "}
          <Link className="text-white font-bold hover:underline" href="/login">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
