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
import { Hero } from "./Hero";
import { BlockStyles } from "./BlockStyles";

export interface BlockRendererContext {
  siteId: string;
  locale: string;
  localePrefix?: string;
  visualEditing?: boolean;
  searchParams?: Record<string, string | string[] | undefined>;
  /** Set to false when an earlier component (for example BlogHero) owns LCP. */
  priorityHeroImage?: boolean;
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
        blocks.map(async (block, index) => {
          const isLeadingBlock =
            index === 0 && context.priorityHeroImage !== false;

          switch (block._type) {
            case "heroBlock": {
              const props = await mapHeroBlock(block);

              return (
                <BlockStyles key={block._key} config={block.styles}>
                  <Hero
                    {...props}
                    imageLoading={isLeadingBlock ? "eager" : "lazy"}
                    imageFetchPriority={
                      isLeadingBlock && props.imageSrc ? "high" : "auto"
                    }
                  />
                </BlockStyles>
              );
            }

            case "carouselBlock": {
              const [{ Carousel }, props] = await Promise.all([
                import("./Carousel"),
                mapCarouselBlock(block),
              ]);

              return (
                <BlockStyles key={block._key} config={block.styles}>
                  <Carousel {...props} />
                </BlockStyles>
              );
            }

            case "accordionBlock": {
              const [{ Accordion }, props] = await Promise.all([
                import("./Accordion"),
                mapAccordionBlock(block),
              ]);

              return (
                <BlockStyles key={block._key} config={block.styles}>
                  <Accordion {...props} />
                </BlockStyles>
              );
            }

            case "contentBlock": {
              const [{ Content }, props] = await Promise.all([
                import("./Content"),
                mapContentBlock(block),
              ]);

              return (
                <BlockStyles key={block._key} config={block.styles}>
                  <Content
                    {...props}
                    imageLoading={isLeadingBlock ? "eager" : "lazy"}
                    imageFetchPriority={
                      isLeadingBlock && props.imageSrc ? "high" : "auto"
                    }
                  />
                </BlockStyles>
              );
            }

            case "tabsBlock": {
              const [{ Tabs }, props] = await Promise.all([
                import("./Tabs"),
                mapTabsBlock(block),
              ]);

              return (
                <BlockStyles key={block._key} config={block.styles}>
                  <Tabs {...props} />
                </BlockStyles>
              );
            }

            case "formBlock": {
              const [{ Form }, props] = await Promise.all([
                import("./Form"),
                mapFormBlock(block),
              ]);

              return (
                <BlockStyles key={block._key} config={block.styles}>
                  <Form
                    {...props}
                    siteId={context.siteId}
                    locale={context.locale}
                  />
                </BlockStyles>
              );
            }

            case "gridBlock": {
              const [{ Grid }, props] = await Promise.all([
                import("./Grid"),
                mapGridBlock(block),
              ]);

              return (
                <BlockStyles key={block._key} config={block.styles}>
                  <Grid {...props} />
                </BlockStyles>
              );
            }

            case "documentListBlock": {
              const [{ DocumentList }, mapped] = await Promise.all([
                import("./DocumentList"),
                mapDocumentListBlock(block, context),
              ]);

              return (
                <BlockStyles key={block._key} config={block.styles}>
                  <DocumentList {...mapped} />
                </BlockStyles>
              );
            }

            case "richTextBlock": {
              const [{ RichText }, props] = await Promise.all([
                import("./RichText"),
                Promise.resolve(mapRichTextBlock(block)),
              ]);

              return (
                <BlockStyles key={block._key} config={block.styles}>
                  <RichText {...props} />
                </BlockStyles>
              );
            }

            case "pollBlock": {
              const [{ Poll }, props] = await Promise.all([
                import("./Poll"),
                Promise.resolve(mapPollBlock(block, context)),
              ]);

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
                  context={{ ...context, priorityHeroImage: isLeadingBlock }}
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
