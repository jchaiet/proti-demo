import type { CmsBlock } from "@/cms/types";
import { fixtureImage } from "./images";
import { fixtureText } from "./portable-text";

/** CMS-shaped Article/Resource cards within the real GridBlock. */
export const cardsVisualBlocks = [
  {
    _type: "gridBlock",
    _key: "visual-cards-articles",
    cols: 3,
    heading: {
      eyebrow: fixtureText("article-eyebrow", "ARTICLE CARDS"),
      title: fixtureText("article-title", "Article card variants"),
      description: fixtureText(
        "article-description",
        "Image, metadata and text-only states using stable local content.",
      ),
    },
    styles: {
      verticalPadding: "lg",
      background: "surface",
      contentWidth: "wide",
    },
    items: [
      {
        _type: "articleCard",
        _key: "visual-article-complete",
        title: "A practical design system",
        summary:
          "A full article card with an illustration, category and author.",
        category: "Design",
        publishedAt: "2026-02-10",
        readTime: "6 min read",
        author: { name: "Alex Morgan", role: "Design Engineer" },
        image: fixtureImage(
          "article-cover.svg",
          "Coral abstract article illustration",
        ),
        link: { type: "anchor", anchor: "card-details" },
      },
      {
        _type: "articleCard",
        _key: "visual-article-no-summary",
        title: "An article with a short title",
        category: "Engineering",
        image: fixtureImage(
          "grid-pattern.svg",
          "Teal abstract article illustration",
        ),
        link: { type: "anchor", anchor: "card-details" },
      },
      {
        _type: "articleCard",
        _key: "visual-article-text-only",
        title: "Accessible content, no image",
        summary:
          "An image-free article uses the same production card component.",
        category: "Accessibility",
        link: { type: "anchor", anchor: "card-details" },
      },
    ],
  },
  {
    _type: "gridBlock",
    _key: "visual-cards-resources",
    cols: 2,
    heading: {
      eyebrow: fixtureText("resource-eyebrow", "RESOURCE CARDS"),
      title: fixtureText("resource-title", "Resource card variants"),
    },
    styles: { verticalPadding: "lg", contentWidth: "standard" },
    items: [
      {
        _type: "resourceCard",
        _key: "visual-resource-complete",
        title: "Responsive interface checklist",
        summary: "A stable PDF-style resource with imagery and tags.",
        fileType: "PDF",
        fileSize: "860 KB",
        tags: ["Testing", "Design"],
        actionLabel: "View checklist",
        image: fixtureImage(
          "resource-cover.svg",
          "Blue abstract resource illustration",
        ),
        link: { type: "anchor", anchor: "card-details" },
      },
      {
        _type: "resourceCard",
        _key: "visual-resource-text-only",
        title: "Content style reference",
        fileType: "DOCX",
        fileSize: "210 KB",
        tags: ["Editorial"],
        actionLabel: "Open reference",
        link: { type: "anchor", anchor: "card-details" },
      },
    ],
  },
] satisfies CmsBlock[];
