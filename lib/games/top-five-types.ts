export type TopFiveVerdictTag = "based" | "reach" | "interesting" | "disrespectful" | "cap";

export type TopFiveVerdict = {
  rating: number;
  take: string;
  per_pick: { name: string; verdict: TopFiveVerdictTag }[];
};

export type TopFivePayload = {
  prompt_id: string | null;
  prompt_text: string;
  picks: string[];
};
