import type { MetricsBlockProps } from "mino-ui/blocks/MetricsBlock";
import type { CmsMetricsBlock } from "@/cms/types";
import { CmsRichText } from "@/components/CmsRichText";
import { mapSectionHeading } from "@/cms/mappers/section-heading";

export function mapMetricsBlock(block: CmsMetricsBlock): MetricsBlockProps {
  return {
    ...mapSectionHeading(block.heading),
    variant: block.variant ?? "default",
    alignment: block.alignment ?? "center",
    columns: block.columns ?? 3,
    items: (block.metrics ?? []).map((item) => ({
      id: item._key,
      value: item.value,
      prefix: item.prefix,
      suffix: item.suffix,
      label: item.label,
      description: item.description?.length ? (
        <CmsRichText value={item.description} mode="inline" />
      ) : undefined,
    })),
  };
}
