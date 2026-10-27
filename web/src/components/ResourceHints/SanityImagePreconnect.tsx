"use client";

import { preconnect } from "react-dom";

/**
 * Open the Sanity image-CDN connection while the initial HTML is being rendered.
 *
 * React 19 hoists this resource hint into <head> during server rendering.
 * We intentionally do not preload an image URL here: each CMS page has its
 * own image, and HeroBlock already marks its LCP image high priority.
 */
export function SanityImagePreconnect() {
  preconnect("https://cdn.sanity.io");

  return null;
}
