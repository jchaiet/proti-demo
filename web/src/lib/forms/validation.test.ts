import { describe, expect, it } from "vitest";
import {
  validateFormValues,
  hasActiveFileUploads,
  type PublishedFormDefinition,
} from "./validation";

const form: PublishedFormDefinition = {
  _key: "form-block-1",
  fields: [
    { _type: "formInputField", name: "email", type: "email", required: true },
    { _type: "formTextareaField", name: "message", maxLength: 30 },
    {
      _type: "formSelectField",
      name: "topics",
      multiple: true,
      options: [
        { value: "support" },
        { value: "billing" },
        { value: "admin", disabled: true },
      ],
    },
    { _type: "formHiddenField", name: "source", value: "contact" },
    {
      _type: "formFieldset",
      name: "details",
      fields: [
        {
          _type: "formInputField",
          name: "age",
          type: "number",
          min: 18,
          max: 110,
        },
      ],
    },
    {
      _type: "formInputField",
      name: "disabled",
      required: true,
      disabled: true,
    },
  ],
};

const valid = {
  email: "user@example.com",
  message: "Please get in touch",
  topics: ["support", "billing"],
  source: "contact",
  age: "30",
};

describe("published CMS form validation", () => {
  it("accepts the authorized fields including multi-select and nested fieldsets", () => {
    expect(validateFormValues(form, valid)).toEqual({
      ok: true,
      values: valid,
    });
  });

  it("rejects fields not present in the published schema", () => {
    expect(validateFormValues(form, { ...valid, isAdmin: "true" }).ok).toBe(
      false,
    );
  });

  it("accepts blank optional inputs without rejecting their type constraints", () => {
    expect(
      validateFormValues(
        {
          _key: "optional",
          fields: [
            { _type: "formInputField", name: "website", type: "url" },
            { _type: "formDatePickerField", name: "date" },
            {
              _type: "formSelectField",
              name: "topic",
              options: [{ value: "one" }],
            },
          ],
        },
        { website: "", date: "", topic: "" },
      ).ok,
    ).toBe(true);
  });

  it("rejects missing required values and malformed email", () => {
    expect(validateFormValues(form, { ...valid, email: "" }).ok).toBe(false);
    expect(validateFormValues(form, { ...valid, email: "not-email" }).ok).toBe(
      false,
    );
  });

  it("rejects tampered hidden values, invalid select options, duplicate single values", () => {
    expect(validateFormValues(form, { ...valid, source: "admin" }).ok).toBe(
      false,
    );
    expect(validateFormValues(form, { ...valid, topics: ["admin"] }).ok).toBe(
      false,
    );
    expect(validateFormValues(form, { ...valid, age: ["20", "30"] }).ok).toBe(
      false,
    );
  });

  it("checks length and numeric limits", () => {
    expect(
      validateFormValues(form, { ...valid, message: "a".repeat(31) }).ok,
    ).toBe(false);
    expect(validateFormValues(form, { ...valid, age: "17" }).ok).toBe(false);
  });

  it("handles stepped forms without trusting the browser's supplied schema", () => {
    const stepped: PublishedFormDefinition = {
      _key: "stepped",
      formMode: "stepped",
      steps: [
        {
          fields: [{ _type: "formInputField", name: "first", required: true }],
        },
        { fields: [{ _type: "formInputField", name: "last", required: true }] },
      ],
    };
    expect(
      validateFormValues(stepped, { first: "Pat", last: "Smith" }).ok,
    ).toBe(true);
    expect(validateFormValues(stepped, { first: "Pat" }).ok).toBe(false);
  });

  it("rejects file uploads until a provider-specific file adapter is implemented", () => {
    expect(
      validateFormValues(
        {
          _key: "a",
          fields: [{ _type: "formFileUploadField", name: "attachment" }],
        },
        { attachment: "fake-file" },
      ).ok,
    ).toBe(false);
  });

  it("rejects duplicate names from CMS corruption", () => {
    expect(
      validateFormValues(
        {
          _key: "a",
          fields: [
            { _type: "formInputField", name: "x" },
            { _type: "formInputField", name: "x" },
          ],
        },
        { x: "value" },
      ).ok,
    ).toBe(false);
  });
});

describe("legacy upload fail-closed behavior", () => {
  const email = { _type: "formInputField", name: "email", required: true };
  const upload = {
    _type: "formFileUploadField",
    name: "resume",
    required: false,
  };

  it("rejects optional uploads even if the visitor sends no file value", () => {
    expect(
      validateFormValues(
        { _key: "legacy", fields: [email, upload] },
        { email: "person@example.com" },
      ),
    ).toEqual({
      ok: false,
      code: "unsupported_file_upload",
      error:
        "This form is unavailable because file attachments are not supported.",
    });
  });

  it("rejects uploads inside enabled fieldsets and stepped forms", () => {
    const nested = { _type: "formFieldset", fields: [upload] };
    expect(hasActiveFileUploads([nested])).toBe(true);
    expect(
      validateFormValues(
        { _key: "nested", fields: [email, nested] },
        { email: "a" },
      ).ok,
    ).toBe(false);
    expect(
      validateFormValues(
        {
          _key: "steps",
          formMode: "stepped",
          steps: [{ fields: [email] }, { fields: [upload] }],
        },
        { email: "a" },
      ).ok,
    ).toBe(false);
  });

  it("preserves normal submissions when legacy uploads are disabled", () => {
    expect(
      validateFormValues(
        {
          _key: "legacy-disabled",
          fields: [email, { ...upload, disabled: true }],
        },
        { email: "person@example.com" },
      ),
    ).toEqual({ ok: true, values: { email: "person@example.com" } });
    expect(
      hasActiveFileUploads([
        { _type: "formFieldset", disabled: true, fields: [upload] },
      ]),
    ).toBe(false);
  });
});
