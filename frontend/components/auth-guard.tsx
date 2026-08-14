"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getToken, removeToken } from "../lib/api";

const PROTECTED_ROUTES = ["/admin", "/profile", "/history", "/my-list", "/watch-later"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`)
  );

  const [hasToken, setHasToken] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return Boolean(getToken());
  });

  useEffect(() => {
    const token = getToken();
    setHasToken(Boolean(token));

    if (isProtectedRoute && !token) {
      const currentPath = pathname + (window.location.search || "");
      router.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
    }
  }, [pathname, isProtectedRoute, router]);

  // Protected route without token - redirect without blocking screen
  if (isProtectedRoute && !hasToken) {
    return null;
  }

  // Render children immediately with zero blocking loading screen
  return <>{children}</>;
}
