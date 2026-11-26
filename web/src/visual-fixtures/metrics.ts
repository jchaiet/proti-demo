import type { CmsBlock } from "@/cms/types";
import { fixtureText } from "./portable-text";

const heading = (key: string, value: string) =>
  fixtureText(key, value).map((item) => ({ ...item, style: "h2" }));

/** CMS-shaped fixtures pass through the real mapper and Mino renderer. */
export const metricsVisualBlocks = [
  {
    _type: "metricsBlock",
    _key: "metrics-default",
    heading: {
      eyebrow: fixtureText("metrics-eyebrow", "OUR IMPACT"),
      title: heading("metrics-title", "By the numbers"),
      description: fixtureText(
        "metrics-description",
        "Static, accessible statistics for any website.",
      ),
    },
    variant: "default",
    alignment: "center",
    columns: 3,
    metrics: [
      {
        _key: "metric-1",
        value: "95",
        suffix: "%",
        label: "Patient satisfaction",
      },
      {
        _key: "metric-2",
        value: "2M",
        suffix: "+",
        label: "Members supported",
      },
      { _key: "metric-3", value: "24/7", label: "Access to care" },
    ],
    styles: {
      verticalPadding: "md",
      background: "surface",
      contentWidth: "standard",
    },
  },
  {
    _type: "metricsBlock",
    _key: "metrics-cards",
    variant: "cards",
    columns: 2,
    alignment: "left",
    metrics: [
      { _key: "metric-4", value: "45", prefix: "$", label: "Average savings" },
      {
        _key: "metric-5",
        value: "10",
        suffix: "+",
        label: "Years of experience",
      },
    ],
    styles: {
      verticalPadding: "md",
      background: "surface",
      contentWidth: "standard",
    },
  },
  {
    _type: "metricsBlock",
    _key: "metrics-divided",
    variant: "divided",
    columns: 4,
    alignment: "center",
    metrics: [
      { _key: "metric-6", value: "1", label: "Simple platform" },
      { _key: "metric-7", value: "2", label: "Connected apps" },
    ],
    styles: {
      verticalPadding: "md",
      background: "surface",
      contentWidth: "standard",
    },
  },
] satisfies CmsBlock[];
