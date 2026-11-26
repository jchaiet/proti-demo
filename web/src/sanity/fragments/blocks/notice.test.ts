import { describe, expect, it } from "vitest";
import { NOTICE_BLOCK_FRAGMENT } from "./notice";
import { SINGLETON_REFERENCE_BLOCK_FRAGMENT } from "./singleton";

describe("Notice block GROQ contract", () => {
  it("projects shared heading, CTAs, icons, and block styles", () => {
    for (const field of [
      "noticeBlock",
      "heading",
      "ctaGroup",
      "variant",
      "alignment",
      "icon",
      "styles",
    ]) {
      expect(NOTICE_BLOCK_FRAGMENT).toContain(field);
    }
  });

  it("supports notices inside singleton references", () => {
    expect(SINGLETON_REFERENCE_BLOCK_FRAGMENT).toContain(
      NOTICE_BLOCK_FRAGMENT.trim(),
    );
  });
});
