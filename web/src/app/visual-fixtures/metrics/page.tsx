import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlockRenderer } from "@/components/BlockRenderer";
import { metricsVisualBlocks } from "@/visual-fixtures/metrics";
import { visualFixturesEnabled } from "@/visual-fixtures/enabled";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Metrics visual fixture | Proti",
  robots: { index: false, follow: false },
};

export default function MetricsVisualFixturePage() {
  if (!visualFixturesEnabled()) notFound();
  return (
    <main data-mino-theme data-visual-fixture="metrics">
      <BlockRenderer
        blocks={metricsVisualBlocks}
        context={{ siteId: "visual-fixtures", locale: "en-us" }}
      />
    </main>
  );
}
