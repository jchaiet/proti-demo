import { createClient } from "next-sanity";

export const sanityClient = createClient({
  projectId: process.env.NEXT_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_SANITY_DATASET,
  apiVersion: "2026-08-20",

  perspective: "published",

  useCdn: false,
});
