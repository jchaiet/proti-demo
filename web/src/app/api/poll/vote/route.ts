import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { checkPollRateLimit } from "@/lib/polls/rate-limit";
import {
  parsePollVote,
  pollOriginAllowed,
  readPollVoteBody,
} from "@/lib/polls/validation";
import {
  createPollHistoryCookie,
  getPollCookie,
  POLL_COOKIE_MAX_AGE,
  POLL_COOKIE_NAME,
  pollFingerprint,
  pollVisitorSecret,
  readPollHistory,
} from "@/lib/polls/visitor";
import { sanityClient } from "@/sanity/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PollResult {
  _id: string;
  _type: "pollResult";
  pollKey: string;
  siteId: string;
  locale: string;
  votes?: Record<string, number>;
}

// Never trust client-provided site, locale, poll and option identifiers alone.
// Only published Page/Blog content can authorize a particular poll + option.
const VALID_POLL_QUERY = `
  count(*[
    _type in ["page", "blog"] &&
    site._ref == $siteId &&
    locale == $locale &&
    count(sections[
      _type == "pollBlock" &&
      coalesce(pollKey.current, _key) == $pollKey &&
      $optionId in options[].id
    ]) > 0
  ]) > 0
`;

function resultId(siteId: string, locale: string, pollKey: string): string {
  return `pollResult.${createHash("sha256")
    .update(`${siteId}:${locale}:${pollKey}`)
    .digest("hex")
    .slice(0, 40)}`;
}

function reply(error: string, status: number): NextResponse {
  return NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!pollOriginAllowed(request))
    return reply("Voting origin is not allowed.", 403);
  if (
    !/^application\/json(?:\s*;|\s*$)/i.test(
      request.headers.get("content-type") ?? "",
    )
  ) {
    return reply("Expected JSON.", 415);
  }

  const parsed = await readPollVoteBody(request);

  if (parsed.status !== "ok") {
    if (parsed.status === "large") {
      return reply("Vote request is too large.", 413);
    }

    return reply("Invalid request body.", 400);
  }

  const vote = parsePollVote(parsed.value);

  if (!vote) return reply("Invalid poll vote data.", 400);

  const secret = pollVisitorSecret();
  const writeToken = process.env.SANITY_API_WRITE_TOKEN?.trim();
  if (!secret || !writeToken)
    return reply("Poll voting is not configured.", 503);

  // Apply the shared, server-side IP limit BEFORE any Sanity reads or writes.
  // Fail closed when Redis/proxy configuration is missing or unavailable in
  // production; local development without Redis remains cookie-only.
  const gate = await checkPollRateLimit(request);
  if (gate === "limited")
    return reply("Too many vote requests. Try again later.", 429);
  if (gate !== "allowed")
    return reply("Poll voting is temporarily unavailable.", 503);

  const history = readPollHistory(getPollCookie(request), secret);
  const fingerprint = pollFingerprint(vote.siteId, vote.locale, vote.pollKey);
  const readClient = sanityClient.withConfig({
    perspective: "published",
    useCdn: false,
  });

  try {
    const available = await readClient.fetch<boolean>(VALID_POLL_QUERY, {
      siteId: vote.siteId,
      locale: vote.locale,
      pollKey: vote.pollKey,
      optionId: vote.optionId,
    });
    if (!available) return reply("Poll or option not found.", 404);
  } catch {
    return reply("Poll voting is temporarily unavailable.", 503);
  }

  const documentId = resultId(vote.siteId, vote.locale, vote.pollKey);
  try {
    if (history.includes(fingerprint)) {
      const existing = await readClient.fetch<Pick<PollResult, "votes"> | null>(
        `*[_id == $id][0]{votes}`,
        { id: documentId },
      );
      return NextResponse.json(
        { votes: existing?.votes ?? {}, alreadyVoted: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const writeClient = sanityClient.withConfig({
      token: writeToken,
      useCdn: false,
    });
    await writeClient.createIfNotExists({
      _id: documentId,
      _type: "pollResult",
      pollKey: vote.pollKey,
      siteId: vote.siteId,
      locale: vote.locale,
      votes: {},
    });

    // Sanity's server-side increment is atomic. Never read/modify/write.
    const votePath = `votes.${vote.optionId}`;
    const result = (await writeClient
      .patch(documentId)
      .setIfMissing({ [votePath]: 0 })
      .inc({ [votePath]: 1 })
      .commit()) as PollResult;

    const response = NextResponse.json(
      { votes: result.votes ?? {}, alreadyVoted: false },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
    response.cookies.set(
      POLL_COOKIE_NAME,
      createPollHistoryCookie([...history, fingerprint], secret),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: POLL_COOKIE_MAX_AGE,
      },
    );
    return response;
  } catch {
    // In cookie-only mode we cannot know whether a timed-out Sanity write
    // committed. A retry could count twice. Do not assert otherwise.
    return reply("Poll voting is temporarily unavailable.", 503);
  }
}
