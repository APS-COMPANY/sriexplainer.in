"use client";

import { useQuery } from "@tanstack/react-query";
import { api, image } from "../lib/api";

export function GlobalBg() {
  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => (await api.get("/settings")).data,
    staleTime: 60000
  });

  if (!settings?.siteBackground) return null;

  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">
      <img
        src={image(settings.siteBackground)}
        alt=""
        className="h-full w-full object-cover opacity-20 filter blur-[2px] scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/90 to-zinc-950" />
    </div>
  );
}
