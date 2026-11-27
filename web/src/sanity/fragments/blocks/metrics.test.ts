import { describe, expect, it } from "vitest";
import { METRICS_BLOCK_FRAGMENT } from "./metrics";
import { SINGLETON_REFERENCE_BLOCK_FRAGMENT } from "./singleton";

it("projects metric items, shared heading and block styling", () => {
  for (const field of [
    "metricsBlock",
    "styles",
    "heading",
    "variant",
    "alignment",
    "columns",
    "metrics[]",
    "value",
    "prefix",
    "suffix",
    "label",
    "description",
  ]) {
    expect(METRICS_BLOCK_FRAGMENT).toContain(field);
  }
});

describe("Metrics fragment inclusion", () => {
  it("is projected through reusable Singletons", () => {
    expect(SINGLETON_REFERENCE_BLOCK_FRAGMENT).toContain(
      METRICS_BLOCK_FRAGMENT.trim(),
    );
  });
});
