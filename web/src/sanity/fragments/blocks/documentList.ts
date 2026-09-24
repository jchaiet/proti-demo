import {
  ARTICLE_CARD_FRAGMENT,
  RESOURCE_CARD_FRAGMENT,
  TESTIMONIAL_CARD_FRAGMENT,
} from "../cards";

import { SECTION_HEADING_FRAGMENT } from "../sectionHeading";

export const DOCUMENT_LIST_BLOCK_FRAGMENT = `
  _type == "documentListBlock" => {
    heading {
      ${SECTION_HEADING_FRAGMENT}
    },

    sourceMode,

    documents[] {
      _key,
      _type,

      _type == "resourceCard" => {
        ${RESOURCE_CARD_FRAGMENT}
      },

      _type == "articleCard" => {
        ${ARTICLE_CARD_FRAGMENT}
      },

      _type == "testimonialCard" => {
        ${TESTIMONIAL_CARD_FRAGMENT}
      }
    },

    dynamicContentTypes,

    "dynamicTaxonomy": dynamicTaxonomy[] {
      _key,
      _type,
      _ref,

      "_id": @->_id,

      "title": @->title,

      "slug": @->slug.current
    },

    dynamicTaxonomyMatchLogic,

    dynamicSort,
    dynamicLimit,

    alignment,
    gridCols,

    enableSearch,
    searchPlaceholder,

    enableFilters,
    filterTitle,
    filterLogic,

    filterOptions[] {
      _key,
      label,
      value
    },

    enableSorting,

    sortOptions[] {
      _key,
      label,
      value
    },

    enablePagination,
    itemsPerPage,

    emptyStateText
  }
`;
