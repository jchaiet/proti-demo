/**
 * Visual fixtures are opt-in, including on production-mode Next.js servers.
 * Never set this variable in a publicly deployed Web environment.
 */
export function visualFixturesEnabled(): boolean {
  return process.env.PROTI_VISUAL_FIXTURES === "1";
}
