import { Row, ContinueWatchingRow, StatusSection } from "../components/content";
import { PricingSection } from "../components/pricing";
import { SupportSection } from "../components/support-section";

export default function Home() {
  return (
    <main className="pt-2 sm:pt-4">
      {/* Semantic Top-Level H1 for SEO and Screen Readers */}
      <h1 className="sr-only">Sri Explainer | Watch Premium Comic, Anime & Donghua Explanations</h1>

      <ContinueWatchingRow />
      <Row title="Latest Episodes" endpoint="/series?limit=12" href="/latest" />
      <Row title="Trending Now" endpoint="/series?trending=true&limit=12" href="/trending" />
      <StatusSection status="ongoing" title="Ongoing Series" href="/ongoing" />
      <StatusSection status="completed" title="Completed Series" href="/completed" />
      <PricingSection showTitle={true} compact={true} />
      <div className="shell pb-10">
        <SupportSection />
      </div>
    </main>
  );
}

