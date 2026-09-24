import type {
  CmsAccordionBlock,
  CmsCarouselBlock,
  CmsHeroBlock,
  CmsContentBlock,
  CmsTabsBlock,
  CmsFormBlock,
  CmsGridBlock,
  CmsDocumentListBlock,
  CmsRichTextBlock,
  CmsPollBlock,
} from "./blocks";

export type CmsReusableBlock =
  | CmsHeroBlock
  | CmsCarouselBlock
  | CmsAccordionBlock
  | CmsContentBlock
  | CmsTabsBlock
  | CmsFormBlock
  | CmsGridBlock
  | CmsDocumentListBlock
  | CmsRichTextBlock
  | CmsPollBlock;

export type CmsSingleton = {
  _id: string;
  title?: string;
  key?: string;
  locale?: string;
  component?: CmsReusableBlock;
};

export type CmsSingletonReferenceBlock = {
  _type: "singletonReferenceBlock";
  _key: string;
  singleton?: CmsSingleton;
};

export type CmsBlock = CmsReusableBlock | CmsSingletonReferenceBlock;
