import type { CmsBlock } from "@/cms/types";
import { fixtureImage } from "./images";
import { fixtureText } from "./portable-text";

/** CMS-shaped Tabs content, rendered through the production BlockRenderer. */
export const tabsVisualBlocks = [
  {
    _type: "tabsBlock",
    _key: "visual-tabs-interactive",
    alignment: "left",
    heading: {
      eyebrow: fixtureText("tabs-eyebrow", "TABS / INTERACTIVE"),
      title: fixtureText("tabs-heading", "Explore component states"),
      description: fixtureText(
        "tabs-description",
        "Select each panel to verify tab controls, content changes, spacing, and mobile layout.",
      ),
      textAlignment: "left",
    },
    items: [
      {
        _type: "tabsItem",
        _key: "visual-tab-overview",
        label: "Overview",
        badge: "Start",
        defaultActive: true,
        mediaType: "none",
        content: fixtureText(
          "tabs-overview-content",
          "Overview panel: stable introductory copy that should appear when the page first loads.",
        ),
      },
      {
        _type: "tabsItem",
        _key: "visual-tab-details",
        label: "Details",
        mediaType: "image",
        image: fixtureImage("grid-pattern.svg", "Teal tabs illustration"),
        content: fixtureText(
          "tabs-details-content",
          "Details panel: longer editorial copy alongside a locally served illustration, verifying the responsive media and text layout.",
        ),
      },
      {
        _type: "tabsItem",
        _key: "visual-tab-accessibility",
        label: "Accessibility",
        badge: "A11Y",
        mediaType: "none",
        content: fixtureText(
          "tabs-accessibility-content",
          "Accessibility panel: keyboard navigation, focus states, and selected-tab behavior remain testable without live CMS content.",
        ),
      },
    ],
    styles: {
      verticalPadding: "xl",
      background: "surface",
      contentWidth: "wide",
    },
  },
] satisfies CmsBlock[];
