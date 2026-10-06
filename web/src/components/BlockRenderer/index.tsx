import {
  mapAccordionBlock,
  mapCarouselBlock,
  mapHeroBlock,
  mapContentBlock,
  mapTabsBlock,
  mapFormBlock,
  mapGridBlock,
  mapDocumentListBlock,
  mapRichTextBlock,
  mapPollBlock,
} from "@/cms/mappers/blocks";

import type { CmsBlock } from "@/cms/types";
import { Accordion } from "./Accordion";
import { Carousel } from "./Carousel";
import { Hero } from "./Hero";
import { Content } from "./Content";
import { Tabs } from "./Tabs";
import { Form } from "./Form";
import { Grid } from "./Grid";
import { DocumentList } from "./DocumentList";
import { RichText } from "./RichText";
import { Poll } from "./Poll";
import { BlockStyles } from "./BlockStyles";

export interface BlockRendererContext {
  siteId: string;
  locale: string;
  localePrefix?: string;
  visualEditing?: boolean;
  searchParams?: Record<string, string | string[] | undefined>;
}

type Props = {
  blocks?: CmsBlock[] | null;
  context: BlockRendererContext;
};

export async function BlockRenderer({ blocks, context }: Props) {
  if (!blocks?.length) {
    return null;
  }

  return (
    <>
      {await Promise.all(
        blocks.map(async (block) => {
          switch (block._type) {
            case "heroBlock": {
              const props = await mapHeroBlock(block);

              return (
                <BlockStyles key={block._key} config={block.styles}>
                  <Hero {...props} />
                </BlockStyles>
              );
            }

            case "carouselBlock": {
              const props = await mapCarouselBlock(block);

              return (
                <BlockStyles key={block._key} config={block.styles}>
                  <Carousel {...props} />
                </BlockStyles>
              );
            }

            case "accordionBlock": {
              const props = await mapAccordionBlock(block);

              return (
                <BlockStyles key={block._key} config={block.styles}>
                  <Accordion {...props} />
                </BlockStyles>
              );
            }

            case "contentBlock": {
              const props = await mapContentBlock(block);

              return (
                <BlockStyles key={block._key} config={block.styles}>
                  <Content {...props} />
                </BlockStyles>
              );
            }

            case "tabsBlock": {
              const props = await mapTabsBlock(block);

              return (
                <BlockStyles key={block._key} config={block.styles}>
                  <Tabs {...props} />
                </BlockStyles>
              );
            }

            case "formBlock": {
              const props = await mapFormBlock(block);

              return (
                <BlockStyles key={block._key} config={block.styles}>
                  <Form {...props} />
                </BlockStyles>
              );
            }

            case "gridBlock": {
              const props = await mapGridBlock(block);

              return (
                <BlockStyles key={block._key} config={block.styles}>
                  <Grid {...props} />
                </BlockStyles>
              );
            }

            case "documentListBlock": {
              const mapped = await mapDocumentListBlock(block, context);

              return (
                <BlockStyles key={block._key} config={block.styles}>
                  <DocumentList {...mapped} />
                </BlockStyles>
              );
            }

            case "richTextBlock": {
              const props = mapRichTextBlock(block);

              return (
                <BlockStyles key={block._key} config={block.styles}>
                  <RichText {...props} />
                </BlockStyles>
              );
            }

            case "pollBlock": {
              const props = mapPollBlock(block, context);

              return (
                <BlockStyles key={block._key} config={block.styles}>
                  <Poll {...props} />
                </BlockStyles>
              );
            }

            case "singletonReferenceBlock": {
              const component = block.singleton?.component;

              if (!component) {
                return null;
              }

              return (
                <BlockRenderer
                  key={block._key}
                  blocks={[component]}
                  context={context}
                />
              );
            }

            default:
              return null;
          }
        }),
      )}
    </>
  );
}
