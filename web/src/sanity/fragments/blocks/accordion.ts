import { CTA_FRAGMENT } from "../cta";

import { SECTION_HEADING_FRAGMENT } from "../sectionHeading";

export const ACCORDION_BLOCK_FRAGMENT = `
  _type == "accordionBlock" => {
    heading {
      ${SECTION_HEADING_FRAGMENT}
    },

    layout,
    alignment,
    accordionPosition,

    ctas[] {
      ${CTA_FRAGMENT}
    },

    ctaStackOnMobile,

    items[] {
      _key,
      _type,

      title,
      content,
      defaultOpen
    },

    multiple
  }
`;
