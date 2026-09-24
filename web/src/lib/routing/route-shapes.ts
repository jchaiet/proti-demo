export function getAuthorSlug(segments: string[]): string | null {
  if (segments.length !== 2 || segments[0] !== "authors") {
    return null;
  }

  return segments[1] || null;
}

export function getBlogSlug(segments: string[]): string | null {
  if (segments.length !== 2 || segments[0] !== "blog") {
    return null;
  }

  return segments[1] || null;
}

export function getBlogTaxonomySegments(segments: string[]): string[] | null {
  if (segments.length < 3 || segments[0] !== "blog") {
    return null;
  }

  return segments.slice(1);
}

export function isSearchRoute(segments: string[]): boolean {
  return segments.length === 1 && segments[0] === "search";
}

export function isReservedPageRoute(segments: string[]): boolean {
  return Boolean(
    isSearchRoute(segments) ||
    getAuthorSlug(segments) ||
    getBlogSlug(segments) ||
    getBlogTaxonomySegments(segments),
  );
}
