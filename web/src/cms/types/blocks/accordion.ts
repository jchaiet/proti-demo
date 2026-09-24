import type { CmsCta } from "../cta";

import type { CmsSectionHeading } from "../section-heading";

export type CmsAccordionAlignment = "left" | "center" | "right";

export type CmsAccordionLayout = "default" | "split" | "split-35-65";

export type CmsAccordionPosition = "left" | "right";

export interface CmsAccordionItem {
  _key: string;
  _type: "accordionItem";

  title: string;
  content: string;

  defaultOpen?: boolean;
}

export interface CmsAccordionBlock {
  _key: string;
  _type: "accordionBlock";

  heading?: CmsSectionHeading;

  layout?: CmsAccordionLayout;

  alignment?: CmsAccordionAlignment;

  accordionPosition?: CmsAccordionPosition;

  ctas?: CmsCta[];

  ctaStackOnMobile?: boolean;

  items?: CmsAccordionItem[];

  multiple?: boolean;
}
