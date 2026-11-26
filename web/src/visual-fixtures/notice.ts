import type { CmsBlock } from "@/cms/types";
import { fixtureText } from "./portable-text";

function fixtureNoticeHeading(key: string, title: string) {
  return fixtureText(key, title).map((block) => ({ ...block, style: "h2" }));
}

/** Stable, CMS-shaped data passed through the real block mapper. */
export const noticeVisualBlocks = [
  {
    _type: "noticeBlock",
    _key: "notice-information",
    variant: "info",
    alignment: "left",
    icon: "lucide:info",
    heading: {
      eyebrow: fixtureText("notice-info-eyebrow", "INFORMATION"),
      title: fixtureNoticeHeading("notice-info-title", "A useful notice"),
      description: fixtureText(
        "notice-info-description",
        "This content is always visible and does not interrupt screen readers.",
      ),
    },
    styles: {
      verticalPadding: "md",
      background: "surface",
      contentWidth: "standard",
    },
  },
  {
    _type: "noticeBlock",
    _key: "notice-promotional",
    variant: "promotion",
    alignment: "center",
    heading: {
      title: fixtureNoticeHeading(
        "notice-promo-title",
        "Discover more with Proti",
      ),
      description: fixtureText(
        "notice-promo-description",
        "Build accessible callouts with reusable design-system components.",
      ),
    },
    styles: {
      verticalPadding: "md",
      background: "surface",
      contentWidth: "standard",
    },
  },
] satisfies CmsBlock[];
