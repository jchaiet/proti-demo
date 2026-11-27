import type { CmsCtaGroup } from "../cta-group";
import type { CmsIcon } from "../icon";
import type { CmsSectionHeading } from "../section-heading";

export type CmsNoticeVariant =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "promotion";

export interface CmsNoticeBlock {
  _key: string;
  _type: "noticeBlock";
  heading?: CmsSectionHeading;
  variant?: CmsNoticeVariant;
  alignment?: "left" | "center" | "right";
  icon?: CmsIcon;
  ctaGroup?: CmsCtaGroup;
}
