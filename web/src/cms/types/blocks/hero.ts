import type { CmsCta } from "../cta";
import type { CmsSectionHeading } from "../section-heading";
import type { ButtonGroupProps } from "mino-ui";

export type CmsHeroLayout =
  | "default"
  | "split"
  | "split-35-65"
  | "tile"
  | "full-bleed"
  | "blog";

export type CmsHeroAlignment = "left" | "center" | "right";

export type CmsHeroVAlignment = "top" | "center" | "bottom";

export type CmsHeroMediaType = "none" | "image" | "video";

export type CmsHeroImage = {
  asset?: {
    _ref?: string;
    _type?: "reference";
  };

  crop?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };

  hotspot?: {
    x?: number;
    y?: number;
    height?: number;
    width?: number;
  };

  alt?: string;
};

export type CmsHeroBlock = {
  _type: "heroBlock";
  _key: string;

  heading?: CmsSectionHeading;

  layout?: CmsHeroLayout;

  hAlignment?: CmsHeroAlignment;
  vAlignment?: CmsHeroVAlignment;

  mediaType?: CmsHeroMediaType;

  image?: CmsHeroImage;
  videoUrl?: string;

  defaultMediaPosition?: "above" | "below";

  splitMediaPosition?: "left" | "right";

  ctas?: CmsCta[];

  ctaGroupProps?: Pick<ButtonGroupProps, "stackOnMobile">;

  ctaStackOnMobile?: boolean;
};
