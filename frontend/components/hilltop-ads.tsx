"use client";

import Script from "next/script";
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

  if (shouldDisableAds) {
    return null;
  }

  return (
    <Script
      id="hilltopads-popunder-clean"
      src="https://tiny-ambition.com/c/D.9c6Fbn2G5xloSTWiQH9/NAzXMCwLMEDLgd2xM/Sn0f3aMozyAlw-OzDsYY1G"
      strategy="lazyOnload"
    />
  );
}
