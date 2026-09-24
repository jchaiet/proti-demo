import { CTA_FRAGMENT } from "../cta";

import { IMAGE_FRAGMENT } from "../image";

import { SECTION_HEADING_FRAGMENT } from "../sectionHeading";

export const CONTENT_BLOCK_FRAGMENT = `
  _type == "contentBlock" => {
    heading {
      ${SECTION_HEADING_FRAGMENT}
    },

    headingLevel,
    headingSize,

    layout,
    alignment,
    vAlignment,

    mediaType,

    image {
      ${IMAGE_FRAGMENT}
    },

    imageShape,
    imageSize,

    videoUrl,

    defaultMediaPosition,
    splitMediaPosition,

    ctas[] {
      ${CTA_FRAGMENT}
    },

    ctaStackOnMobile
  }
`;
