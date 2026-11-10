import type { PortableTextBlock } from "@portabletext/types";
import type { CmsBlock } from "@/cms/types";
import { fixtureText } from "./portable-text";

const content: PortableTextBlock[] = [
  {
    _type: "block",
    _key: "rich-subheading",
    style: "h2",
    markDefs: [],
    children: [
      {
        _type: "span",
        _key: "rich-subheading-text",
        marks: [],
        text: "Stable editorial typography",
      },
    ],
  },
  {
    _type: "block",
    _key: "rich-paragraph",
    style: "normal",
    markDefs: [],
    children: [
      {
        _type: "span",
        _key: "rich-preamble",
        marks: [],
        text: "Rich Text supports ",
      },
      {
        _type: "span",
        _key: "rich-strong",
        marks: ["strong"],
        text: "strong emphasis",
      },
      {
        _type: "span",
        _key: "rich-conjunction",
        marks: [],
        text: " and ",
      },
      {
        _type: "span",
        _key: "rich-em",
        marks: ["em"],
        text: "italic emphasis",
      },
      {
        _type: "span",
        _key: "rich-period",
        marks: [],
        text: ".",
      },
    ],
  },
  {
    _type: "block",
    _key: "rich-list-one",
    style: "normal",
    listItem: "bullet",
    level: 1,
    markDefs: [],
    children: [
      {
        _type: "span",
        _key: "rich-list-one-text",
        marks: [],
        text: "Consistent paragraph spacing",
      },
    ],
  },
  {
    _type: "block",
    _key: "rich-list-two",
    style: "normal",
    listItem: "bullet",
    level: 1,
    markDefs: [],
    children: [
      {
        _type: "span",
        _key: "rich-list-two-text",
        marks: [],
        text: "Responsive reading widths",
      },
    ],
  },
  {
    _type: "block",
    _key: "rich-quote",
    style: "blockquote",
    markDefs: [],
    children: [
      {
        _type: "span",
        _key: "rich-quote-text",
        marks: [],
        text: "Predictable content makes visual regressions meaningful.",
      },
    ],
  },
];

/** CMS-shaped Rich Text input. The real renderer invokes mapRichTextBlock. */
export const richTextVisualBlocks = [
  {
    _type: "richTextBlock",
    _key: "visual-rich-text-main",
    heading: {
      eyebrow: fixtureText("rich-eyebrow", "PROTI RICH TEXT FIXTURE"),
      title: fixtureText("rich-title", "Portable Text rendering"),
      textAlignment: "left",
    },
    content,
    alignment: "left",
    maxWidth: "md",
    styles: {
      verticalPadding: "lg",
      contentWidth: "standard",
    },
  },
] satisfies CmsBlock[];
