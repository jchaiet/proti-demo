import type { CmsIcon } from "./icon";
import type { CmsLink } from "./link";

export interface CmsCta {
  _key?: string;

  label: string;
  link: CmsLink;

  variant?: "primary" | "secondary" | "link" | "glass";

  size?: "sm" | "md" | "lg";

  inverted?: boolean;

  icon?: CmsIcon;

  iconAlignment?: "left" | "right";
}
