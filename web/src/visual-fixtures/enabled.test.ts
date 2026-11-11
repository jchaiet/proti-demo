import { afterEach, describe, expect, it, vi } from "vitest";

import { visualFixturesEnabled } from "./enabled";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("visual fixture access", () => {
  it("is disabled by default", () => {
    vi.stubEnv("PROTI_VISUAL_FIXTURES", undefined);
    expect(visualFixturesEnabled()).toBe(false);
  });

  it("requires exactly the value 1", () => {
    vi.stubEnv("PROTI_VISUAL_FIXTURES", "0");
    expect(visualFixturesEnabled()).toBe(false);

    vi.stubEnv("PROTI_VISUAL_FIXTURES", "true");
    expect(visualFixturesEnabled()).toBe(false);

    vi.stubEnv("PROTI_VISUAL_FIXTURES", "1");
    expect(visualFixturesEnabled()).toBe(true);
  });
});
