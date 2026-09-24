const LINK_PROJECTION = `
  type,

  internalPage {
    _ref
  },

  externalUrl,
  openInNewTab,
  email,
  phone,
  anchor
`;

const CTA_PROJECTION = `
  _key,
  _type,

  label,
  variant,
  size,
  inverted,
  icon,
  iconAlignment,

  link {
    ${LINK_PROJECTION}
  }
`;

const LOGO_PROJECTION = `
  "mode": logoMode,

  "customImage": {
    "asset": logoOverride.asset,
    "crop": logoOverride.crop,
    "hotspot": logoOverride.hotspot,
    "alt": coalesce(
      logoOverride.alt,
      ""
    )
  },

  "siteImage": {
    "asset": site->logo.asset,
    "crop": site->logo.crop,
    "hotspot": site->logo.hotspot,
    "alt": coalesce(
      site->logo.alt,
      site->name,
      ""
    )
  },

  "siteName": site->name
`;

const HEADER_PROJECTION = `
  _id,
  title,
  key,

  "logo": {
    ${LOGO_PROJECTION}
  },

  align,
  variant,
  isSticky,

  items[] {
    _key,

    label,
    badge,

    link {
      ${LINK_PROJECTION}
    },

    children[] {
      _key,

      label,
      description,
      icon,
      badge,

      link {
        ${LINK_PROJECTION}
      }
    }
  },

  utilityActions[] {
    ${CTA_PROJECTION}
  }
`;

const FOOTER_LINK_PROJECTION = `
  _key,

  label,
  badge,

  link {
    ${LINK_PROJECTION}
  }
`;

const FOOTER_PROJECTION = `
  _id,
  title,
  key,

  "logo": {
    ${LOGO_PROJECTION}
  },

  description,

  columns[] {
    _key,
    title,

    links[] {
      ${FOOTER_LINK_PROJECTION}
    }
  },

  socialLinks[] {
    _key,

    label,
    icon,

    link {
      ${LINK_PROJECTION}
    }
  },

  legalLinks[] {
    ${FOOTER_LINK_PROJECTION}
  },

  copyright
`;

export const NAVIGATION_SET_QUERY = `
  *[
    _type == "navigationSet" &&
    site._ref == $siteId &&
    locale == $locale &&
    _id == coalesce(
      select(
        defined($navigationSetId) => $navigationSetId
      ),

      *[
        _type == "navigationSet" &&
        site._ref == $siteId &&
        locale == $locale &&
        _id in *[
          _type == "site" &&
          _id == $siteId
        ][0].defaultNavigationSets[]._ref
      ][0]._id
    )
  ][0] {
    _id,
    title,
    key,

    "siteId": site._ref,
    locale,

    headerMode,
    footerMode,

    "header": select(
      headerMode != "none" =>
        header->{
          ${HEADER_PROJECTION}
        }
    ),

    "footer": select(
      footerMode != "none" =>
        footer->{
          ${FOOTER_PROJECTION}
        }
    )
  }
`;
