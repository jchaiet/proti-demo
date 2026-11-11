import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlockRenderer } from "@/components/BlockRenderer";
import { visualFixturesEnabled } from "@/visual-fixtures/enabled";
import { cardsVisualBlocks } from "@/visual-fixtures/cards";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Cards visual fixture | Proti",
  robots: { index: false, follow: false },
};

export default function CardsVisualFixturePage() {
  if (!visualFixturesEnabled()) notFound();

  return (
    <main data-mino-theme data-visual-fixture="cards">
      <BlockRenderer
        blocks={cardsVisualBlocks}
        context={{ siteId: "visual-fixtures", locale: "en-us" }}
      />
      <div id="card-details" aria-hidden="true" />
    </main>
  );
}
