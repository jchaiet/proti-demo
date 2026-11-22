import { describe, expect, it, vi } from "vitest";
import type { CmsFormBlock } from "@/cms/types";

vi.mock("@/cms/mappers/section-heading", () => ({
  mapSectionHeading: () => ({}),
}));
vi.mock("@/cms/resolvers/image", () => ({
  resolveSanityImage: () => undefined,
  resolveSanityImageSrcSet: () => undefined,
  resolveSanityImageDimensions: () => undefined,
}));
vi.mock("@/components/CmsRichText", () => ({ CmsRichText: () => null }));

import { mapFormBlock } from "./form";
const cms = (body: Record<string, unknown>) =>
  ({
    _key: "form-1",
    _type: "formBlock" as const,
    ...body,
  }) as CmsFormBlock;

const email = { _key: "email", _type: "formInputField", name: "email" };
const upload = {
  _key: "attachment",
  _type: "formFileUploadField",
  name: "attachment",
};

describe("Form Block legacy File Upload mapping", () => {
  it("flags active uploads in flat and stepped forms", () => {
    const flat = mapFormBlock(cms({ fields: [email, upload] }));
    expect(flat.hasUnsupportedFileUpload).toBe(true);
    const stepped = mapFormBlock(
      cms({
        formMode: "stepped",
        steps: [
          { _key: "one", fields: [email] },
          {
            _key: "two",
            fields: [
              {
                _key: "fieldset",
                _type: "formFieldset",
                name: "files",
                fields: [upload],
              },
            ],
          },
        ],
      }),
    );
    expect(stepped.hasUnsupportedFileUpload).toBe(true);
  });

  it("omits disabled legacy uploads from the rendered form without changing authored CMS fields", () => {
    const fields = [email, { ...upload, disabled: true }];
    const mapped = mapFormBlock(cms({ fields }));
    expect(mapped.hasUnsupportedFileUpload).toBe(false);
    expect(mapped.fields?.map((field) => field.name)).toEqual(["email"]);
    expect(fields[1]).toHaveProperty("disabled", true);
  });
});
