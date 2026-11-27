import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlockRenderer } from "@/components/BlockRenderer";
import { noticeVisualBlocks } from "@/visual-fixtures/notice";
import { visualFixturesEnabled } from "@/visual-fixtures/enabled";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Notice visual fixture | Proti",
  robots: { index: false, follow: false },
};

export default function NoticeVisualFixturePage() {
  if (!visualFixturesEnabled()) notFound();
  return (
    <main data-mino-theme data-visual-fixture="notice">
      <BlockRenderer
        blocks={noticeVisualBlocks}
        context={{ siteId: "visual-fixtures", locale: "en-us" }}
      />
    </main>
  );
}
