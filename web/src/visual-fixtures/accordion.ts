import type { CmsBlock } from "@/cms/types";
import { fixtureText } from "./portable-text";

/**
 * CMS-shaped, deterministic content for the production AccordionBlock mapper.
 * All items begin collapsed so each Playwright visual state has a known start.
 * No Sanity IDs, live data, network images, or time-dependent content.
 */
export const accordionVisualBlocks = [
  {
    _type: "accordionBlock",
    _key: "visual-accordion-multiple",
    layout: "default",
    alignment: "left",
    multiple: true,
    heading: {
      eyebrow: fixtureText("accordion-multi-eyebrow", "ACCORDION / MULTIPLE"),
      title: fixtureText("accordion-multi-title", "Frequently asked questions"),
      description: fixtureText(
        "accordion-multi-description",
        "Open one or several answers to check spacing, icons, and responsive behavior.",
      ),
      textAlignment: "left",
    },
    items: [
      {
        _type: "accordionItem",
        _key: "accordion-multi-rendering",
        title: "How are visual fixtures rendered?",
        content:
          "Proti sends stable content through the real BlockRenderer and Mino UI components. Each baseline represents production rendering without a live CMS dependency.",
        defaultOpen: false,
      },
      {
        _type: "accordionItem",
        _key: "accordion-multi-content",
        title: "Why use predictable content?",
        content:
          "Predictable content makes layout differences meaningful. Fixed headings, descriptions, and item order prevent routine editorial changes from producing false visual regressions. The longer answer also checks that an expanded panel has enough room for multiple lines of text on narrow screens.",
        defaultOpen: false,
      },
      {
        _type: "accordionItem",
        _key: "accordion-multi-responsive",
        title: "What happens on smaller screens?",
        content:
          "The same accordion remains usable on mobile. Titles may wrap, but their controls, borders, focus states, and answer text should remain visible and readable.",
        defaultOpen: false,
      },
    ],
    styles: {
      verticalPadding: "lg",
      background: "surface",
      contentWidth: "standard",
    },
  },
  {
    _type: "accordionBlock",
    _key: "visual-accordion-exclusive",
    layout: "split",
    alignment: "left",
    accordionPosition: "right",
    multiple: false,
    heading: {
      eyebrow: fixtureText("accordion-single-eyebrow", "ACCORDION / SINGLE"),
      title: fixtureText("accordion-single-title", "One panel at a time"),
      description: fixtureText(
        "accordion-single-description",
        "The split layout shows how exclusive expansion behaves beside its heading.",
      ),
      textAlignment: "left",
    },
    items: [
      {
        _type: "accordionItem",
        _key: "accordion-single-first",
        title: "Which panel opens first?",
        content:
          "The first exclusive answer is visible until another panel is selected.",
        defaultOpen: false,
      },
      {
        _type: "accordionItem",
        _key: "accordion-single-second",
        title: "Can a second panel replace it?",
        content:
          "Opening this second answer should collapse the first exclusive answer.",
        defaultOpen: false,
      },
    ],
    styles: {
      verticalPadding: "lg",
      background: "brand-muted",
      contentWidth: "wide",
    },
  },
] satisfies CmsBlock[];
