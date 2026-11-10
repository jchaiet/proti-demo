import type { CmsBlock } from "@/cms/types";
import { fixtureImage } from "./images";
import { fixtureText } from "./portable-text";

/** Four fixed local slides. Autoplay is disabled for deterministic snapshots. */
export const carouselVisualBlocks = [
  {
    _type: "carouselBlock",
    _key: "visual-carousel-images",
    layout: "default",
    alignment: "left",
    heading: {
      eyebrow: fixtureText("carousel-eyebrow", "CAROUSEL / INTERACTIVE"),
      title: fixtureText("carousel-heading", "A consistent visual sequence"),
      description: fixtureText(
        "carousel-description",
        "Navigate through four local illustrations. No autoplay, remote images, or changing editorial content.",
      ),
      textAlignment: "left",
    },
    itemsPerPage: 1,
    itemsPerRow: 1,
    autoPlay: false,
    mobilePeek: false,
    grayscaleImages: false,
    items: [
      {
        _type: "carouselImageItem",
        _key: "visual-carousel-slide-one",
        image: fixtureImage(
          "grid-pattern.svg",
          "Carousel slide one: teal geometry",
        ),
      },
      {
        _type: "carouselImageItem",
        _key: "visual-carousel-slide-two",
        image: fixtureImage(
          "article-cover.svg",
          "Carousel slide two: coral geometry",
        ),
      },
      {
        _type: "carouselImageItem",
        _key: "visual-carousel-slide-three",
        image: fixtureImage(
          "resource-cover.svg",
          "Carousel slide three: blue geometry",
        ),
      },
      {
        _type: "carouselImageItem",
        _key: "visual-carousel-slide-four",
        image: fixtureImage(
          "grid-pattern.svg",
          "Carousel slide four: teal geometry",
        ),
      },
    ],
    styles: {
      verticalPadding: "lg",
      background: "canvas",
      contentWidth: "standard",
    },
  },
] satisfies CmsBlock[];
