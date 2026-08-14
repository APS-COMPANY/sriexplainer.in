"use client";

import { usePathname } from "next/navigation";
import { ClientHeader } from "./client-header";
import { Footer } from "./footer";

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`)
  );

  if (isPublicRoute) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center relative z-10 p-4">
        {children}
      </main>
    );
  }

  return (
    <div className="min-h-screen flex flex-col w-full relative">
      <ClientHeader />
      <div className="flex-1 flex flex-col w-full min-w-0 pb-16 md:pb-0">
        <main className="flex-1 w-full min-w-0">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
