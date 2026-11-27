/**
 * The signed Sanity publish webhook invalidates this tag when Site settings
 * change (including domain, locale, or canonical-domain changes).
 * Only the published Host -> Site lookup for the public Search API uses it.
 */
export const PUBLIC_SEARCH_SITE_LOOKUP_TAG = "proti:public-search-site-lookup";
