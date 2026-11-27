import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/sanity/client", () => ({ sanityClient: { withConfig: vi.fn() } }));

import { sanityClient } from "@/sanity/client";
import { PUBLISHED_FORM_QUERY, findPublishedForm } from "./published-form";

const withConfig = vi.mocked(sanityClient.withConfig);
const fetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  withConfig.mockReturnValue({ fetch } as unknown as ReturnType<
    typeof sanityClient.withConfig
  >);
});

describe("published form contract for conditional validation", () => {
  it("projects the condition for top-level, stepped and nested Fieldset fields", () => {
    // Each of the three enclosing entry points (Page, Modal, Singleton)
    // expands both ordinary and stepped fields at three nesting levels.
    expect(
      PUBLISHED_FORM_QUERY.match(/visibilityCondition\s*\{/g),
    ).toHaveLength(18);
    expect(PUBLISHED_FORM_QUERY).toContain("sourceField, operator, value");
    expect(PUBLISHED_FORM_QUERY).toContain("steps[]{fields[]");
    expect(PUBLISHED_FORM_QUERY).toContain('"inModal"');
    expect(PUBLISHED_FORM_QUERY).toContain('"inSingleton"');
  });

  it("loads the published schema without CDN or cached draft values", async () => {
    const form = {
      _key: "block-1",
      formMode: "single",
      fields: [
        {
          _type: "formSelectField",
          name: "interest",
          options: [{ value: "nutrition" }],
        },
        {
          _type: "formInputField",
          name: "goal",
          visibilityCondition: {
            sourceField: "interest",
            operator: "equals",
            value: "nutrition",
          },
        },
      ],
    };
    fetch.mockResolvedValue([{ onPage: [form], inModal: [], inSingleton: [] }]);
    const params = {
      formKey: "test",
      blockKey: "block-1",
      locale: "us-en",
      siteId: "site",
    };
    expect(await findPublishedForm(params)).toEqual(form);
    expect(withConfig).toHaveBeenCalledWith({
      perspective: "published",
      useCdn: false,
    });
    expect(fetch).toHaveBeenCalledWith(PUBLISHED_FORM_QUERY, params, {
      next: { revalidate: 0 },
    });
  });

  it("rejects ambiguous matching blocks rather than guessing a form schema", async () => {
    fetch.mockResolvedValue([
      { onPage: [{ _key: "a" }], inModal: [{ _key: "a" }] },
    ]);
    expect(
      await findPublishedForm({
        formKey: "x",
        blockKey: "a",
        locale: "us-en",
        siteId: "site",
      }),
    ).toBeNull();
  });
});
