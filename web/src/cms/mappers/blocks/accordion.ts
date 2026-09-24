import type { AccordionBlockProps } from "mino-ui/blocks/AccordionBlock";
import type { AccordionItem } from "mino-ui/core/Accordion";
import type { CmsAccordionBlock, CmsAccordionItem } from "@/cms/types";
import { mapCtas } from "@/cms/mappers/cta";
import { mapSectionHeading } from "@/cms/mappers/section-heading";

function mapAccordionItem(item: CmsAccordionItem): AccordionItem {
  return {
    id: item._key,

    title: item.title,

    content: item.content,

    defaultOpen: item.defaultOpen ?? false,
  };
}

function mapAccordionItems(
  items: CmsAccordionItem[] | undefined,
): AccordionItem[] {
  if (!items?.length) {
    return [];
  }

  return items.map(mapAccordionItem);
}

export async function mapAccordionBlock(
  block: CmsAccordionBlock,
): Promise<AccordionBlockProps> {
  const ctas = await mapCtas(block.ctas);

  const heading = mapSectionHeading(block.heading);

  const items = mapAccordionItems(block.items);

  return {
    ...heading,

    layout: block.layout ?? "default",

    alignment: block.alignment ?? "left",

    accordionPosition: block.accordionPosition ?? "right",

    ctas,

    ctaGroupProps: {
      stackOnMobile: block.ctaStackOnMobile ?? true,
    },

    accordionProps: {
      items,

      multiple: block.multiple ?? true,
    },
  };
}
