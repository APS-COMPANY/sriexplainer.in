"use client";

import { CheckCircle2, AlertTriangle, XCircle, Code, Lightbulb } from "lucide-react";
import { AuditItem } from "../lib/types";

export function AuditCard({ item }: { item: AuditItem }) {
  let badgeBg = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  let icon = <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />;

  if (item.status === "warning") {
    badgeBg = "bg-amber-500/10 text-amber-400 border-amber-500/30";
    icon = <AlertTriangle size={18} className="text-amber-400 shrink-0" />;
  } else if (item.status === "fail") {
    badgeBg = "bg-rose-500/10 text-rose-400 border-rose-500/30";
    icon = <XCircle size={18} className="text-rose-400 shrink-0" />;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0B1020]/80 p-4 space-y-3 backdrop-blur-md shadow-md transition-all hover:border-white/20">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {icon}
          <h4 className="text-sm font-bold text-white tracking-tight">{item.title}</h4>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${badgeBg}`}>
          {item.status}
        </span>
      </div>

      <p className="text-xs text-zinc-300 leading-relaxed">{item.details}</p>

      {item.recommendation && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs text-purple-200">
          <Lightbulb size={15} className="text-purple-400 shrink-0 mt-0.5" />
          <span>{item.recommendation}</span>
        </div>
      )}

      {item.snippet && (
        <div className="rounded-xl bg-[#030712] p-2.5 border border-white/10 font-mono text-[11px] text-zinc-300 overflow-x-auto flex items-center justify-between gap-2">
          <code>{item.snippet}</code>
          <Code size={13} className="text-zinc-500 shrink-0" />
        </div>
      )}
    </div>
  );
}
