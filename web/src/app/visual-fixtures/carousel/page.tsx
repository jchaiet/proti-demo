import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlockRenderer } from "@/components/BlockRenderer";
import { visualFixturesEnabled } from "@/visual-fixtures/enabled";
import { carouselVisualBlocks } from "@/visual-fixtures/carousel";

// Gate the route at request time; do not prerender fixture content.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Carousel visual fixture | Proti",
  robots: { index: false, follow: false },
};

export default function CarouselVisualFixturePage() {
  if (!visualFixturesEnabled()) notFound();

  return (
    <main data-mino-theme data-visual-fixture="carousel">
      <BlockRenderer
        blocks={carouselVisualBlocks}
        context={{ siteId: "visual-fixtures", locale: "en-us" }}
      />
    </main>
  );
}
