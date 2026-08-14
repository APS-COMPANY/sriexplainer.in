"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { NotificationProvider } from "./notification-provider";
import { PipProvider } from "./pip-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const [q] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes fresh data - eliminates duplicate requests
            gcTime: 30 * 60 * 1000, // 30 minutes memory cache
            refetchOnWindowFocus: false, // Prevent refetches when user switches browser tabs
            refetchOnMount: false, // Reuse cached data when components mount
            refetchOnReconnect: false, // Prevent request storms on network reconnect
            retry: 1, // Single retry on network failure
          },
        },
      })
  );

  return (
    <QueryClientProvider client={q}>
      <NotificationProvider>
        <PipProvider>{children}</PipProvider>
      </NotificationProvider>
    </QueryClientProvider>
  );
}
