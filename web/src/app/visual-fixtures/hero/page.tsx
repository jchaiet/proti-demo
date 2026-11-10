import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlockRenderer } from "@/components/BlockRenderer";
import { visualFixturesEnabled } from "@/visual-fixtures/enabled";
import { heroVisualBlocks } from "@/visual-fixtures/hero";

// This must be checked at request time, not prerendered as a public page.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hero visual fixture | Proti",
  robots: { index: false, follow: false },
};

export default async function HeroVisualFixturePage() {
  if (!visualFixturesEnabled()) {
    notFound();
  }

  return (
    <main data-mino-theme data-visual-fixture="hero">
      <BlockRenderer
        blocks={heroVisualBlocks}
        context={{ siteId: "visual-fixtures", locale: "en-us" }}
      />
      <div id="fixture-details" aria-hidden="true" />
    </main>
  );
}
