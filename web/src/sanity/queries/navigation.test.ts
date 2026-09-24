import { describe, expect, it } from "vitest";

import { NAVIGATION_SET_QUERY } from "./navigation";

describe("NAVIGATION_SET_QUERY", () => {
  it("uses an explicit custom Navigation Set before any inherited default", () => {
    expect(NAVIGATION_SET_QUERY).toContain(
      "defined($navigationSetId) => $navigationSetId",
    );
  });

  it("resolves inherited Navigation from Site.defaultNavigationSets", () => {
    expect(NAVIGATION_SET_QUERY).toContain('_type == "site"');
    expect(NAVIGATION_SET_QUERY).toContain("defaultNavigationSets[]._ref");
    expect(NAVIGATION_SET_QUERY).toContain("site._ref == $siteId");
    expect(NAVIGATION_SET_QUERY).toContain("locale == $locale");
  });

  it("does not fall back to the legacy Navigation Set isDefault flag", () => {
    expect(NAVIGATION_SET_QUERY).not.toContain("isDefault");
  });
});
