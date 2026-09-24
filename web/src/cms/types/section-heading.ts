import type { PortableTextBlock } from "@portabletext/types";

export interface CmsSectionHeading {
  eyebrow?: PortableTextBlock[];

  title?: PortableTextBlock[];

  description?: PortableTextBlock[];

  disclaimer?: PortableTextBlock[];
}
