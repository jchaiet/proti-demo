import { SECTION_HEADING_FRAGMENT } from "../sectionHeading";

export const RICH_TEXT_BLOCK_FRAGMENT = `
  _type == "richTextBlock" => {
    heading {
      ${SECTION_HEADING_FRAGMENT}
    },

    content,
    alignment,
    maxWidth
  }
`;
