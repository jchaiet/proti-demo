import { SECTION_HEADING_FRAGMENT } from "../sectionHeading";

export const POLL_BLOCK_FRAGMENT = `
  _type == "pollBlock" => {
    heading {
      ${SECTION_HEADING_FRAGMENT}
    },

    pollKey,

    options[] {
      _key,
      id,
      label
    },

    layout,
    alignment,

    showResultsOnSubmit,
    resultsType,
    singleResultOptionId,
    singleResultMessage,

    thankYouMessage,
    errorMessage,

    showResultsOnSubmit,

    thankYouMessage,
    errorMessage
  }
`;
