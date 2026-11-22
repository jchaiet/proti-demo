# Proti v0.7.0 — File Upload authoring safeguards

## Support status

The default Proti Forms submission endpoint accepts JSON field values and forwards
validated data to a server-configured webhook. **It does not upload or store files.**
Mino UI includes a reusable FileUpload control, but this alone does not make
uploads available in Proti. A future integration must supply private storage,
authorization, file-type and size checks, malware handling, retention/deletion,
and a submission contract before uploads are enabled.

## Sanity Studio

- **File Upload (Unavailable)** remains registered in the Single Page, Step,
  and Fieldset field menus **only to keep previously authored array members
  recognized by Sanity**. Sanity does not support a native `hidden` setting on
  individual array members without custom authoring UI. Do not add it to new
  forms.
- New File Upload entries are **Disabled** initially. Other settings are
  read-only, preventing editors from configuring a control that cannot work.
- Existing authored values are _not migrated or deleted_. Editors can check
  **Disabled**, or remove a legacy entry when appropriate.
- Studio whole-form validation rejects an **active** File Upload, even when
  optional or nested in a Fieldset or Step. Disabling an enclosing Fieldset
  also deactivates its File Upload descendants.

## Public website and API

- Published forms containing an **active** legacy File Upload show an
  accessible "form unavailable" explanation instead of inviting submission.
- Disabled legacy uploads are omitted from the rendered form. Other supported
  fields keep working as normal.
- The API independently resolves the published CMS form and refuses active
  uploads with **HTTP 503**, a safe error message, and the privacy-safe
  `attachment_unsupported` diagnostic event. It never forwards their field
  values to the webhook.
- Multipart upload support has **not** been introduced. No upload bytes or
  file data are stored or forwarded.

## Testing

In Studio:

```bash
pnpm test
pnpm build
```

In Web:

```bash
pnpm exec vitest run \
  src/lib/forms/validation.test.ts \
  src/app/api/forms/submit/route.test.ts \
  src/cms/mappers/blocks/form.upload.test.tsx \
  src/components/BlockRenderer/Form.test.tsx
pnpm build
```

Then run `pnpm verify:all` from the repo root and manually inspect a form
with an old active upload, a disabled upload beside a normal input, and a
nested upload in a stepped form. This batch makes **no Mino UI changes**.

## Future integration

Before enabling File Upload authoring, implement a provider-backed adapter and
add end-to-end tests for uploads, including authorization, size/type limits,
expiry, accessibility, and delivery of safe file references. Simply adding a
Studio environment flag must **not** enable the unsupported UI.
