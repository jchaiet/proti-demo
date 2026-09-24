import { CTA_FRAGMENT } from "../cta";
import { IMAGE_FRAGMENT } from "../image";
import { SECTION_HEADING_FRAGMENT } from "../sectionHeading";

export const HERO_BLOCK_FRAGMENT = `
  _type == "heroBlock" => {
    heading {
      ${SECTION_HEADING_FRAGMENT}
    },

    layout,
    hAlignment,
    vAlignment,

    mediaType,

    image {
      ${IMAGE_FRAGMENT}
    },

    videoUrl,

    defaultMediaPosition,
    splitMediaPosition,

    ctas[] {
      ${CTA_FRAGMENT}
    },

    ctaStackOnMobile
  }
`;
