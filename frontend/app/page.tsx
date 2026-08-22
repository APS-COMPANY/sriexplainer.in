import { Row, ContinueWatchingRow, StatusSection } from "../components/content";
import { PricingSection } from "../components/pricing";
import { SupportSection } from "../components/support-section";

export default function Home() {
  return (
    <main className="pt-2 sm:pt-4">
      <ContinueWatchingRow />
      <Row title="Latest episodes" endpoint="/series?limit=12" href="/latest" />
      <Row title="Trending now" endpoint="/series?limit=12" href="/trending" />
      <StatusSection status="ongoing" title="ONGOING" />
      <StatusSection status="completed" title="COMPLETED" />
      <Row title="Recently added" endpoint="/series?limit=12" />
      <PricingSection showTitle={true} compact={true} />
      <div className="shell pb-10">
        <SupportSection />
      </div>
    </main>
  );
}
