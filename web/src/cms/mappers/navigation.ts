import type { ReactNode } from "react";

import type { ButtonProps, NavItem } from "mino-ui";

import type {
  CmsFooterColumn,
  CmsFooterLink,
  CmsNavigationFooter,
  CmsNavigationHeader,
  CmsNavigationItem,
  CmsNavigationLogo,
  CmsNavigationSocialLink,
  CmsNavigationSubItem,
} from "@/cms/types";

import { mapCtas } from "@/cms/mappers/cta";

import { resolveIcon } from "@/cms/resolvers/icon";
import { resolveLink } from "@/cms/resolvers/link";

export interface MappedNavigationLogo {
  src?: string;
  alt: string;
  text?: string;
}

export interface MappedNavigationHeader {
  logo: MappedNavigationLogo | null;

  items: NavItem[];

  align: "left" | "center" | "right";
  variant: "standard" | "floating" | "glass";
  isSticky: boolean;

  utilityActions: ButtonProps[];
}

export interface MappedFooterLink {
  key: string;

  label: string;
  href: string;

  badge?: string;

  target?: "_blank";
  rel?: string;
}

export interface MappedFooterColumn {
  key: string;

  title: string;

  links: MappedFooterLink[];
}

export interface MappedNavigationSocialLink {
  key: string;

  label: string;
  href: string;

  target?: "_blank";
  rel?: string;

  icon?: ReactNode;
}

export interface MappedNavigationFooter {
  logo: MappedNavigationLogo | null;

  description?: string;

  columns: MappedFooterColumn[];

  socialLinks: MappedNavigationSocialLink[];

  legalLinks: MappedFooterLink[];

  copyright?: string;
}

function mapLogo(logo: CmsNavigationLogo): MappedNavigationLogo | null {
  switch (logo.mode) {
    case "none":
      return null;

    case "custom":
      if (!logo.customUrl) {
        return null;
      }

      return {
        src: logo.customUrl,
        alt: logo.customAlt ?? "",
      };

    case "site":
    default:
      if (logo.siteUrl) {
        return {
          src: logo.siteUrl,
          alt: logo.siteAlt ?? logo.siteName ?? "",
          text: logo.siteName,
        };
      }

      if (logo.siteName) {
        return {
          alt: logo.siteName,
          text: logo.siteName,
        };
      }

      return null;
  }
}

async function mapSubItem(
  item: CmsNavigationSubItem,
): Promise<NonNullable<NavItem["children"]>[number] | null> {
  const link = await resolveLink(item.link);

  if (!link) {
    return null;
  }

  return {
    label: item.label,
    href: link.href,

    description: item.description,

    icon: resolveIcon(item.icon),

    badge: item.badge,
  };
}

async function mapNavigationItem(
  item: CmsNavigationItem,
): Promise<NavItem | null> {
  const children = (
    await Promise.all((item.children ?? []).map(mapSubItem))
  ).filter(
    (child): child is NonNullable<NavItem["children"]>[number] =>
      child !== null,
  );

  /*
   * The current mino Navigation component treats a top-level
   * item with children as a dropdown button rather than a link,
   * so its own authored link is intentionally not passed through
   * when resolved dropdown children exist.
   */
  if (children.length > 0) {
    return {
      label: item.label,
      badge: item.badge,
      children,
    };
  }

  if (!item.link) {
    return null;
  }

  const link = await resolveLink(item.link);

  if (!link) {
    return null;
  }

  return {
    label: item.label,
    href: link.href,
    badge: item.badge,
  };
}

async function mapFooterLink(
  link: CmsFooterLink,
): Promise<MappedFooterLink | null> {
  const resolved = await resolveLink(link.link);

  if (!resolved) {
    return null;
  }

  return {
    key: link._key,

    label: link.label,
    href: resolved.href,

    badge: link.badge,

    target: resolved.target,
    rel: resolved.rel,
  };
}

async function mapFooterColumn(
  column: CmsFooterColumn,
): Promise<MappedFooterColumn> {
  const links = (
    await Promise.all((column.links ?? []).map(mapFooterLink))
  ).filter((link): link is MappedFooterLink => link !== null);

  return {
    key: column._key,

    title: column.title,

    links,
  };
}

async function mapSocialLink(
  social: CmsNavigationSocialLink,
): Promise<MappedNavigationSocialLink | null> {
  const link = await resolveLink(social.link);

  if (!link) {
    return null;
  }

  return {
    key: social._key,

    label: social.label,
    href: link.href,

    target: link.target,
    rel: link.rel,

    icon: resolveIcon(social.icon),
  };
}

export async function mapNavigationHeader(
  header: CmsNavigationHeader | undefined,
): Promise<MappedNavigationHeader | null> {
  if (!header) {
    return null;
  }

  const items = (
    await Promise.all((header.items ?? []).map(mapNavigationItem))
  ).filter((item): item is NavItem => item !== null);

  const utilityActions = await mapCtas(header.utilityActions);

  return {
    logo: mapLogo(header.logo),

    items,

    align: header.align ?? "center",
    variant: header.variant ?? "standard",
    isSticky: header.isSticky ?? true,

    utilityActions,
  };
}

export async function mapNavigationFooter(
  footer: CmsNavigationFooter | undefined,
): Promise<MappedNavigationFooter | null> {
  if (!footer) {
    return null;
  }

  const [columns, socialLinks, legalLinks] = await Promise.all([
    Promise.all((footer.columns ?? []).map(mapFooterColumn)),

    Promise.all((footer.socialLinks ?? []).map(mapSocialLink)),

    Promise.all((footer.legalLinks ?? []).map(mapFooterLink)),
  ]);

  return {
    logo: mapLogo(footer.logo),

    description: footer.description,

    columns,

    socialLinks: socialLinks.filter(
      (social): social is MappedNavigationSocialLink => social !== null,
    ),

    legalLinks: legalLinks.filter(
      (link): link is MappedFooterLink => link !== null,
    ),

    copyright: footer.copyright,
  };
}
