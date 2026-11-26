import type { PortableTextBlock } from "@portabletext/types";
import type { CmsSectionHeading } from "../section-heading";

export type CmsMetricsVariant = "default" | "cards" | "divided";
export type CmsMetricsColumns = 2 | 3 | 4;

export interface CmsMetricItem {
  _key: string;
  _type?: "metricItem";
  value: string;
  prefix?: string;
  suffix?: string;
  label: string;
  description?: PortableTextBlock[];
}

export interface CmsMetricsBlock {
  _key: string;
  _type: "metricsBlock";
  heading?: CmsSectionHeading;
  variant?: CmsMetricsVariant;
  alignment?: "left" | "center" | "right";
  columns?: CmsMetricsColumns;
  metrics?: CmsMetricItem[];
}
