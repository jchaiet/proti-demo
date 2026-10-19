"use client";

import { PollBlock } from "mino-ui/blocks/PollBlock";

import type { PollOption } from "mino-ui/blocks/PollBlock";
import type { MappedPollBlockProps } from "@/cms/mappers/blocks";

interface VoteResponse {
  votes?: Record<string, number>;
  alreadyVoted?: boolean;
}

export function Poll({
  pollKey,
  siteId,
  locale,
  options,
  ...props
}: MappedPollBlockProps) {
  const handleVote = async (optionId: string): Promise<PollOption[]> => {
    // The first successful vote issues the signed HttpOnly cookie automatically.
    // No separate session endpoint or external storage is needed.
    const response = await fetch("/api/poll/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      credentials: "same-origin",
      body: JSON.stringify({ pollKey, siteId, locale, optionId }),
    });
    if (!response.ok) throw new Error(`Poll vote failed: ${response.status}`);

    const data = (await response.json()) as VoteResponse;
    return options.map((option) => ({
      ...option,
      votes: data.votes?.[option.id] ?? 0,
    }));
  };

  return <PollBlock {...props} options={options} onVote={handleVote} />;
}
