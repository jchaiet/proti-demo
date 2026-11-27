import type { NoticeBlockProps } from "mino-ui/blocks/NoticeBlock";
import type { CmsNoticeBlock } from "@/cms/types";
import { mapCtaGroup } from "@/cms/mappers/cta-group";
import { mapSectionHeading } from "@/cms/mappers/section-heading";
import { resolveIcon } from "@/cms/resolvers/icon";

export async function mapNoticeBlock(
  block: CmsNoticeBlock,
): Promise<NoticeBlockProps> {
  const alignment = block.alignment ?? "left";
  const ctaGroup = await mapCtaGroup(block.ctaGroup, {
    fallbackAlignment: alignment,
  });

  return {
    ...mapSectionHeading(block.heading),
    variant: block.variant ?? "neutral",
    alignment,
    icon: resolveIcon(block.icon),
    ctas: ctaGroup.ctas,
    ctaGroupProps: ctaGroup.ctaGroupProps,
  };
}
