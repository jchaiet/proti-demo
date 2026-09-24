import type { CmsDocumentListDynamicSort } from "@/cms/types";

const SORT_EXPRESSIONS: Record<CmsDocumentListDynamicSort, string> = {
  newest: "coalesce(publishedAt, publishDate, date, _createdAt) desc",

  oldest: "coalesce(publishedAt, publishDate, date, _createdAt) asc",

  "title-asc": "title asc",

  "title-desc": "title desc",
};

export function getDynamicDocumentListQuery(
  sort: CmsDocumentListDynamicSort,
): string {
  const sortExpression = SORT_EXPRESSIONS[sort] ?? SORT_EXPRESSIONS.newest;

  return `
    *[
      _type in $types &&
      site._ref == $siteId &&
      locale == $locale &&

      (
        count($taxonomyIds) == 0 ||

        (
          $taxonomyMatchLogic == "all" &&
          count(
            taxonomy[
              _ref in $taxonomyIds
            ]
          ) == count($taxonomyIds)
        ) ||

        (
          $taxonomyMatchLogic != "all" &&
          count(
            taxonomy[
              _ref in $taxonomyIds
            ]
          ) > 0
        )
      )
    ]
      | order(${sortExpression})
      [0...$limit]
    {
      _id,
      _type,

      title,

      "summary": coalesce(
        summary,
        excerpt
      ),

      path,

      "slug": slug.current,

      "date": coalesce(
        publishedAt,
        publishDate,
        date,
        _createdAt
      ),

      "thumbnailImage": select(
        defined(mainImage.asset) => {
          "asset": mainImage.asset,
          "crop": mainImage.crop,
          "hotspot": mainImage.hotspot,
          "alt": coalesce(
            mainImage.alt,
            ""
          )
        },

        defined(image.asset) => {
          "asset": image.asset,
          "crop": image.crop,
          "hotspot": image.hotspot,
          "alt": coalesce(
            image.alt,
            ""
          )
        },

        defined(thumbnail.asset) => {
          "asset": thumbnail.asset,
          "crop": thumbnail.crop,
          "hotspot": thumbnail.hotspot,
          "alt": coalesce(
            thumbnail.alt,
            ""
          )
        }
      ),

      taxonomy[]->{
        _id,

        "title": coalesce(
          translations[
            locale == $locale
          ][0].title,
          title
        ),

        "slug": slug.current
      },

      fileType,
      fileSize
    }
  `;
}
