"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { api } from "../../../lib/api";
import type { Show } from "../../../components/content";

export default function AdminEpisodes() {
  const { data: series = [] } = useQuery({
    queryKey: ["admin-series"],
    queryFn: async () => (await api.get<Show[]>("/series?all=true&limit=500")).data
  });

  const [seriesId, setSeriesId] = useState("");
  const [number, setNumber] = useState(1);
  const [title, setTitle] = useState("");
  const [rumbleEmbedUrl, setRumbleEmbedUrl] = useState("");
  const [duration, setDuration] = useState("");
  const [access, setAccess] = useState("public");
  const [xpCost, setXpCost] = useState(5);
  const [notice, setNotice] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setNotice("");
    try {
      await api.post("/admin/episodes", {
        series: seriesId,
        seriesId,
        number: Number(number),
        title,
        rumbleEmbedUrl,
        duration,
        access: access === "xp_coins" ? "xp_coins" : "public",
        xpCost: Number(xpCost || 5)
      });
      setTitle("");
      setRumbleEmbedUrl("");
      setDuration("");
      setNumber(n => n + 1);
      setNotice("Episode published successfully.");
    } catch (err: any) {
      setNotice(err.response?.data?.message || "Could not publish this episode. Check the Rumble URL.");
    }
  }

  return (
    <main className="shell py-10">
      <Link href="/admin" className="text-sm text-[#8B2CFF] hover:underline font-bold">
        ← Back to dashboard
      </Link>
      <section className="glass-card mt-5 max-w-2xl p-6 border border-white/10 rounded-2xl">
        <h1 className="text-2xl font-bold text-white">Add an episode</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Paste an official Rumble embed URL, such as <code className="text-zinc-200">https://rumble.com/embed/VIDEO_ID/?pub=XXXXX</code>.
        </p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-semibold text-zinc-300">
            Series
            <select
              required
              value={seriesId}
              onChange={e => setSeriesId(e.target.value)}
              className="mt-1.5 w-full py-2.5 px-3 rounded-xl bg-[#0E0E0E] border border-white/15 text-white text-sm"
            >
              <option value="">Select a series</option>
              {series.map(s => (
                <option value={s._id} key={s._id}>{s.title}</option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-zinc-300">
              Episode number
              <input
                required
                min="1"
                type="number"
                value={number}
                onChange={e => setNumber(Number(e.target.value))}
                className="mt-1.5 w-full py-2.5 px-3 rounded-xl bg-[#0E0E0E] border border-white/15 text-white text-sm"
              />
            </label>
            <label className="text-sm font-semibold text-zinc-300">
              Duration (optional)
              <input
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder="12 min"
                className="mt-1.5 w-full py-2.5 px-3 rounded-xl bg-[#0E0E0E] border border-white/15 text-white text-sm"
              />
            </label>
          </div>

          <label className="block text-sm font-semibold text-zinc-300">
            Episode title
            <input
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Episode 1"
              className="mt-1.5 w-full py-2.5 px-3 rounded-xl bg-[#0E0E0E] border border-white/15 text-white text-sm"
            />
          </label>

          <label className="block text-sm font-semibold text-zinc-300">
            Official Rumble embed URL
            <input
              required
              type="url"
              value={rumbleEmbedUrl}
              onChange={e => setRumbleEmbedUrl(e.target.value)}
              placeholder="https://rumble.com/embed/..."
              className="mt-1.5 w-full py-2.5 px-3 rounded-xl bg-[#0E0E0E] border border-white/15 text-white text-sm"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-zinc-300">
              Episode Access *
              <select
                value={access === "xp_coins" || access === "premium" ? "xp_coins" : "free"}
                onChange={e => setAccess(e.target.value)}
                className="mt-1.5 w-full py-2.5 px-3 rounded-xl bg-[#0E0E0E] border border-white/15 text-white text-sm font-bold"
              >
                <option value="free">FREE</option>
                <option value="xp_coins">XP COINS</option>
              </select>
            </label>

            {access === "xp_coins" && (
              <label className="block text-sm font-semibold text-zinc-300">
                XP Coin Cost *
                <input
                  required
                  min="1"
                  step="1"
                  type="number"
                  value={xpCost}
                  onChange={e => setXpCost(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  placeholder="5"
                  className="mt-1.5 w-full py-2.5 px-3 rounded-xl bg-[#0E0E0E] border border-white/15 text-white text-sm font-bold"
                />
                <p className="mt-1 text-[11px] text-zinc-400 font-normal">Enter how many XP Coins are required to unlock this episode.</p>
              </label>
            )}
          </div>

          <button className="rounded-xl bg-[#8B2CFF] hover:bg-[#8B2CFF]/90 px-6 py-3 font-bold text-white transition-all shadow-lg shadow-purple-900/50">
            Publish episode
          </button>
          {notice && (
            <p className={notice.includes("success") ? "text-sm text-emerald-400 font-bold" : "text-sm text-rose-400 font-bold"}>
              {notice}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
