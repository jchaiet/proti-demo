import type { CmsBlock } from "@/cms/types";
import { fixtureText } from "./portable-text";

/** CMS-shaped content fixture for the production BlockRenderer + mapper. */
export const contentVisualBlocks = [
  {
    _type: "contentBlock",
    _key: "visual-content-main",
    layout: "default",
    alignment: "left",
    vAlignment: "center",
    mediaType: "none",
    headingLevel: 2,
    headingSize: "2xl",
    heading: {
      eyebrow: fixtureText("content-eyebrow", "PROTI CONTENT FIXTURE"),
      title: fixtureText("content-title", "Content that stays consistent"),
      description: fixtureText(
        "content-description",
        "This Content Block checks typography, spacing, and alignment without a Sanity connection.",
      ),
      textAlignment: "left",
    },
    styles: {
      verticalPadding: "lg",
      background: "surface",
      contentWidth: "standard",
    },
  },
] satisfies CmsBlock[];
