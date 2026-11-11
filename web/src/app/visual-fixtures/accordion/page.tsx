import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlockRenderer } from "@/components/BlockRenderer";
import { accordionVisualBlocks } from "@/visual-fixtures/accordion";
import { visualFixturesEnabled } from "@/visual-fixtures/enabled";

// Evaluate the fixture flag on each request, not during static prerendering.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Accordion visual fixture | Proti",
  robots: { index: false, follow: false },
};

export default function AccordionVisualFixturePage() {
  if (!visualFixturesEnabled()) notFound();

  return (
    <main data-mino-theme data-visual-fixture="accordion">
      <BlockRenderer
        blocks={accordionVisualBlocks}
        context={{ siteId: "visual-fixtures", locale: "en-us" }}
      />
    </main>
  );
}
