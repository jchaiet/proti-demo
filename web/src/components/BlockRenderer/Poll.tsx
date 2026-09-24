"use client";

import { PollBlock } from "mino-ui/blocks/PollBlock";

import type { PollOption } from "mino-ui/blocks/PollBlock";

import type { MappedPollBlockProps } from "@/cms/mappers/blocks";

interface VoteResponse {
  votes?: Record<string, number>;
}

export function Poll({
  pollKey,
  siteId,
  locale,
  options,
  ...props
}: MappedPollBlockProps) {
  const handleVote = async (optionId: string): Promise<PollOption[]> => {
    const response = await fetch("/api/poll/vote", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        pollKey,
        siteId,
        locale,
        optionId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Poll vote failed: ${response.status}`);
    }

    const data = (await response.json()) as VoteResponse;

    return options.map((option) => ({
      ...option,

      votes: data.votes?.[option.id] ?? 0,
    }));
  };

  return <PollBlock {...props} options={options} onVote={handleVote} />;
}
