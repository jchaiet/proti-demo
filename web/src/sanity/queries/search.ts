export const SEARCH_SITE_SETTINGS_QUERY = `
  *[
    _type == "site" &&
    _id == $siteId
  ][0]{
    _id,
    name,
    domains,
    defaultLocale,

    "defaultIndexing":
      coalesce(
        seoDefaults[
          locale == $locale
        ][0].indexing,
        "index"
      )
  }
`;

export const SEARCH_CONTENT_QUERY = `
  *[
    _type in ["page", "blog"] &&
    site._ref == $siteId &&
    locale == $locale
  ]{
    _id,
    _type,
    _updatedAt,

    title,
    locale,

    seo {
      indexing,
      canonicalUrl
    },

    _type == "page" => {
      slug,
      isHomepage,

      "parentId":
        parent._ref
    },

    _type == "blog" => {
      summary,

      "slug":
        slug.current,

      publishedAt,

      "image": {
        "asset": mainImage.asset,
        "crop": mainImage.crop,
        "hotspot": mainImage.hotspot,
        "alt": coalesce(
          mainImage.alt,
          ""
        )
      },

      author->{
        _id,

        "name": coalesce(
          translations[
            locale == $locale
          ][0].name,
          name
        ),

        "jobTitle": coalesce(
          translations[
            locale == $locale
          ][0].jobTitle,
          jobTitle
        )
      },

      taxonomy[]->{
        _id,

        "title": coalesce(
          translations[
            locale == $locale
          ][0].title,
          title
        ),

        "slug":
          slug.current,

        "parentId":
          parent._ref
      }
    },

    sections[]{
      ...,

      _type == "singletonReferenceBlock" => {
        ...,

        "singleton": select(
          singleton->site._ref == $siteId &&
          singleton->locale == $locale => singleton->{
          _id,
          title,
          key,
          locale,

          "component": component[0]{
            ...
          }
          }
        )
      }
    }
  }
`;

export const SEARCH_TAXONOMY_QUERY = `
  *[
    _type == "taxonomy" &&
    site._ref == $siteId
  ]{
    _id,

    "title": coalesce(
      translations[
        locale == $locale
      ][0].title,
      title
    ),

    "slug":
      slug.current,

    "parentId":
      parent._ref
  }
`;
