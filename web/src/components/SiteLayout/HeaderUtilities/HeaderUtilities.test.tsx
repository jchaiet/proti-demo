import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const navigation = vi.hoisted(() => ({
  pathname: "/products/widget",
  queryString: "",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.queryString),
}));

import { HeaderUtilities } from "./HeaderUtilities";

const locales = [
  {
    code: "us-en",
    label: "English",
  },
  {
    code: "us-es",
    label: "Spanish",
  },
];

beforeEach(() => {
  navigation.pathname = "/products/widget";
  navigation.queryString = "";
});

describe("HeaderUtilities language selector", () => {
  it("shows the currently-selected language code", () => {
    render(
      <HeaderUtilities
        locale="us-en"
        defaultLocale="us-en"
        locales={locales}
        localeHrefs={{
          "us-en": "/products/widget",
          "us-es": "/us-es/products/widget",
        }}
        localeHomeHrefs={{
          "us-en": "/",
          "us-es": "/us-es",
        }}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: /current language: en/i,
      }),
    ).toBeTruthy();
  });

  it("uses an exact translated equivalent when one exists", () => {
    render(
      <HeaderUtilities
        locale="us-en"
        defaultLocale="us-en"
        locales={locales}
        localeHrefs={{
          "us-en": "/products/widget",
          "us-es": "/us-es/products/widget",
        }}
        localeHomeHrefs={{
          "us-en": "/",
          "us-es": "/us-es",
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /current language: en/i,
      }),
    );

    expect(
      screen
        .getByRole("menuitem", {
          name: "ES",
        })
        .getAttribute("href"),
    ).toBe("/us-es/products/widget");
  });

  it("falls back to the target locale Homepage when the exact translation is missing", () => {
    render(
      <HeaderUtilities
        locale="us-en"
        defaultLocale="us-en"
        locales={locales}
        localeHrefs={{
          "us-en": "/products/widget",
        }}
        localeHomeHrefs={{
          "us-en": "/",
          "us-es": "/us-es",
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /current language: en/i,
      }),
    );

    expect(
      screen
        .getByRole("menuitem", {
          name: "ES",
        })
        .getAttribute("href"),
    ).toBe("/us-es");
  });

  it("hides the language selector when no alternate translation or Homepage exists", () => {
    render(
      <HeaderUtilities
        locale="us-en"
        defaultLocale="us-en"
        locales={locales}
        localeHrefs={{
          "us-en": "/products/widget",
        }}
        localeHomeHrefs={{
          "us-en": "/",
        }}
      />,
    );

    expect(
      screen.queryByRole("button", {
        name: /current language/i,
      }),
    ).toBeNull();
  });

  it("preserves the current query string when switching locales", () => {
    navigation.queryString = "q=nutrition&page=2";

    render(
      <HeaderUtilities
        locale="us-en"
        defaultLocale="us-en"
        locales={locales}
        localeHrefs={{
          "us-en": "/products/widget",
        }}
        localeHomeHrefs={{
          "us-en": "/",
          "us-es": "/us-es",
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /current language: en/i,
      }),
    );

    expect(
      screen
        .getByRole("menuitem", {
          name: "ES",
        })
        .getAttribute("href"),
    ).toBe("/us-es?q=nutrition&page=2");
  });

  it("uses an exact generated Author locale route when provided", () => {
    navigation.pathname = "/authors/jane-smith";

    render(
      <HeaderUtilities
        locale="us-en"
        defaultLocale="us-en"
        locales={locales}
        localeHrefs={{
          "us-en": "/authors/jane-smith",
          "us-es": "/us-es/authors/jane-smith",
        }}
        localeHomeHrefs={{
          "us-en": "/",
          "us-es": "/us-es",
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /current language: en/i,
      }),
    );

    expect(
      screen
        .getByRole("menuitem", {
          name: "ES",
        })
        .getAttribute("href"),
    ).toBe("/us-es/authors/jane-smith");
  });

  it("uses an exact generated Taxonomy locale route when provided", () => {
    navigation.pathname = "/blog/topics/nutrition";

    render(
      <HeaderUtilities
        locale="us-en"
        defaultLocale="us-en"
        locales={locales}
        localeHrefs={{
          "us-en": "/blog/topics/nutrition",
          "us-es": "/us-es/blog/topics/nutrition",
        }}
        localeHomeHrefs={{
          "us-en": "/",
          "us-es": "/us-es",
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /current language: en/i,
      }),
    );

    expect(
      screen
        .getByRole("menuitem", {
          name: "ES",
        })
        .getAttribute("href"),
    ).toBe("/us-es/blog/topics/nutrition");
  });

  it("shows ES as selected when the active locale is Spanish", () => {
    navigation.pathname = "/us-es/products/widget";

    render(
      <HeaderUtilities
        locale="us-es"
        defaultLocale="us-en"
        locales={locales}
        localeHrefs={{
          "us-en": "/products/widget",
          "us-es": "/us-es/products/widget",
        }}
        localeHomeHrefs={{
          "us-en": "/",
          "us-es": "/us-es",
        }}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: /current language: es/i,
      }),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: /current language: es/i,
      }),
    );

    expect(
      screen
        .getByRole("menuitem", {
          name: "EN",
        })
        .getAttribute("href"),
    ).toBe("/products/widget");
  });
});
