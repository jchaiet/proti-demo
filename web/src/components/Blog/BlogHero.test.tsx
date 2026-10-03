import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import type { CmsTaxonomyTerm } from "@/cms/types";

const mocks = vi.hoisted(() => ({
  heroProps: null as Record<string, unknown> | null,
}));

vi.mock("mino-ui/blocks/HeroBlock", () => ({
  HeroBlock: (props: Record<string, unknown>) => {
    mocks.heroProps = props;

    return <div data-testid="hero" />;
  },
}));

import { BlogHero } from "./BlogHero";

function createTaxonomyTerm(title: string, slug: string): CmsTaxonomyTerm {
  return {
    _id: `taxonomy-${slug}`,
    _type: "taxonomy",
    title,
    slug,
  };
}

beforeEach(() => {
  mocks.heroProps = null;
});

describe("BlogHero taxonomy Search links", () => {
  it("renders the Blog title as the page h1", () => {
    render(<BlogHero title="Nutrition article" />);

    const props = mocks.heroProps as {
      headingProps?: {
        level?: number;
      };
    };

    expect(props.headingProps).toMatchObject({
      level: 1,
    });
  });

  it("does not show the Summary in the article hero by default", () => {
    render(<BlogHero title="Nutrition article" summary="Article summary" />);

    const props = mocks.heroProps as {
      description?: string;
    };

    expect(props.description).toBeUndefined();
  });

  it("shows the Summary when article display is explicitly enabled", () => {
    render(
      <BlogHero
        title="Nutrition article"
        summary="Article summary"
        showSummary
      />,
    );

    const props = mocks.heroProps as {
      description?: string;
    };

    expect(props.description).toBe("Article summary");
  });

  it("links a default-locale taxonomy chip to /search?q=<term>", () => {
    render(
      <BlogHero
        title="Nutrition article"
        taxonomy={[createTaxonomyTerm("Nutrition", "nutrition")]}
      />,
    );

    const props = mocks.heroProps as {
      categories: Array<Record<string, unknown>>;
    };

    expect(props.categories).toEqual([
      {
        id: "taxonomy-nutrition",
        label: "Nutrition",
        href: "/search?q=nutrition",
      },
    ]);
  });

  it("preserves the locale prefix for localized Blog Search links", () => {
    render(
      <BlogHero
        title="Nutrición"
        localePrefix="/es-us"
        taxonomy={[createTaxonomyTerm("Nutrición", "nutricion")]}
      />,
    );

    const props = mocks.heroProps as {
      categories: Array<Record<string, unknown>>;
    };

    expect(props.categories[0]).toMatchObject({
      label: "Nutrición",
      href: "/es-us/search?q=nutrici%C3%B3n",
    });
  });

  it("renders without taxonomy when Sanity returns null for an unset array", () => {
    render(<BlogHero title="Article without tags" taxonomy={null} />);

    const props = mocks.heroProps as {
      categories: Array<Record<string, unknown>>;
    };

    expect(props.categories).toEqual([]);
  });

  it("normalizes and URL-encodes multi-word taxonomy terms", () => {
    render(
      <BlogHero
        title="Heart health"
        taxonomy={[createTaxonomyTerm("Heart Health", "heart-health")]}
      />,
    );

    const props = mocks.heroProps as {
      categories: Array<Record<string, unknown>>;
    };

    expect(props.categories[0]).toMatchObject({
      href: "/search?q=heart%20health",
    });
  });
});
