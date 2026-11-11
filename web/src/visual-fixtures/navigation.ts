import type {
  CmsLink,
  CmsNavigationFooter,
  CmsNavigationHeader,
} from "@/cms/types";

import { fixtureImage } from "./images";

/**
 * Stable CMS-shaped navigation data. All in-page destinations are anchors,
 * so exercising a menu never depends on CMS routing or external websites.
 *
 * The same inputs flow through mapNavigationHeader/mapNavigationFooter and
 * the production SiteHeader/SiteFooter components on the fixture page.
 */
const anchor = (name: string): CmsLink => ({ type: "anchor", anchor: name });

export const navigationVisualHeader = {
  _id: "visual-fixture-header",
  title: "Navigation visual fixture header",
  key: "visual-fixture-header",
  logo: { mode: "site", siteName: "Proti" },
  align: "center",
  variant: "standard",
  isSticky: true,
  items: [
    {
      _key: "home",
      label: "Home",
      mode: "link",
      link: anchor("fixture-home"),
    },
    {
      _key: "products",
      label: "Products",
      mode: "dropdown",
      children: [
        {
          _key: "products-library",
          label: "Component Library",
          description: "Reusable Mino UI components",
          link: anchor("fixture-components"),
        },
        {
          _key: "products-starter",
          label: "Website Starter",
          description: "Content-ready Proti sites",
          link: anchor("fixture-starter"),
        },
      ],
    },
    {
      _key: "solutions",
      label: "Solutions",
      mode: "mega",
      megaMenu: {
        columns: 4,
        sections: [
          {
            _key: "solutions-links",
            _type: "navigationMegaLinksSection",
            title: "Explore",
            span: 1,
            items: [
              {
                _key: "documentation",
                label: "Documentation",
                link: anchor("fixture-documentation"),
              },
              {
                _key: "guides",
                label: "Guides",
                link: anchor("fixture-guides"),
              },
            ],
          },
          {
            _key: "solutions-tiles",
            _type: "navigationMegaTilesSection",
            title: "Building blocks",
            span: 2,
            columns: 2,
            items: [
              {
                _key: "tile-ui",
                label: "Mino UI components",
                description: "A reusable component system",
                link: anchor("fixture-components"),
                illustration: fixtureImage(
                  "grid-pattern.svg",
                  "Teal navigation illustration",
                ),
                tone: "muted",
              },
              {
                _key: "tile-cms",
                label: "Sanity CMS",
                description: "Structured editorial content",
                link: anchor("fixture-starter"),
                tone: "surface",
              },
            ],
          },
          {
            _key: "solutions-feature",
            _type: "navigationMegaFeatureSection",
            title: "Start with Proti",
            eyebrow: "Featured",
            description: "Build fast with a flexible CMS starter.",
            presentation: "card",
            ctaLabel: "View the starter",
            link: anchor("fixture-starter"),
            span: 1,
            tone: "accent",
          },
        ],
      },
    },
    {
      _key: "contact",
      label: "Contact",
      mode: "link",
      link: anchor("fixture-contact"),
    },
  ],
  utilityActions: [],
} satisfies CmsNavigationHeader;

export const navigationVisualFooter = {
  _id: "visual-fixture-footer",
  title: "Navigation visual fixture footer",
  key: "visual-fixture-footer",
  logo: { mode: "site", siteName: "Proti" },
  description: "A predictable, CMS-independent layout for visual regression.",
  columns: [
    {
      _key: "footer-platform",
      title: "Platform",
      links: [
        {
          _key: "footer-components",
          label: "Components",
          link: anchor("fixture-components"),
        },
        {
          _key: "footer-starter",
          label: "Starter",
          link: anchor("fixture-starter"),
        },
      ],
    },
    {
      _key: "footer-resources",
      title: "Resources",
      links: [
        {
          _key: "footer-docs",
          label: "Documentation",
          link: anchor("fixture-documentation"),
        },
        {
          _key: "footer-guides",
          label: "Guides",
          link: anchor("fixture-guides"),
        },
      ],
    },
    {
      _key: "footer-company",
      title: "Company",
      links: [
        {
          _key: "footer-about",
          label: "About",
          link: anchor("fixture-home"),
        },
        {
          _key: "footer-contact",
          label: "Contact",
          link: anchor("fixture-contact"),
        },
      ],
    },
  ],
  legalLinks: [
    {
      _key: "footer-privacy",
      label: "Privacy",
      link: anchor("fixture-privacy"),
    },
    {
      _key: "footer-accessibility",
      label: "Accessibility",
      link: anchor("fixture-accessibility"),
    },
  ],
  socialLinks: [],
  copyright: "© 2026 Proti. Visual fixture content.",
} satisfies CmsNavigationFooter;

export const navigationVisualLocales = [
  { code: "en-us", label: "English" },
  { code: "es-us", label: "Español" },
];

// Exact translation destination is fixture-only. The test never navigates to it.
export const navigationVisualLocaleHrefs = {
  "es-us": "/es-us/visual-fixtures/navigation",
};
