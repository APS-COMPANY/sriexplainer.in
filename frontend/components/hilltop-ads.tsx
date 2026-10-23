"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, getToken } from "../lib/api";

export function HilltopAds() {
  const token = typeof window !== "undefined" ? getToken() : null;

  const { data: authData } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      if (!token) return null;
      try {
        return (await api.get("/me")).data;
      } catch {
        return null;
      }
    },
    staleTime: 60000,
    retry: false,
    enabled: !!token
  });

  const currentUser = authData?.user || authData;
  const isAdmin = currentUser?.role === "admin" || Boolean(currentUser?.isMainAdmin);
  const isPremiumActive = Boolean(
    currentUser?.subscriptionEndsAt && new Date(currentUser.subscriptionEndsAt).getTime() > Date.now()
  );

  const shouldDisableAds = isAdmin || isPremiumActive;

  useEffect(() => {
    if (shouldDisableAds || typeof window === "undefined") return;
    if (document.getElementById("hilltopads-anti-adblock")) return;

    try {
      const script = document.createElement("script");
      script.id = "hilltopads-anti-adblock";
      script.src = "/scripts/hilltop-ads.js";
      script.async = true;
      document.body.appendChild(script);
    } catch (e) {
      console.warn("[Ad Notice]: Failed to initialize ad script:", e);
    }
  }, [shouldDisableAds]);

  return null;
}
