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

export interface BlockRendererContext {
  siteId: string;
  locale: string;
  localePrefix?: string;
  visualEditing?: boolean;
}

type Props = {
  blocks?: CmsBlock[];
  context: BlockRendererContext;
};

export async function BlockRenderer({ blocks = [], context }: Props) {
  if (!blocks.length) {
    return null;
  }

  return (
    <>
      {await Promise.all(
        blocks.map(async (block) => {
          switch (block._type) {
            case "heroBlock": {
              const props = await mapHeroBlock(block);

              return <Hero key={block._key} {...props} />;
            }

            case "carouselBlock": {
              const props = await mapCarouselBlock(block);

              return <Carousel key={block._key} {...props} />;
            }

            case "accordionBlock": {
              const props = await mapAccordionBlock(block);

              return <Accordion key={block._key} {...props} />;
            }

            case "contentBlock": {
              const props = await mapContentBlock(block);

              return <Content key={block._key} {...props} />;
            }

            case "tabsBlock": {
              const props = await mapTabsBlock(block);

              return <Tabs key={block._key} {...props} />;
            }

            case "formBlock": {
              const props = await mapFormBlock(block);

              return <Form key={block._key} {...props} />;
            }

            case "gridBlock": {
              const props = await mapGridBlock(block);

              return <Grid key={block._key} {...props} />;
            }

            case "documentListBlock": {
              const mapped = await mapDocumentListBlock(block, context);

              return <DocumentList key={block._key} {...mapped} />;
            }

            case "richTextBlock": {
              const props = mapRichTextBlock(block);

              return <RichText key={block._key} {...props} />;
            }

            case "pollBlock": {
              const props = mapPollBlock(block, context);

              return <Poll key={block._key} {...props} />;
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
