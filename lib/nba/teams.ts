/**
 * All 30 NBA teams. Static on purpose: codes are the stable keys every
 * prediction is stored under, so they never change once a season is picked.
 *
 * No logo files anywhere. Each team shows up as a colored tile built from
 * these colors (see components/predictions/team-tile.tsx).
 */

export type Conference = "west" | "east";

export const TEAM_CODES = [
  "ATL", "BOS", "BKN", "CHA", "CHI", "CLE", "DAL", "DEN", "DET", "GSW",
  "HOU", "IND", "LAC", "LAL", "MEM", "MIA", "MIL", "MIN", "NOP", "NYK",
  "OKC", "ORL", "PHI", "PHX", "POR", "SAC", "SAS", "TOR", "UTA", "WAS",
] as const;

export type TeamCode = (typeof TEAM_CODES)[number];

export type Team = {
  code: TeamCode;
  city: string;
  name: string;
  conference: Conference;
  primary: string;
  secondary: string;
};

export const TEAMS: Record<TeamCode, Team> = {
  // West
  DAL: { code: "DAL", city: "Dallas", name: "Mavericks", conference: "west", primary: "#00538C", secondary: "#B8C4CA" },
  DEN: { code: "DEN", city: "Denver", name: "Nuggets", conference: "west", primary: "#0E2240", secondary: "#FEC524" },
  GSW: { code: "GSW", city: "Golden State", name: "Warriors", conference: "west", primary: "#1D428A", secondary: "#FFC72C" },
  HOU: { code: "HOU", city: "Houston", name: "Rockets", conference: "west", primary: "#CE1141", secondary: "#C4CED4" },
  LAC: { code: "LAC", city: "LA", name: "Clippers", conference: "west", primary: "#C8102E", secondary: "#1D428A" },
  LAL: { code: "LAL", city: "Los Angeles", name: "Lakers", conference: "west", primary: "#552583", secondary: "#FDB927" },
  MEM: { code: "MEM", city: "Memphis", name: "Grizzlies", conference: "west", primary: "#5D76A9", secondary: "#12173F" },
  MIN: { code: "MIN", city: "Minnesota", name: "Timberwolves", conference: "west", primary: "#0C2340", secondary: "#78BE20" },
  NOP: { code: "NOP", city: "New Orleans", name: "Pelicans", conference: "west", primary: "#0C2340", secondary: "#C8102E" },
  OKC: { code: "OKC", city: "Oklahoma City", name: "Thunder", conference: "west", primary: "#007AC1", secondary: "#EF3B24" },
  PHX: { code: "PHX", city: "Phoenix", name: "Suns", conference: "west", primary: "#1D1160", secondary: "#E56020" },
  POR: { code: "POR", city: "Portland", name: "Trail Blazers", conference: "west", primary: "#E03A3E", secondary: "#000000" },
  SAC: { code: "SAC", city: "Sacramento", name: "Kings", conference: "west", primary: "#5A2D81", secondary: "#63727A" },
  SAS: { code: "SAS", city: "San Antonio", name: "Spurs", conference: "west", primary: "#C4CED4", secondary: "#000000" },
  UTA: { code: "UTA", city: "Utah", name: "Jazz", conference: "west", primary: "#4E2A84", secondary: "#F9A01B" },
  // East
  ATL: { code: "ATL", city: "Atlanta", name: "Hawks", conference: "east", primary: "#E03A3E", secondary: "#C1D32F" },
  BOS: { code: "BOS", city: "Boston", name: "Celtics", conference: "east", primary: "#007A33", secondary: "#BA9653" },
  BKN: { code: "BKN", city: "Brooklyn", name: "Nets", conference: "east", primary: "#000000", secondary: "#FFFFFF" },
  CHA: { code: "CHA", city: "Charlotte", name: "Hornets", conference: "east", primary: "#1D1160", secondary: "#00788C" },
  CHI: { code: "CHI", city: "Chicago", name: "Bulls", conference: "east", primary: "#CE1141", secondary: "#000000" },
  CLE: { code: "CLE", city: "Cleveland", name: "Cavaliers", conference: "east", primary: "#860038", secondary: "#FDBB30" },
  DET: { code: "DET", city: "Detroit", name: "Pistons", conference: "east", primary: "#C8102E", secondary: "#1D42BA" },
  IND: { code: "IND", city: "Indiana", name: "Pacers", conference: "east", primary: "#002D62", secondary: "#FDBB30" },
  MIA: { code: "MIA", city: "Miami", name: "Heat", conference: "east", primary: "#98002E", secondary: "#F9A01B" },
  MIL: { code: "MIL", city: "Milwaukee", name: "Bucks", conference: "east", primary: "#00471B", secondary: "#EEE1C6" },
  NYK: { code: "NYK", city: "New York", name: "Knicks", conference: "east", primary: "#006BB6", secondary: "#F58426" },
  ORL: { code: "ORL", city: "Orlando", name: "Magic", conference: "east", primary: "#0077C0", secondary: "#C4CED4" },
  PHI: { code: "PHI", city: "Philadelphia", name: "76ers", conference: "east", primary: "#006BB6", secondary: "#ED174C" },
  TOR: { code: "TOR", city: "Toronto", name: "Raptors", conference: "east", primary: "#CE1141", secondary: "#000000" },
  WAS: { code: "WAS", city: "Washington", name: "Wizards", conference: "east", primary: "#002B5C", secondary: "#E31837" },
};

export function isTeamCode(v: unknown): v is TeamCode {
  return typeof v === "string" && (TEAM_CODES as readonly string[]).includes(v);
}

/** The 15 teams in a conference, alphabetical by code. The builder's starting order. */
export function conferenceTeams(conf: Conference): TeamCode[] {
  return TEAM_CODES.filter((c) => TEAMS[c].conference === conf).slice().sort();
}

/** Every team, alphabetical by city. Used by the awards dropdowns. */
export function teamsByCity(): Team[] {
  return Object.values(TEAMS).sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name));
}

/** Black or bone text, whichever reads better on the team's primary color. */
export function tileText(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0a0a0a" : "#F5F1EA";
}
