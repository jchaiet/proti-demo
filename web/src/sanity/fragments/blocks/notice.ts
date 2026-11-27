import { BLOCK_STYLES_FRAGMENT } from "../blockStyles";
import { CTA_GROUP_FRAGMENT } from "../ctaGroup";
import { SECTION_HEADING_FRAGMENT } from "../sectionHeading";

export const NOTICE_BLOCK_FRAGMENT = `
  _type == "noticeBlock" => {
    styles { ${BLOCK_STYLES_FRAGMENT} },
    heading { ${SECTION_HEADING_FRAGMENT} },
    variant,
    alignment,
    icon,
    ctaGroup { ${CTA_GROUP_FRAGMENT} }
  }
`;
