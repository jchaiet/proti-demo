import type { PortableTextBlock } from "@portabletext/types";

/** Portable Text fixtures are stable and do not contain Sanity references. */
export function fixtureText(key: string, text: string): PortableTextBlock[] {
  return [
    {
      _type: "block",
      _key: key,
      style: "normal",
      markDefs: [],
      children: [
        {
          _type: "span",
          _key: `${key}-text`,
          marks: [],
          text,
        },
      ],
    },
  ];
}
