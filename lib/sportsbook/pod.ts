/**
 * On The Court prep. Turns last week's results and this week's slate into the
 * interview Jaiye reads while recording. Pure: no Supabase, no clock. Notes
 * live in pod-notes.ts.
 */
import { pickPoints, weekWinner } from "./grade";
import type { SbItem, SbPick, SbPlayer, SbWeek } from "./types";
import { weekRangeLabel } from "./weeks";

export type PodPrompt = { key: string; text: string };
export type PodSection = {
  key: string;
  title: string;
  lead: string;
  table?: { columns: string[]; rows: string[][] };
  prompts: PodPrompt[];
};

type HousePlayer = { id: string; display_name: string };

/** The slice of loadWeekView this file reads. */
export type WeekViewLike = {
  week: Pick<SbWeek, "week_number" | "starts_on" | "ends_on" | "recap">;
  items: SbItem[];
  picks: SbPick[];
  players: SbPlayer[];
  board: Array<{
    player: Pick<SbPlayer, "id" | "kind" | "display_name">;
    score: { player_id: string; points: number; correct: number; wrong: number; lockHit: boolean | null };
  }>;
};

const TZ = "America/Los_Angeles";
const lockFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", hour: "numeric", minute: "2-digit", hour12: true });

/** "Wed 4:00pm" in Pacific. */
export function pacificLockLabel(iso: string): string {
  const parts = Object.fromEntries(lockFmt.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${parts.weekday} ${parts.hour}:${parts.minute}${String(parts.dayPeriod).toLowerCase()}`;
}

const MINUS = "−";
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `${MINUS}${Math.abs(n)}` : "0");
const ordinal = (n: number) => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10 > 3 ? 0 : n % 10] ?? "th"}`;
};
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** Ends a prompt in a full stop unless it already has end punctuation. */
const sentence = (s: string) => (/[.?!]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

function pickLabel(item: SbItem, pick: SbPick | undefined): string {
  if (!pick) return "No pick";
  let base: string | null = null;
  if (pick.choice) base = item.options.find((o) => o.key === pick.choice)?.label ?? pick.choice;
  else if (pick.guess != null) base = String(pick.guess);
  if (base === null) return "No pick";
  return pick.is_lock ? `${base} (Lock)` : base;
}

const hasPick = (pick: SbPick | undefined) => !!pick && (pick.choice != null || pick.guess != null);
const samePick = (a: SbPick | undefined, b: SbPick | undefined) => hasPick(a) && hasPick(b) && a!.choice === b!.choice && a!.guess === b!.guess;
const byItem = (picks: SbPick[], playerId: string) => new Map(picks.filter((p) => p.player_id === playerId).map((p) => [p.item_id, p]));
const sortedItems = (v: WeekViewLike) => [...v.items].sort((a, b) => a.sort - b.sort);

/** A pick described for a sentence: the choice, then the question it answers. */
function lockText(item: SbItem, pick: SbPick): string {
  return `${pickLabel(item, pick).replace(" (Lock)", "")} on "${item.prompt.replace(/[.?!]$/, "")}"`;
}

function fixed(prefix: string, texts: string[]): PodPrompt[] {
  return texts.map((text, i) => ({ key: `${prefix}.${i + 1}`, text }));
}

export function buildPodPrep(input: {
  week: number;
  thisWeek: WeekViewLike | null;
  lastWeek: WeekViewLike | null;
  house: { jaiye: HousePlayer; remi: HousePlayer };
}): PodSection[] {
  const { week, thisWeek, lastWeek, house } = input;
  const prev = week - 1;
  const nameOf = (p: { id: string; kind: string; display_name: string }) =>
    p.id === house.jaiye.id ? "Jaiye" : p.id === house.remi.id ? "Dad" : p.display_name;

  let winnerName = "";
  const sections: PodSection[] = [];

  /* a. Last week's scoreboard */
  {
    const prompts: PodPrompt[] = [];
    let lead: string;
    let table: PodSection["table"];
    if (!lastWeek || lastWeek.board.length === 0) {
      lead = `There is no Week ${prev} scoreboard to show, so skip the look back and start with this week.`;
    } else {
      const v = lastWeek;
      const board = v.board;
      const winId = weekWinner(board.map((b) => b.score)) ?? board[0].player.id;
      const win = board.find((b) => b.player.id === winId) ?? board[0];
      winnerName = nameOf(win.player);
      const jIdx = board.findIndex((b) => b.player.id === house.jaiye.id);
      const rIdx = board.findIndex((b) => b.player.id === house.remi.id);
      const j = jIdx >= 0 ? board[jIdx] : null;
      const r = rIdx >= 0 ? board[rIdx] : null;
      const jaiyeWon = win.player.id === house.jaiye.id;
      const parts = [`${winnerName} won Week ${prev} with ${plural(win.score.points, "point")}.`];
      if (j && !jaiyeWon) parts.push(`Jaiye finished ${ordinal(jIdx + 1)} with ${j.score.points}, ${win.score.points - j.score.points} back.`);
      if (j && r) {
        const d = j.score.points - r.score.points;
        const dad = `(Dad finished at ${r.score.points})`;
        if (d > 0) parts.push(`${jaiyeWon ? "Jaiye" : "He"} beat Dad by ${d} ${dad}.`);
        else if (d < 0) parts.push(`Dad beat Jaiye by ${-d} ${dad}.`);
        else parts.push(`Jaiye and Dad tied ${dad}.`);
      }
      parts.push(`${plural(board.length, "person", "people")} played.`);
      const open = v.items.filter((i) => i.status === "open").length;
      if (open > 0) parts.push(`${plural(open, "pick")} still being graded, so these numbers can move.`);
      lead = parts.join(" ");

      const chosen = new Set<string>(board.slice(0, 5).map((b) => b.player.id));
      if (j) chosen.add(j.player.id);
      if (r) chosen.add(r.player.id);
      table = {
        columns: ["Player", "Points"],
        rows: board.filter((b) => chosen.has(b.player.id)).map((b) => [nameOf(b.player), String(b.score.points)]),
      };

      const items = sortedItems(v);
      const jPicks = byItem(v.picks, house.jaiye.id);
      const rPicks = byItem(v.picks, house.remi.id);
      prompts.push({
        key: "last.score.1",
        text: jaiyeWon
          ? "You won the week. What did you get right?"
          : `${winnerName} beat you by ${win.score.points - (j?.score.points ?? 0)}. What do you say to them on the pod?`,
      });
      const rLock = items.map((i) => ({ i, p: rPicks.get(i.id) })).find((x) => x.p?.is_lock);
      const lockPts = rLock?.p ? pickPoints(rLock.i, rLock.p, v.picks) : null;
      const lockMiss = rLock?.p && lockPts !== null && lockPts < 0 ? ` His Lock was ${lockText(rLock.i, rLock.p)} and it cost him ${Math.abs(lockPts)}.` : "";
      prompts.push({ key: "last.score.2", text: `Dad finished at ${r?.score.points ?? 0}.${lockMiss} Be nice. Or don't.` });
      const jLock = items.map((i) => ({ i, p: jPicks.get(i.id) })).find((x) => x.p?.is_lock);
      const jLockPts = jLock?.p ? pickPoints(jLock.i, jLock.p, v.picks) : null;
      prompts.push({
        key: "last.score.3",
        text: jLock?.p
          ? `Your Lock was ${lockText(jLock.i, jLock.p)}. ${jLockPts === null ? "It is still being graded." : jLockPts > 0 ? "It hit." : jLockPts < 0 ? "It missed." : "It was thrown out."} What's the lesson for this week's Lock?`
          : "You did not set a Lock last week. What's your plan for this week's Lock?",
      });
      const recap = v.week.recap?.trim();
      if (recap) {
        const first = (/^[\s\S]*?[.!?](?=\s|$)/.exec(recap)?.[0] ?? recap).replace(/\s+/g, " ").trim();
        prompts.push({ key: "last.score.4", text: `Your recap said: "${first}" Still standing on that?` });
      }
    }
    sections.push({ key: "last-scoreboard", title: "Last week's scoreboard", lead, table, prompts });
  }

  /* b. Last week, pick by pick */
  {
    const prompts: PodPrompt[] = [];
    let lead: string;
    let table: PodSection["table"];
    if (!lastWeek) {
      lead = `Week ${prev} is not in the system, so there are no picks to go back over.`;
    } else {
      const v = lastWeek;
      const items = sortedItems(v);
      const jPicks = byItem(v.picks, house.jaiye.id);
      const rPicks = byItem(v.picks, house.remi.id);
      lead = `Every pick from Week ${prev}: what you said, what Dad said and what happened.`;
      table = {
        columns: ["#", "The pick", "Jaiye", "Dad", "What happened", "Jaiye's points"],
        rows: items.map((item, i) => {
          const jp = jPicks.get(item.id);
          const pts = jp ? pickPoints(item, jp, v.picks) : null;
          return [
            String(i + 1),
            item.prompt,
            pickLabel(item, jp),
            pickLabel(item, rPicks.get(item.id)),
            item.result?.display || (item.status === "void" ? "Thrown out" : "Still being graded"),
            !jp || !hasPick(jp) ? "none" : pts === null ? "open" : signed(pts),
          ];
        }),
      };
      items.forEach((item, i) => {
        const jp = jPicks.get(item.id);
        const pts = jp ? pickPoints(item, jp, v.picks) : null;
        const said = `You said ${pickLabel(item, jp)}, Dad said ${pickLabel(item, rPicks.get(item.id))}.`;
        let outcome: string;
        if (!hasPick(jp)) outcome = "You did not pick this one. What would you have said?";
        else if (item.status === "void") outcome = "It was thrown out, so nobody scored.";
        else if (pts === null) outcome = "Still open. Who's winning this one?";
        else if (pts > 0) outcome = `It hit for ${signed(pts)}. How did you see it coming?`;
        else outcome = `It missed for ${signed(pts)}. What did you get wrong?`;
        prompts.push({ key: `last.pick.${item.sort}`, text: `${i + 1}. ${sentence(item.prompt)} ${said} ${outcome}` });
      });
      const open = items.filter((i) => i.status === "open").length;
      if (open > 0) {
        prompts.push({ key: "last.open", text: `${plural(open, "pick")} from last week ${open === 1 ? "is" : "are"} still open. Which one are you watching, and what needs to happen?` });
      }
    }
    sections.push({ key: "last-picks", title: "Last week, pick by pick", lead, table, prompts });
  }

  /* c. Around the league */
  sections.push({
    key: "league",
    title: "Around the league",
    lead: "The facts are in the pick notes; the takes are yours.",
    prompts: fixed("league", [
      "Who is the hottest team in the league right now, and is it real?",
      "You picked a team to win it all and an MVP. Are you still standing on both?",
      "What's the biggest surprise so far, good or bad?",
      "Name a player everybody is sleeping on.",
      "Dad's team: does he get to say he was right?",
      "Who is the best player in the world right now?",
      "Your Blazers: are you still calling them for the second round?",
      "The Knicks: how is that chemistry looking?",
      "One more thing the league is talking about this week.",
    ]),
  });

  /* d. This week's picks */
  {
    const prompts: PodPrompt[] = [];
    let lead: string;
    let table: PodSection["table"];
    if (!thisWeek) {
      lead = `Week ${week} is not set up yet, so there are no picks to talk about. You can still plan your prediction.`;
    } else {
      const v = thisWeek;
      const items = sortedItems(v);
      const jPicks = byItem(v.picks, house.jaiye.id);
      const rPicks = byItem(v.picks, house.remi.id);
      const jDone = items.some((i) => hasPick(jPicks.get(i.id)));
      const rDone = items.some((i) => hasPick(rPicks.get(i.id)));
      const status = jDone && rDone ? "Both have picked." : jDone ? "Dad hasn't picked yet." : rDone ? "Jaiye hasn't picked yet." : "Neither of you has picked yet.";
      const first = items.map((i) => i.locks_at).sort((a, b) => Date.parse(a) - Date.parse(b))[0];
      const jLock = items.map((i) => ({ i, p: jPicks.get(i.id) })).find((x) => x.p?.is_lock);
      const rLock = items.map((i) => ({ i, p: rPicks.get(i.id) })).find((x) => x.p?.is_lock);
      lead = [
        `Week ${week} runs ${weekRangeLabel(v.week)}.`,
        status,
        `${plural(items.length, "pick")}${first ? `, the first locks ${pacificLockLabel(first)}` : ""}.`,
        jLock?.p ? `Your Lock is ${lockText(jLock.i, jLock.p)};` : "You haven't set your Lock yet;",
        rLock?.p ? `Dad locked ${lockText(rLock.i, rLock.p)}.` : "Dad hasn't set his yet.",
      ].join(" ");
      table = {
        columns: ["#", "The pick", "Points", "Locks (Pacific)", "Jaiye", "Dad"],
        rows: items.map((item, i) => [
          String(i + 1),
          item.prompt,
          String(item.points),
          pacificLockLabel(item.locks_at),
          pickLabel(item, jPicks.get(item.id)),
          pickLabel(item, rPicks.get(item.id)),
        ]),
      };
      items.forEach((item, i) => {
        const jp = jPicks.get(item.id);
        const rp = rPicks.get(item.id);
        const said = `${hasPick(jp) ? `You said ${pickLabel(item, jp)}` : "You haven't picked yet"}, ${hasPick(rp) ? `Dad said ${pickLabel(item, rp)}` : "Dad hasn't picked yet"}.`;
        const talk = samePick(jp, rp) ? "You agree. What makes you both sure?" : "Make your case, and say what would make you wrong.";
        const lock = jp?.is_lock ? ` This is your Lock: ${item.points} points, doubled either way.` : "";
        prompts.push({ key: `this.pick.${item.sort}`, text: `${i + 1}. ${sentence(item.prompt)} ${said} ${talk}${lock}` });
      });
      if (items.length > 0) prompts.push({ key: "this.unsure", text: "Which pick are you least sure about this week?" });
    }
    prompts.push({ key: "this.prediction", text: "Your prediction: your points, Dad's points, and who tops the board on Sunday night." });
    sections.push({ key: "this-week", title: "This week's picks", lead, table, prompts });
  }

  /* e. The segments */
  sections.push({
    key: "segments",
    title: "The segments",
    // Jaiye records on his own, so every bit here works with one voice.
    lead: "Your bits. Keep each one quick.",
    prompts: [
      { key: "seg.buy", text: "Buy or Sell. Five takes, three seconds each, then one sentence why. Write your five." },
      { key: "seg.rank", text: "Rank them. Best player in the league right now, one to five. Pick the five names, give the order, and one reason for the top spot." },
      { key: "seg.pocket", text: "In Your Pocket. One word per player. Pick five players from this week's picks." },
      { key: "seg.defend", text: "Defend it. The take people will push back on most this week. Defend it in five points." },
      { key: "seg.vault", text: "The Vault. One September call to check. Any pick you'd take back?" },
    ],
  });

  /* f. Sign-off */
  sections.push({
    key: "signoff",
    title: "Sign-off",
    lead: "Wrap it up and tell people where to go.",
    prompts: [
      { key: "signoff.1", text: `The one thing to tell people this week: play at jaiyesobo.com/runitback/app, start a league, or beat ${winnerName || "Jaiye and Dad"}. Say it your way.` },
      { key: "signoff.2", text: "Episode title." },
      { key: "signoff.3", text: "Your sign-off line." },
    ],
  });

  return sections;
}
