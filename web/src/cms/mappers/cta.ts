import type { ButtonProps } from "mino-ui";
import type { CmsCta } from "@/cms/types";
import { resolveIcon } from "@/cms/resolvers/icon";
import { resolveLink } from "@/cms/resolvers/link";

export async function mapCta(cta: CmsCta): Promise<ButtonProps | null> {
  const resolvedLink = await resolveLink(cta.link);

  if (!resolvedLink) {
    return null;
  }

  const icon = resolveIcon(cta.icon);

  return {
    as: "a",

    label: cta.label,

    href: resolvedLink.href,

    target: resolvedLink.target,

    rel: resolvedLink.rel,

    variant: cta.variant ?? "primary",

    size: cta.size ?? "md",

    inverted: cta.inverted ?? false,

    icon,

    iconAlignment: cta.iconAlignment ?? "right",
  };
}

export async function mapCtas(
  ctas: CmsCta[] | null | undefined,
): Promise<ButtonProps[]> {
  if (!ctas?.length) {
    return [];
  }

  const results = await Promise.all(ctas.map(mapCta));

  return results.filter((cta): cta is ButtonProps => cta !== null);
}
