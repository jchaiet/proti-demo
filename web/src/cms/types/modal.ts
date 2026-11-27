import type {
  CmsAccordionBlock,
  CmsContentBlock,
  CmsNoticeBlock,
  CmsFormBlock,
  CmsRichTextBlock,
  CmsTabsBlock,
} from "./blocks";

export type CmsModalSize = "sm" | "md" | "lg" | "xl" | "full";

export type CmsModalBlock =
  | CmsContentBlock
  | CmsNoticeBlock
  | CmsRichTextBlock
  | CmsAccordionBlock
  | CmsTabsBlock
  | CmsFormBlock;

export interface CmsModal {
  _id: string;

  /** Internal editor-facing name. */
  title: string;

  /** Stable identity shared across localized Modal documents. */
  key: string;

  /** Public dialog heading. */
  modalTitle: string;

  description?: string;
  size?: CmsModalSize;

  siteId: string;
  locale: string;

  content?: CmsModalBlock[];
}
