import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  latestProps: null as Record<string, unknown> | null,
  replace: vi.fn(),
  pathname: "/resources",
  searchParams: "",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => mocks.pathname,
  useSearchParams: () => new URLSearchParams(mocks.searchParams),
}));

vi.mock("mino-ui/blocks/DocumentListBlock", () => ({
  DocumentListBlock: (props: Record<string, unknown>) => {
    mocks.latestProps = props;
    return (
      <input
        type="search"
        aria-label="Search documents"
        value={(props.searchQuery as string) ?? ""}
        onChange={(event) =>
          (props.onSearchChange as (value: string) => void)?.(
            event.target.value,
          )
        }
      />
    );
  },
}));

import { DocumentList } from "./DocumentList";

const baseServerState = {
  searchQuery: "",
  selectedFilter: "all" as const,
  selectedTaxonomy: [] as string[],
  selectedSort: "newest",
  currentPage: 1,
  totalPages: 1,
  totalResults: 0,
};

function makeList(serverQuery = "") {
  return (
    <DocumentList
      sourceMode="dynamic"
      props={{ documents: [] }}
      enableSearch
      enableSorting={false}
      enablePagination
      itemsPerPage={12}
      serverState={{ ...baseServerState, searchQuery: serverQuery }}
    />
  );
}

function searchControl() {
  return mocks.latestProps as {
    searchQuery: string;
    onSearchChange: (value: string) => void;
  };
}

describe("server-backed Document List search debouncing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.replace.mockReset();
    mocks.searchParams = "";
    mocks.pathname = "/resources";
    mocks.latestProps = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps every keystroke and searches once, 650ms after the final letter", () => {
    render(makeList());
    const input = screen.getByRole("searchbox") as HTMLInputElement;
    input.focus();

    for (const word of ["F", "Fi", "Fir", "Firs", "First"]) {
      fireEvent.change(input, { target: { value: word } });
      expect(input.value).toBe(word);
      expect(document.activeElement).toBe(input);
      act(() => vi.advanceTimersByTime(200));
      expect(mocks.replace).not.toHaveBeenCalled();
    }

    act(() => vi.advanceTimersByTime(449));
    expect(mocks.replace).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(mocks.replace).toHaveBeenCalledTimes(1);
    expect(mocks.replace).toHaveBeenCalledWith("/resources?q=First", {
      scroll: false,
    });
  });

  it("keeps unfinished typing when an older server response arrives", () => {
    const view = render(makeList());

    act(() => searchControl().onSearchChange("Fi"));
    act(() => vi.advanceTimersByTime(650));
    expect(mocks.replace).toHaveBeenCalledWith("/resources?q=Fi", {
      scroll: false,
    });

    act(() => searchControl().onSearchChange("First"));
    // Simulate the in-flight request for 'Fi' completing after 'First'
    // is already present in the controlled input.
    view.rerender(makeList("Fi"));
    expect(searchControl().searchQuery).toBe("First");

    mocks.searchParams = "q=Fi";
    view.rerender(makeList("Fi"));
    act(() => vi.advanceTimersByTime(650));
    expect(mocks.replace).toHaveBeenLastCalledWith("/resources?q=First", {
      scroll: false,
    });
    expect(searchControl().searchQuery).toBe("First");
  });

  it("clears q after debounce, retains filters and sort, and resets the page", () => {
    mocks.searchParams = "q=First&filter=blog&sort=newest&page=3";
    render(makeList("First"));

    act(() => searchControl().onSearchChange("   "));
    expect(searchControl().searchQuery).toBe("   ");
    act(() => vi.advanceTimersByTime(649));
    expect(mocks.replace).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));

    expect(mocks.replace).toHaveBeenCalledWith(
      "/resources?filter=blog&sort=newest",
      { scroll: false },
    );
  });

  it("does not navigate for an unchanged query after trimming", () => {
    mocks.searchParams = "q=First";
    render(makeList("First"));

    act(() => searchControl().onSearchChange(" First "));
    act(() => vi.advanceTimersByTime(1000));
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("does not search for a partial term if the visitor clears it", () => {
    render(makeList());

    act(() => searchControl().onSearchChange("Fir"));
    act(() => vi.advanceTimersByTime(300));
    act(() => searchControl().onSearchChange(""));
    act(() => vi.advanceTimersByTime(1000));

    expect(searchControl().searchQuery).toBe("");
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("uses the latest URL filters when the delayed search is applied", () => {
    mocks.searchParams = "filter=page&page=2";
    const view = render(makeList());

    act(() => searchControl().onSearchChange("First"));
    mocks.searchParams = "filter=blog&page=2";
    view.rerender(makeList());

    act(() => vi.advanceTimersByTime(650));
    expect(mocks.replace).toHaveBeenCalledWith(
      "/resources?filter=blog&q=First",
      { scroll: false },
    );
  });

  it("syncs genuine external URL changes when not editing", () => {
    const view = render(makeList());
    expect(searchControl().searchQuery).toBe("");

    mocks.searchParams = "q=Back";
    view.rerender(makeList("Back"));
    expect(searchControl().searchQuery).toBe("Back");
  });

  it("accepts later back-button navigation after the search response is applied", () => {
    const view = render(makeList());
    act(() => searchControl().onSearchChange("First"));
    act(() => vi.advanceTimersByTime(650));

    mocks.searchParams = "q=First";
    view.rerender(makeList("First"));
    expect(searchControl().searchQuery).toBe("First");

    mocks.searchParams = "q=Earlier";
    view.rerender(makeList("Earlier"));
    expect(searchControl().searchQuery).toBe("Earlier");
  });

  it("cancels any queued search if the component unmounts", () => {
    const view = render(makeList());
    act(() => searchControl().onSearchChange("First"));
    view.unmount();
    act(() => vi.advanceTimersByTime(1000));
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
