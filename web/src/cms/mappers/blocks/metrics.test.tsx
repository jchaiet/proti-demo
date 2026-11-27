import { describe, expect, it } from "vitest";
import { mapMetricsBlock } from "./metrics";
import type { CmsMetricsBlock } from "@/cms/types";

const metric = {
  _key: "metric-a",
  value: "95",
  suffix: "%",
  label: "Patient satisfaction",
};

describe("mapMetricsBlock", () => {
  it("maps editor data into static Mino metrics with stable keys", () => {
    const block: CmsMetricsBlock = {
      _type: "metricsBlock",
      _key: "metrics-a",
      variant: "cards",
      alignment: "left",
      columns: 4,
      metrics: [
        metric,
        { _key: "metric-b", value: "24/7", label: "Access to care" },
      ],
    };
    const mapped = mapMetricsBlock(block);
    expect(mapped.variant).toBe("cards");
    expect(mapped.columns).toBe(4);
    expect(mapped.alignment).toBe("left");
    expect(mapped.items).toEqual([
      {
        id: "metric-a",
        value: "95",
        suffix: "%",
        label: "Patient satisfaction",
        prefix: undefined,
        description: undefined,
      },
      {
        id: "metric-b",
        value: "24/7",
        label: "Access to care",
        prefix: undefined,
        suffix: undefined,
        description: undefined,
      },
    ]);
  });

  it("provides safe defaults for optional fields and an empty list", () => {
    const mapped = mapMetricsBlock({ _type: "metricsBlock", _key: "empty" });
    expect(mapped.variant).toBe("default");
    expect(mapped.columns).toBe(3);
    expect(mapped.alignment).toBe("center");
    expect(mapped.items).toEqual([]);
  });
});
