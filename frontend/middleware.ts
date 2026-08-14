import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const response = NextResponse.next();

  // Security Headers for A+ Rating
  response.headers.set("X-DNS-Prefetch-Control", "on");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), browsing-topics=()");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self' https:; script-src 'self' 'unsafe-eval' 'unsafe-inline' https: blob:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: blob:; font-src 'self' data: https:; media-src 'self' https: blob: data:; frame-src 'self' https://rumble.com https://*.rumble.com https://www.youtube.com https://youtube.com https://*.cashfree.com https: blob:; child-src 'self' https://rumble.com https://*.rumble.com https: blob:; connect-src 'self' https: wss: data: blob:; frame-ancestors 'self'; object-src 'none'; base-uri 'self';"
  );

  if (pathname.startsWith("/api/")) {
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
          "Access-Control-Max-Age": "86400",
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "SAMEORIGIN",
          "X-XSS-Protection": "1; mode=block",
          "Referrer-Policy": "strict-origin-when-cross-origin"
        }
      });
    }

    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)$).*)"
  ]
};
