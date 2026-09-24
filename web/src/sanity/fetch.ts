import { sanityClient } from "@/sanity/client";

export interface SanityFetchOptions {
  /**
   * Encode visible CMS strings with Content Source Map metadata while Draft
   * Mode is active so <VisualEditing /> can provide click-to-edit overlays.
   */
  visualEditing?: boolean;

  /**
   * Force a perspective for infrastructure/SEO queries that must not inherit
   * the request's Draft Mode perspective.
   */
  perspective?: "published" | "drafts" | "raw";

  /**
   * Published/raw cache lifetime in seconds. `false` caches indefinitely and
   * is the default so Sanity publish webhooks can invalidate affected routes.
   * Use `0` for request-time data such as Search results.
   */
  revalidate?: number | false;
}

async function isDraftModeEnabled(): Promise<boolean> {
  try {
    const { draftMode } = await import("next/headers");

    return (await draftMode()).isEnabled;
  } catch {
    /*
     * Unit tests and non-request execution do not have a Next.js request
     * store. Treat those environments as normal published reads.
     */
    return false;
  }
}

export async function sanityFetch<T>(
  query: string,
  params: Record<string, unknown> = {},
  options: SanityFetchOptions = {},
): Promise<T> {
  const draftEnabled = await isDraftModeEnabled();
  const perspective =
    options.perspective ?? (draftEnabled ? "drafts" : "published");

  /*
   * Published reads stay on the normal client. This preserves the existing
   * production path and keeps published requests out of the Live Content
   * draft subscription flow.
   */
  if (perspective === "published") {
    return sanityClient.fetch<T>(query, params, {
      next: {
        revalidate: options.revalidate ?? false,
      },
    });
  }

  if (perspective === "raw") {
    const token = process.env.SANITY_API_READ_TOKEN?.trim();

    if (draftEnabled && !token) {
      throw new Error(
        "Draft Mode is enabled but SANITY_API_READ_TOKEN is not configured.",
      );
    }

    const rawClient = sanityClient.withConfig({
      perspective: "raw",
      useCdn: false,
      ...(token ? { token } : {}),
      stega: false,
    });

    return rawClient.fetch<T>(query, params, {
      next: {
        revalidate: draftEnabled ? 0 : (options.revalidate ?? false),
      },
    });
  }

  const token = process.env.SANITY_API_READ_TOKEN?.trim();

  if (!token) {
    throw new Error(
      "Draft Mode is enabled but SANITY_API_READ_TOKEN is not configured.",
    );
  }

  const { liveSanityFetch } = await import("@/sanity/live");

  const { data } = await liveSanityFetch({
    query,
    params,
    perspective,
    stega: options.visualEditing === true,
  });

  return data as T;
}
