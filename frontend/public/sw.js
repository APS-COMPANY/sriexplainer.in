const CACHE_NAME = "sri-explainer-v6";
const ASSETS = [
  "/",
  "/downloads",
  "/offline",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/logo.png"
];

// 1. Service Worker Installation - Pre-cache essential offline shells
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of ASSETS) {
        try {
          await cache.add(asset);
        } catch (e) {
          console.warn("[SW Pre-cache Asset Warning]:", asset, e);
        }
      }
    })
  );
});

// 2. Service Worker Activation - Clean up old cache versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  return self.clients.claim();
});

// 3. Fetch Event Interceptor - Guarantee HTTP 200 HTML responses when offline
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip caching for backend authentication or payment webhooks
  if (url.pathname.startsWith("/api/auth") || url.pathname.startsWith("/api/cashfree")) {
    return;
  }

  // Handle Navigation Requests & Document Fetches (Android PWA launch / page transition)
  const isNavigation =
    event.request.mode === "navigate" ||
    (event.request.headers.get("accept") && event.request.headers.get("accept").includes("text/html"));

  event.respondWith(
    (async () => {
      // 1. Cache-First Strategy for Static Next.js Bundles & Images (Instant 0ms load, eliminates duplicate network events)
      if (
        url.pathname.startsWith("/_next/static/") ||
        url.pathname.startsWith("/api/uploads/") ||
        url.pathname.endsWith(".png") ||
        url.pathname.endsWith(".jpg") ||
        url.pathname.endsWith(".webp") ||
        url.pathname.endsWith(".svg") ||
        url.pathname.endsWith(".woff2")
      ) {
        const cachedStatic = await caches.match(event.request);
        if (cachedStatic) return cachedStatic;
      }

      // 2. Network-First with Cache Fallback for dynamic pages
      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return networkResponse;
      } catch (networkError) {
        // Network failed (Device is offline / Mobile Data OFF)
        
        // 1. Try exact matching cached resource first
        const exactMatch = await caches.match(event.request);
        if (exactMatch) return exactMatch;

        // 2. For navigation / HTML requests, serve /downloads page directly
        if (isNavigation || url.pathname.startsWith("/watch/")) {
          const downloadsPage = await caches.match("/downloads");
          if (downloadsPage) return downloadsPage;

          const offlinePage = await caches.match("/offline");
          if (offlinePage) return offlinePage;

          const rootPage = await caches.match("/");
          if (rootPage) return rootPage;
        }

        // 3. Try fallback to any cached HTML page in Cache Storage
        const cache = await caches.open(CACHE_NAME);
        const keys = await cache.keys();
        for (const key of keys) {
          if (key.url.includes("/downloads") || key.url.includes("/offline")) {
            const res = await cache.match(key);
            if (res) return res;
          }
        }

        // 4. Emergency Fallback: Construct valid 200 OK HTML response so Android PWA NEVER displays native offline error
        const emergencyHtml = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sri Explainer Offline</title>
            <style>
              body { background-color: #000000; color: #ffffff; font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; padding: 20px; }
              .card { background: #0E0E0E; border: 1.5px solid rgba(255, 255, 255, 0.2); border-radius: 24px; padding: 32px; max-width: 400px; width: 100%; box-shadow: 3px 3px 0px rgba(0,0,0,0.8); }
              .badge { background: rgba(255, 255, 255, 0.1); color: #ffffff; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 800; display: inline-block; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.2); }
              h1 { font-size: 22px; font-weight: 900; margin: 0 0 8px 0; }
              p { font-size: 13px; color: #a1a1aa; margin: 0 0 20px 0; line-height: 1.5; }
              a { background: #ffffff; color: #000000; padding: 12px 24px; border-radius: 999px; font-size: 13px; font-weight: 800; text-decoration: none; display: inline-block; box-shadow: 2px 2px 0px rgba(255, 255, 255, 0.25); }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="badge">🔴 OFFLINE MODE</div>
              <h1>My Offline Downloads</h1>
              <p>Mobile data is turned off. Access your saved offline story explainers directly.</p>
              <a href="/downloads">Open Downloads</a>
            </div>
          </body>
          </html>
        `;

        return new Response(emergencyHtml, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
    })()
  );
});
