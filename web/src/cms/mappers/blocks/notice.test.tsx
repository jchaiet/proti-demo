import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CmsNoticeBlock } from "@/cms/types";

// Notice -> CTA Group -> CTA -> link resolver -> Sanity client.
// Keep this mapper test offline by mocking CTA mapping at its boundary.
// The real CTA/link behavior is covered by the CTA mapper's own tests.
const { mapCtasMock } = vi.hoisted(() => ({
  mapCtasMock: vi.fn(),
}));

vi.mock("../cta", () => ({
  mapCtas: mapCtasMock,
}));

import { mapNoticeBlock } from "./notice";

function makeNotice(overrides: Partial<CmsNoticeBlock> = {}): CmsNoticeBlock {
  return { _key: "notice-1", _type: "noticeBlock", ...overrides };
}

beforeEach(() => {
  mapCtasMock.mockReset();
  mapCtasMock.mockResolvedValue([]);
});

describe("mapNoticeBlock", () => {
  it("uses accessible neutral defaults without an icon or CTA", async () => {
    const props = await mapNoticeBlock(makeNotice());
    expect(props.variant).toBe("neutral");
    expect(props.alignment).toBe("left");
    expect(props.icon).toBeUndefined();
    expect(props.ctas).toEqual([]);
    expect(props.ctaGroupProps?.alignment).toBe("left");
    expect(mapCtasMock).toHaveBeenCalledWith(undefined);
  });

  it("keeps editor-selected variants, decorative icons, and CTA alignment", async () => {
    const props = await mapNoticeBlock(
      makeNotice({
        variant: "warning",
        alignment: "center",
        icon: "lucide:info",
        ctaGroup: { alignment: "right", stackOnMobile: false, items: [] },
      }),
    );
    expect(props.variant).toBe("warning");
    expect(props.alignment).toBe("center");
    expect(props.icon).toBeTruthy();
    expect(props.ctaGroupProps).toEqual({
      alignment: "right",
      stackOnMobile: false,
    });
    expect(mapCtasMock).toHaveBeenCalledWith([]);
  });
});
