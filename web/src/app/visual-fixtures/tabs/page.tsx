import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlockRenderer } from "@/components/BlockRenderer";
import { visualFixturesEnabled } from "@/visual-fixtures/enabled";
import { tabsVisualBlocks } from "@/visual-fixtures/tabs";

// Gate the route at request time; do not prerender fixture content.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tabs visual fixture | Proti",
  robots: { index: false, follow: false },
};

export default function TabsVisualFixturePage() {
  if (!visualFixturesEnabled()) notFound();

  return (
    <main data-mino-theme data-visual-fixture="tabs">
      <BlockRenderer
        blocks={tabsVisualBlocks}
        context={{ siteId: "visual-fixtures", locale: "en-us" }}
      />
    </main>
  );
}
