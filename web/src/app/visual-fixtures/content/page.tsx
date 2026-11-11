import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlockRenderer } from "@/components/BlockRenderer";
import { contentVisualBlocks } from "@/visual-fixtures/content";
import { visualFixturesEnabled } from "@/visual-fixtures/enabled";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Content visual fixture | Proti",
  robots: { index: false, follow: false },
};

export default function ContentVisualFixturePage() {
  if (!visualFixturesEnabled()) notFound();

  return (
    <main data-mino-theme data-visual-fixture="content">
      <BlockRenderer
        blocks={contentVisualBlocks}
        context={{ siteId: "visual-fixtures", locale: "en-us" }}
      />
    </main>
  );
}
