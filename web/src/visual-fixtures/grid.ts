import type { CmsBlock } from "@/cms/types";
import { fixtureImage } from "./images";
import { fixtureText } from "./portable-text";

/** CMS-shaped Grid fixtures, mapped by the real mapGridBlock. */
export const gridVisualBlocks = [
  {
    _type: "gridBlock",
    _key: "visual-grid-one",
    cols: 1,
    heading: {
      eyebrow: fixtureText("grid-one-eyebrow", "ONE COLUMN"),
      title: fixtureText("grid-one-title", "Single-column reference"),
      description: fixtureText(
        "grid-one-description",
        "One item across the available width.",
      ),
    },
    styles: {
      verticalPadding: "md",
      contentWidth: "standard",
      background: "surface",
    },
    items: [
      {
        _type: "articleCard",
        _key: "grid-single-article",
        title: "A single focused story",
        summary: "A consistent article card in a one-column Grid.",
        category: "Grid basics",
        publishedAt: "2026-01-15",
        readTime: "4 min read",
        orientation: "horizontal",
        link: { type: "anchor", anchor: "grid-details" },
      },
    ],
  },
  {
    _type: "gridBlock",
    _key: "visual-grid-two",
    cols: 2,
    heading: {
      eyebrow: fixtureText("grid-two-eyebrow", "TWO COLUMNS"),
      title: fixtureText("grid-two-title", "Image tiles in a responsive grid"),
    },
    styles: { verticalPadding: "md", contentWidth: "wide" },
    items: [
      {
        _type: "gridImageItem",
        _key: "grid-tile-one",
        image: fixtureImage("grid-pattern.svg", "Teal geometric tile"),
      },
      {
        _type: "gridImageItem",
        _key: "grid-tile-two",
        image: fixtureImage("resource-cover.svg", "Blue geometric tile"),
      },
    ],
  },
  {
    _type: "gridBlock",
    _key: "visual-grid-three",
    cols: 3,
    heading: {
      eyebrow: fixtureText("grid-three-eyebrow", "THREE COLUMNS"),
      title: fixtureText("grid-three-title", "Mixed cards at desktop width"),
    },
    styles: {
      verticalPadding: "lg",
      background: "canvas",
      contentWidth: "standard",
    },
    items: [
      {
        _type: "articleCard",
        _key: "grid-article-image",
        title: "Designing predictable components",
        summary: "A consistent article summary across viewports.",
        category: "Patterns",
        image: fixtureImage(
          "article-cover.svg",
          "Coral shapes for the patterns article",
        ),
        link: { type: "anchor", anchor: "grid-details" },
      },
      {
        _type: "resourceCard",
        _key: "grid-resource-image",
        title: "Reusable layout checklist",
        summary: "Reference material for reliable interfaces.",
        fileType: "PDF",
        fileSize: "1.4 MB",
        actionLabel: "Open resource",
        tags: ["Guide", "Layouts"],
        image: fixtureImage(
          "resource-cover.svg",
          "Blue shapes for the layout resource",
        ),
        link: { type: "anchor", anchor: "grid-details" },
      },
      {
        _type: "articleCard",
        _key: "grid-article-text",
        title: "A card without artwork",
        summary: "An image-free variant to check equal-height layout behavior.",
        category: "Accessibility",
        link: { type: "anchor", anchor: "grid-details" },
      },
    ],
  },
] satisfies CmsBlock[];
