import { BLOCK_STYLES_FRAGMENT } from "../blockStyles";
import { SECTION_HEADING_FRAGMENT } from "../sectionHeading";

export const METRICS_BLOCK_FRAGMENT = `
  _type == "metricsBlock" => {
    styles { ${BLOCK_STYLES_FRAGMENT} },
    heading { ${SECTION_HEADING_FRAGMENT} },
    variant,
    alignment,
    columns,
    metrics[]{
      _key,
      _type,
      value,
      prefix,
      suffix,
      label,
      description
    }
  }
`;
