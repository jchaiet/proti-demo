import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { FormEvent } from "react";
import { Form } from "./Form";

vi.mock("@/cms/resolvers/icon", () => ({ resolveIcon: () => undefined }));
vi.mock("mino-ui/blocks/FormBlock", () => ({
  FormBlock: ({
    onSubmit,
  }: {
    onSubmit: (
      values: Record<string, string>,
      event: FormEvent<HTMLFormElement>,
    ) => Promise<void>;
  }) => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit({}, event);
      }}
    >
      <input name="email" defaultValue="test@example.com" />
      <button type="submit">Submit</button>
    </form>
  ),
}));

beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const props = {
  formKey: "contact",
  blockKey: "block-1",
  siteId: "site-1",
  locale: "en-us",
};

describe("CMS Form renderer", () => {
  it("sends the Site, locale and form block ID, and announces successful submission", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<Form {...props} />);
    fireEvent.submit(
      screen.getByRole("button", { name: "Submit" }).closest("form")!,
    );
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(/successfully/i),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toEqual({ ...props, fields: { email: "test@example.com" } });
  });

  it("announces delivery errors without leaking server details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 502 }),
    );
    render(<Form {...props} />);
    fireEvent.submit(
      screen.getByRole("button", { name: "Submit" }).closest("form")!,
    );
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toMatch(/couldn't submit/i),
    );
  });
});
