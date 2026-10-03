import type { CmsHeroBlock } from "@/cms/types";
import { mapCtaGroup } from "../cta-group";
import { resolveSanityImage } from "../../resolvers/image";
import type { HeroProps } from "mino-ui/blocks/HeroBlock";
import { mapSectionHeading } from "../section-heading";

function resolveMediaPosition(block: CmsHeroBlock): HeroProps["mediaPosition"] {
  const layout = block.layout ?? "default";

  if (layout === "default") {
    return block.defaultMediaPosition ?? "below";
  }

  if (layout === "split" || layout === "split-35-65") {
    return block.splitMediaPosition ?? "right";
  }

  return undefined;
}

export async function mapHeroBlock(block: CmsHeroBlock): Promise<HeroProps> {
  const ctaGroup = await mapCtaGroup(block.ctaGroup, {
    legacyItems: block.ctas,
    legacyAlignment: block.ctaAlignment,
    legacyStackOnMobile: block.ctaStackOnMobile,
    fallbackAlignment: block.hAlignment ?? "left",
  });

  const imageSrc =
    block.mediaType === "image" ? resolveSanityImage(block.image) : undefined;

  const videoSrc = block.mediaType === "video" ? block.videoUrl : undefined;

  const heading = mapSectionHeading(block.heading);

  return {
    ...heading,

    title: heading.title ?? "",

    layout: block.layout ?? "default",

    hAlignment: block.hAlignment ?? "left",

    vAlignment: block.vAlignment ?? "center",

    mediaPosition: resolveMediaPosition(block),

    imageSrc,

    imageAlt: block.image?.alt ?? "",

    videoSrc,

    ctas: ctaGroup.ctas,

    ctaGroupProps: ctaGroup.ctaGroupProps,
  };
}
