import { NextResponse } from "next/server";

export const dynamic = "force-static";
export const revalidate = 86400;

export async function GET() {
  const content = `# Sri Explainer

> Sri Explainer is an entertainment streaming platform for Tamil & Indian comic explanations, anime recaps, and exclusive video breakdowns.

Sri Explainer provides high-definition comic adaptations, manhua recaps, manga explanations, and exclusive video breakdown series with interactive community features.

## Core Features
- Complete breakdowns of popular manhua, manhwa, manga, and anime stories.
- High quality 1080P/4K video playback with instant load times.
- XP Coin System to unlock exclusive premium episodes.
- Active VIP community with direct WhatsApp and Telegram discussions.

## Main Navigation
- [Home](https://sriexplainer.in/): Official homepage with trending series, latest releases, and upcoming countdowns.
- [Latest Releases](https://sriexplainer.in/latest): Complete catalog of recently released comic and anime breakdown episodes.
- [Ongoing Series](https://sriexplainer.in/ongoing): All active ongoing series currently receiving regular weekly episode updates.
- [Completed Series](https://sriexplainer.in/completed): Binge-watch finished series and complete story story arcs.
- [VIP Membership & Pricing](https://sriexplainer.in/pricing): Information on XP Coin packages, VIP membership plans, and instant episode unlocks.

## Optional
- [Sitemap](https://sriexplainer.in/sitemap.xml): Complete XML sitemap indexing all published series and episodes.
`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
