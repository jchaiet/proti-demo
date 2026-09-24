import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const navigation = vi.hoisted(() => ({
  pathname: "/",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

import { HtmlLanguageSync } from "./HtmlLanguageSync";

const locales = ["us-en", "us-es", "ca-fr"];

beforeEach(() => {
  navigation.pathname = "/";
  document.documentElement.lang = "";
});

describe("HtmlLanguageSync", () => {
  it("sets the default locale language tag on an unprefixed route", () => {
    render(<HtmlLanguageSync defaultLocale="us-en" locales={locales} />);

    expect(document.documentElement.lang).toBe("en-US");
  });

  it("sets the localized language tag on a prefixed route", () => {
    navigation.pathname = "/us-es/products/widget";

    render(<HtmlLanguageSync defaultLocale="us-en" locales={locales} />);

    expect(document.documentElement.lang).toBe("es-US");
  });

  it("updates the html language after client-side locale navigation", () => {
    const { rerender } = render(
      <HtmlLanguageSync defaultLocale="us-en" locales={locales} />,
    );

    expect(document.documentElement.lang).toBe("en-US");

    navigation.pathname = "/ca-fr/blog/example";

    rerender(<HtmlLanguageSync defaultLocale="us-en" locales={locales} />);

    expect(document.documentElement.lang).toBe("fr-CA");
  });
});
