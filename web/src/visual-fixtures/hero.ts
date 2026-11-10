import type { PortableTextBlock } from "@portabletext/types";

import type { CmsBlock } from "@/cms/types";

/**
 * Small, stable Portable Text objects matching the CMS projection consumed by
 * BlockRenderer. No Sanity assets, API requests, or time-dependent values.
 */
function textBlock(key: string, text: string): PortableTextBlock[] {
  return [
    {
      _type: "block",
      _key: key,
      style: "normal",
      markDefs: [],
      children: [
        {
          _type: "span",
          _key: `${key}-span`,
          marks: [],
          text,
        },
      ],
    },
  ];
}

/** CMS-shaped input: the real BlockRenderer still invokes mapHeroBlock. */
export const heroVisualBlocks = [
  {
    _type: "heroBlock",
    _key: "visual-hero-main",
    layout: "default",
    hAlignment: "center",
    vAlignment: "center",
    mediaType: "none",
    heading: {
      eyebrow: textBlock("hero-eyebrow", "PROTI VISUAL REGRESSION"),
      title: textBlock("hero-title", "Build confidently with Proti"),
      description: textBlock(
        "hero-description",
        "A consistent Hero fixture, rendered through the real Proti and Mino UI components.",
      ),
      textAlignment: "center",
    },
    ctaGroup: {
      alignment: "center",
      stackOnMobile: true,
      items: [
        {
          _key: "visual-hero-cta",
          label: "Explore the fixture",
          variant: "primary",
          link: {
            type: "anchor",
            anchor: "fixture-details",
          },
        },
      ],
    },
  },
] satisfies CmsBlock[];
