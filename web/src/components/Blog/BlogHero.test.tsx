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
        localePrefix="/us-es"
        taxonomy={[createTaxonomyTerm("Nutrición", "nutricion")]}
      />,
    );

    const props = mocks.heroProps as {
      categories: Array<Record<string, unknown>>;
    };

    expect(props.categories[0]).toMatchObject({
      label: "Nutrición",
      href: "/us-es/search?q=nutrici%C3%B3n",
    });
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
