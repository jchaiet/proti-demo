import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlockRenderer } from "@/components/BlockRenderer";
import { visualFixturesEnabled } from "@/visual-fixtures/enabled";
import { richTextVisualBlocks } from "@/visual-fixtures/rich-text";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rich Text visual fixture | Proti",
  robots: { index: false, follow: false },
};

export default function RichTextVisualFixturePage() {
  if (!visualFixturesEnabled()) notFound();

  return (
    <main data-mino-theme data-visual-fixture="rich-text">
      <BlockRenderer
        blocks={richTextVisualBlocks}
        context={{ siteId: "visual-fixtures", locale: "en-us" }}
      />
    </main>
  );
}
