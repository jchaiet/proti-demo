import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { sanityClient } from "@/sanity/client";

interface VoteRequest {
  pollKey?: string;
  siteId?: string;
  locale?: string;
  optionId?: string;
}

interface PollResult {
  _id: string;
  _type: "pollResult";

  pollKey: string;
  siteId: string;
  locale: string;

  votes?: Record<string, number>;
}

const OPTION_ID_PATTERN = /^[A-Za-z0-9_]+$/;

const VALID_POLL_QUERY = `
  count(
    *[
      _type in [
        "page",
        "blog"
      ] &&

      site._ref == $siteId &&

      locale == $locale &&

      count(
        sections[
          _type == "pollBlock" &&

          pollKey.current == $pollKey &&

          $optionId in options[].id
        ]
      ) > 0
    ]
  ) > 0
`;

function getResultId(siteId: string, locale: string, pollKey: string): string {
  const hash = createHash("sha256")
    .update(`${siteId}:${locale}:${pollKey}`)
    .digest("hex")
    .slice(0, 40);

  return `pollResult.${hash}`;
}

export async function POST(request: Request) {
  const writeToken = process.env.SANITY_API_WRITE_TOKEN;

  if (!writeToken) {
    return NextResponse.json(
      {
        error: "Poll voting is not configured.",
      },
      {
        status: 500,
      },
    );
  }

  let body: VoteRequest;

  try {
    body = (await request.json()) as VoteRequest;
  } catch {
    return NextResponse.json(
      {
        error: "Invalid request body.",
      },
      {
        status: 400,
      },
    );
  }

  const { pollKey, siteId, locale, optionId } = body;

  if (!pollKey || !siteId || !locale || !optionId) {
    return NextResponse.json(
      {
        error: "Missing poll vote data.",
      },
      {
        status: 400,
      },
    );
  }

  if (!OPTION_ID_PATTERN.test(optionId)) {
    return NextResponse.json(
      {
        error: "Invalid poll option.",
      },
      {
        status: 400,
      },
    );
  }

  const readClient = sanityClient.withConfig({
    useCdn: false,
  });

  const validPoll = await readClient.fetch<boolean>(VALID_POLL_QUERY, {
    pollKey,
    siteId,
    locale,
    optionId,
  });

  if (!validPoll) {
    return NextResponse.json(
      {
        error: "Poll or option not found.",
      },
      {
        status: 404,
      },
    );
  }

  const writeClient = sanityClient.withConfig({
    token: writeToken,

    useCdn: false,
  });

  const documentId = getResultId(siteId, locale, pollKey);

  await writeClient.createIfNotExists({
    _id: documentId,

    _type: "pollResult",

    pollKey,
    siteId,
    locale,

    votes: {},
  });

  const votePath = `votes.${optionId}`;

  const result = (await writeClient
    .patch(documentId)
    .setIfMissing({
      [votePath]: 0,
    })
    .inc({
      [votePath]: 1,
    })
    .commit()) as PollResult;

  return NextResponse.json({
    votes: result.votes ?? {},
  });
}
