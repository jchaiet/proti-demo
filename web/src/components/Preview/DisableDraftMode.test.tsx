import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isPresentationTool: false,
}));

vi.mock("next-sanity/hooks", () => ({
  useIsPresentationTool: () => mocks.isPresentationTool,
}));

import { DisableDraftMode } from "./DisableDraftMode";

beforeEach(() => {
  mocks.isPresentationTool = false;
});

describe("DisableDraftMode", () => {
  it("renders an explicit link to the draft-mode disable endpoint", () => {
    render(<DisableDraftMode />);

    const link = screen.getByRole("link", {
      name: "Exit preview",
    });

    expect(link.getAttribute("href")).toBe("/api/draft-mode/disable");
  });

  it("stays hidden inside Presentation Tool", () => {
    mocks.isPresentationTool = true;

    render(<DisableDraftMode />);

    expect(
      screen.queryByRole("link", {
        name: "Exit preview",
      }),
    ).toBeNull();
  });
});
