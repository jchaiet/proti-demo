import { CTA_FRAGMENT } from "../cta";

import { IMAGE_FRAGMENT } from "../image";

import { SECTION_HEADING_FRAGMENT } from "../sectionHeading";

export const TABS_BLOCK_FRAGMENT = `
  _type == "tabsBlock" => {
    heading {
      ${SECTION_HEADING_FRAGMENT}
    },

    alignment,

    items[] {
      _key,
      _type,

      label,
      badge,
      defaultActive,

      content,

      mediaType,

      image {
        ${IMAGE_FRAGMENT}
      },

      videoUrl,

      ctas[] {
        ${CTA_FRAGMENT}
      },

      ctaStackOnMobile
    }
  }
`;
