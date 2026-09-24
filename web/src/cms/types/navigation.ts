import type { CmsCta } from "./cta";
import type { CmsIcon } from "./icon";
import type { CmsLink } from "./link";

export type CmsNavigationOverrideMode = "inherit" | "custom" | "none";

export type CmsNavigationReference = {
  _ref: string;
};

export interface CmsNavigationOverride {
  mode?: CmsNavigationOverrideMode;

  navigationSet?: CmsNavigationReference;
}

export type CmsNavigationLogoMode = "site" | "custom" | "none";

export type CmsNavigationAlign = "left" | "center" | "right";

export type CmsNavigationVariant = "standard" | "floating" | "glass";

export interface CmsNavigationLogo {
  mode: CmsNavigationLogoMode;

  customUrl?: string;
  customAlt?: string;

  siteUrl?: string;
  siteAlt?: string;

  siteName?: string;
}

export interface CmsNavigationSubItem {
  _key: string;

  label: string;
  link: CmsLink;

  description?: string;
  icon?: CmsIcon;
  badge?: string;
}

export interface CmsNavigationItem {
  _key: string;

  label: string;
  link?: CmsLink;

  badge?: string;

  children?: CmsNavigationSubItem[];
}

export interface CmsNavigationHeader {
  _id: string;

  title: string;
  key: string;

  logo: CmsNavigationLogo;

  align?: CmsNavigationAlign;
  variant?: CmsNavigationVariant;
  isSticky?: boolean;

  items?: CmsNavigationItem[];

  utilityActions?: CmsCta[];
}

export interface CmsFooterLink {
  _key: string;

  label: string;
  link: CmsLink;

  badge?: string;
}

export interface CmsFooterColumn {
  _key: string;

  title: string;

  links?: CmsFooterLink[];
}

export interface CmsNavigationSocialLink {
  _key: string;

  label: string;
  icon?: CmsIcon;
  link: CmsLink;
}

export interface CmsNavigationFooter {
  _id: string;

  title: string;
  key: string;

  logo: CmsNavigationLogo;

  description?: string;

  columns?: CmsFooterColumn[];

  socialLinks?: CmsNavigationSocialLink[];

  legalLinks?: CmsFooterLink[];

  copyright?: string;
}

export interface CmsNavigationSet {
  _id: string;

  title: string;
  key: string;

  siteId: string;
  locale: string;

  headerMode?: "custom" | "none";
  footerMode?: "custom" | "none";

  header?: CmsNavigationHeader;
  footer?: CmsNavigationFooter;
}
