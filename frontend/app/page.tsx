import { Row, ContinueWatchingRow, StatusSection } from "../components/content";
import { PricingSection } from "../components/pricing";
import { SupportSection } from "../components/support-section";
import { getSeries } from "../lib/server-series";
import { image } from "../lib/api";

export const revalidate = 60;

export default async function Home() {
  const [latestSeries, trendingSeries, ongoingSeries, completedSeries] = await Promise.all([
    getSeries({ limit: 12 }),
    getSeries({ trending: true, limit: 12 }),
    getSeries({ status: "ongoing", limit: 12 }),
    getSeries({ status: "completed", limit: 12 })
  ]);

  // Discover LCP images upfront so browsers and PageSpeed discover them immediately in the initial HTML
  const topImages = latestSeries
    .slice(0, 4)
    .map((s) => {
      const raw = image(s.thumbnail || s.banner);
      return raw || "";
    })
    .filter(Boolean);

  return (
    <main className="pt-6 sm:pt-10">
      {/* Semantic Top-Level H1 for SEO and Screen Readers */}
      <h1 className="sr-only">Sri Explainer | Watch Premium Comic, Anime & Donghua Explanations</h1>

      {/* Preload ONLY the #1 critical above-the-fold LCP image resource */}
      {topImages.slice(0, 1).map((imgUrl) => {
        const base = imgUrl.split("?")[0];
        const isOptimizable = Boolean(base && (base.includes("/uploads/") || base.startsWith("/api/uploads/")));
        return (
          <link
            key={imgUrl}
            rel="preload"
            as="image"
            href={isOptimizable ? `${base}?w=280&q=75` : imgUrl}
            imageSrcSet={isOptimizable ? `${base}?w=200&q=75 200w, ${base}?w=280&q=75 280w, ${base}?w=380&q=75 380w` : undefined}
            imageSizes="(max-width: 640px) 135px, (max-width: 768px) 170px, 190px"
            // @ts-expect-error fetchpriority is a modern HTML standard attribute
            fetchpriority="high"
          />
        );
      })}

      <ContinueWatchingRow />
      <Row
        title="Latest Episodes"
        endpoint="/series?limit=12"
        href="/latest"
        priority={true}
        initialData={latestSeries}
      />
      <Row
        title="Trending Now"
        endpoint="/series?trending=true&limit=12"
        href="/trending"
        initialData={trendingSeries}
      />
      <StatusSection
        status="ongoing"
        title="Ongoing Series"
        href="/ongoing"
        initialData={ongoingSeries}
      />
      <StatusSection
        status="completed"
        title="Completed Series"
        href="/completed"
        initialData={completedSeries}
      />
      <PricingSection showTitle={true} compact={true} />
      <div className="shell pb-10">
        <SupportSection />
      </div>
    </main>
  );
}

