import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlockRenderer } from "@/components/BlockRenderer";
import { visualFixturesEnabled } from "@/visual-fixtures/enabled";
import { gridVisualBlocks } from "@/visual-fixtures/grid";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Grid visual fixture | Proti",
  robots: { index: false, follow: false },
};

export default function GridVisualFixturePage() {
  if (!visualFixturesEnabled()) notFound();

  return (
    <main data-mino-theme data-visual-fixture="grid">
      <BlockRenderer
        blocks={gridVisualBlocks}
        context={{ siteId: "visual-fixtures", locale: "en-us" }}
      />
      <div id="grid-details" aria-hidden="true" />
    </main>
  );
}
