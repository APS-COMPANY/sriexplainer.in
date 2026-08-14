"use client";

import { useState } from "react";
import { ScoreGauge } from "../components/score-gauge";
import { SocialPreview } from "../components/social-preview";
import { AuditCard } from "../components/audit-card";
import { SEOAuditReport, AuditCategory } from "../lib/types";
import {
  Search,
  Sparkles,
  Globe,
  Printer,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  FileText,
  ImageIcon,
  Share2,
  Server
} from "lucide-react";

export default function Home() {
  const [urlInput, setUrlInput] = useState("https://sriexplainer.in");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<SEOAuditReport | null>(null);
  const [activeCategory, setActiveCategory] = useState<"all" | AuditCategory>("all");

  const handleAnalyze = async (targetUrl?: string) => {
    const urlToTest = targetUrl || urlInput;
    if (!urlToTest.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToTest })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to audit target URL");
      }

      setReport(data);
    } catch (err: any) {
      setError(err?.message || "Failed to analyze URL. Make sure the domain is valid and accessible.");
    } finally {
      setLoading(false);
    }
  };

  const filteredAudits = report
    ? activeCategory === "all"
      ? report.auditItems
      : report.auditItems.filter((item) => item.category === activeCategory)
    : [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <main className="px-4 sm:px-8 py-8 w-full max-w-7xl mx-auto space-y-8 print:p-0 print:m-0 print:max-w-none">
      {/* Top Branding Header */}
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-6 print:hidden">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-[#8B2CFF] to-[#B84DFF] flex items-center justify-center text-white font-black text-lg shadow-lg shadow-[#8B2CFF]/40 border border-white/20">
            ⚡
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              SEO Web Analyzer <span className="text-xs px-2 py-0.5 rounded-full bg-[#8B2CFF]/20 text-[#B84DFF] border border-[#8B2CFF]/30">v1.0</span>
            </h1>
            <p className="text-xs text-zinc-400">Instant Real-Time Website Audit & Core Web Vitals Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live Auditor Ready</span>
        </div>
      </header>

      {/* URL Input Form */}
      <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#0F172A]/90 via-[#0B0F19]/90 to-[#05070E]/95 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl space-y-4 print:hidden">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Audit Any Website <Sparkles size={18} className="text-[#B84DFF]" />
          </h2>
          <p className="text-xs text-zinc-400">
            Enter a website URL below to run a complete real-time SEO audit, meta tag check, and social card preview.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAnalyze();
          }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <div className="relative flex-1">
            <Globe size={18} className="absolute left-4 top-3.5 text-zinc-400" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="e.g. https://sriexplainer.in or example.com"
              className="w-full pl-11 pr-4 py-3.5 bg-[#030712]/90 border border-white/10 rounded-2xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#8B2CFF] focus:ring-1 focus:ring-[#8B2CFF]/50 transition-all shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#8B2CFF] to-[#B84DFF] hover:opacity-95 font-extrabold text-white text-sm shadow-lg shadow-[#8B2CFF]/40 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shrink-0"
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Auditing Website...</span>
              </>
            ) : (
              <>
                <Search size={18} />
                <span>Analyze SEO</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Sample Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <span className="text-xs font-bold text-zinc-500">Quick Test:</span>
          {["https://sriexplainer.in", "https://google.com", "https://github.com"].map((preset) => (
            <button
              key={preset}
              onClick={() => {
                setUrlInput(preset);
                handleAnalyze(preset);
              }}
              className="px-3 py-1 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              {preset}
            </button>
          ))}
        </div>
      </section>

      {/* Error Message */}
      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-bold text-rose-300 flex items-center gap-3">
          <XCircle size={20} className="text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Audit Report Container */}
      {report && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Top Audit Summary Header */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Score Dial */}
            <ScoreGauge score={report.overallScore} grade={report.grade} />

            {/* Target URL Overview & Details */}
            <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-gradient-to-b from-[#0F172A]/90 via-[#0B0F19]/90 to-[#05070E]/95 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl flex flex-col justify-between space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#B84DFF]">Target Domain</span>
                  <h3 className="text-2xl font-black text-white tracking-tight">{report.domain}</h3>
                  <a href={report.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:underline block truncate max-w-md">
                    {report.url}
                  </a>
                </div>

                <button
                  onClick={handlePrint}
                  className="print:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white transition-all hover:scale-105 active:scale-95"
                >
                  <Printer size={15} />
                  <span>Export Report PDF</span>
                </button>
              </div>

              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10">
                <div className="p-3 rounded-2xl bg-[#030712]/80 border border-white/10">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Response Time</span>
                  <p className="text-sm font-extrabold text-emerald-400">{report.metrics.responseTimeMs} ms</p>
                </div>
                <div className="p-3 rounded-2xl bg-[#030712]/80 border border-white/10">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Title Length</span>
                  <p className="text-sm font-extrabold text-white">{report.metrics.titleLength} chars</p>
                </div>
                <div className="p-3 rounded-2xl bg-[#030712]/80 border border-white/10">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Headings (H1)</span>
                  <p className="text-sm font-extrabold text-white">{report.metrics.h1Count}</p>
                </div>
                <div className="p-3 rounded-2xl bg-[#030712]/80 border border-white/10">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Missing Image Alt</span>
                  <p className={`text-sm font-extrabold ${report.metrics.missingAltCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                    {report.metrics.missingAltCount}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Social Media & Search Snippet Previews */}
          <section className="space-y-3">
            <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              <Share2 size={18} className="text-[#B84DFF]" /> Social & Search Snippet Mockups
            </h3>
            <SocialPreview
              domain={report.domain}
              url={report.url}
              title={report.meta.title}
              description={report.meta.description}
              ogImage={report.meta.ogImage}
            />
          </section>

          {/* Audit Category Tabs & Checklist */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 print:hidden">
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-400" /> Detailed SEO Audit Checklist
              </h3>

              {/* Category Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-[#030712] border border-white/10">
                {(["all", "meta", "content", "social", "technical", "images"] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      activeCategory === cat
                        ? "bg-[#8B2CFF] text-white shadow-md"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Audit Checklist Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAudits.map((item) => (
                <AuditCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
