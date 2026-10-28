import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Lockup } from "@/components/Lockup";
import { MoreButton, usePlayerActions } from "@/components/PlayerActions";
import { ApiError, clearToken, getToken } from "@/lib/api";
import { colors, fonts, radius } from "@/lib/brand";
import { showDialog } from "@/lib/dialog";
import { getBoard, getCurrentWeek, getMe, getRecap, getResults, getTalkLines, patchMe, postTalk, react, savePick, submitPicks } from "@/lib/routes";
import { syncLockReminder } from "@/lib/reminders";
import type { AgeBand, ApiCrowd, ApiHousePick, ApiItem, ApiOption, ApiResults, ApiWeek, ReactionKey, TalkLinesResponse } from "@shared/types";

/**
 * This Week — the home of the signed-in app. Loads /me and /week/current,
 * shows the Beat Jaiye & Remi scoreboard, next lock, and interactive pick
 * cards. Tap an option to pick (or tap your selected option to clear);
 * closest-guess items get a numeric input that commits on blur. Locked
 * cards reveal the house picks, crowd split, verdict, and trash talk.
 *
 * Auth gate: if no token is in the Keychain, we redirect to /join
 * immediately. If the token exists but /me returns 401 (revoked, deleted
 * account), we clear the token and send the user back to /join as if
 * they were new.
 */
export default function ThisWeek() {
  const qc = useQueryClient();
  const hasToken = useQuery({
    queryKey: ["session", "has-token"],
    queryFn: async () => (await getToken()) !== null,
    staleTime: 0,
  });

  const me = useQuery({
    queryKey: ["me"],
    queryFn: ({ signal }) => getMe(signal),
    enabled: hasToken.data === true,
    retry: (failureCount, err) => !(err instanceof ApiError && err.status === 401) && failureCount < 2,
  });

  const week = useQuery({
    queryKey: ["week", "current"],
    queryFn: ({ signal }) => getCurrentWeek(signal),
    enabled: hasToken.data === true,
    retry: (failureCount, err) => !(err instanceof ApiError && err.status === 401) && failureCount < 2,
    // Poll every minute while a game is live (locked, not yet graded) or a lock is under ten minutes away.
    refetchInterval: (q) => {
      const d = q.state.data;
      if (!d) return false;
      const live = d.items.some((i) => i.locked && i.status === "open");
      const soon = d.next_lock_at ? Date.parse(d.next_lock_at) - Date.now() < 10 * 60_000 : false;
      return live || soon ? 60_000 : false;
    },
  });

  if (hasToken.data === false) return <Redirect href="/join" />;
  if ([me.error, week.error].some((e) => e instanceof ApiError && e.status === 401)) {
    // Server disowned the token (revoked, account deleted). Clear it, go sign in.
    clearToken().catch(() => {});
    return <Redirect href="/join" />;
  }

  if (hasToken.isPending || me.isPending || week.isPending) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  const errorText =
    me.error instanceof ApiError ? describeError(me.error) :
    week.error instanceof ApiError ? describeError(week.error) :
    me.error || week.error ? "Can't reach Run It Back right now." : null;

  if (errorText || !me.data || !week.data) {
    const switchAccount = async () => {
      await clearToken().catch(() => {});
      qc.clear();
      router.replace("/join");
    };
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorText ?? "Couldn't load this week."}</Text>
          <Pressable onPress={() => { me.refetch(); week.refetch(); }} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
          <Pressable onPress={switchAccount} style={styles.switchLink}>
            <Text style={styles.switchLinkText}>Use a different account</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ThisWeekBody
      week={week.data}
      meId={me.data.player.id}
      meName={me.data.player.display_name}
      canTalk={me.data.player.can_talk}
      leagueCount={me.data.leagues.length}
      pushLockEnabled={me.data.player.push_enabled.lock}
      needsAge={me.data.player.age_band === null}
      onRefresh={() => Promise.all([me.refetch(), week.refetch()])}
    />
  );
}

function ThisWeekBody({
  week,
  meId,
  meName,
  canTalk,
  leagueCount,
  pushLockEnabled,
  needsAge,
  onRefresh,
}: {
  week: ApiWeek;
  meId: string;
  meName: string;
  canTalk: boolean;
  leagueCount: number;
  pushLockEnabled: boolean;
  needsAge: boolean;
  onRefresh: () => Promise<unknown>;
}) {
  const insets = useSafeAreaInsets();
  const scoreboard = week.scores;
  const items = week.items;
  // Locked items can't be picked any more, so Submit only counts the open ones.
  const open = items.filter((i) => !i.locked);
  const pickedOpen = open.filter((i) => isPicked(i.my_pick)).length;
  const showFooter = open.length > 0 && !week.submitted && week.status === "open";
  const canSubmit = showFooter && pickedOpen === open.length;
  const [footerH, setFooterH] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const now = useNow();

  const heroKind: HeroKind =
    items.length === 0 ? "soon" :
    week.status === "graded" || week.status === "final" ? "books" :
    week.status !== "open" ? "soon" :
    open.length === 0 ? "live" :
    week.submitted ? "in" : "picking";
  const lockWhen = week.next_lock_at ? fmtWhen(week.next_lock_at, now) : null;

  const unpickedOpenCount = open.length - pickedOpen;
  const reminderOn = pushLockEnabled && week.status === "open" && !week.submitted;
  useEffect(() => {
    void syncLockReminder({
      weekNumber: week.number,
      nextLockAt: week.next_lock_at,
      unpicked: unpickedOpenCount,
      enabled: reminderOn,
    });
  }, [week.number, week.next_lock_at, unpickedOpenCount, reminderOn]);

  // Entry strip only: never blocks render, falls back to the short label.
  const recap = useQuery({
    queryKey: ["recap", "current"],
    queryFn: ({ signal }) => getRecap(signal),
    staleTime: 60_000,
  });
  const recapWeek = recap.data?.text ? recap.data.week : null;

  // Latest graded week, for the payoff strip. 404 until something is graded, so no retry.
  const results = useQuery({
    queryKey: ["results", "current", ""],
    queryFn: ({ signal }) => getResults(undefined, signal),
    staleTime: 60_000,
    retry: false,
  });
  const r = results.data;
  // Cached results can lag a week behind right after the Sunday flip; only show them for this week.
  const heroResults = r && r.week === week.number ? r : undefined;
  const resultsLabel = !r
    ? null
    : r.scores.me === null
      ? `Week ${r.week} results`
      : r.you_beat.jaiye && r.you_beat.remi
        ? `Week ${r.week}: you beat the house ✓`
        : r.you_beat.jaiye
          ? `Week ${r.week}: you beat Jaiye ✓`
          : r.you_beat.remi
            ? `Week ${r.week}: you beat Remi ✓`
            : `Week ${r.week}: Jaiye got you`;

  // Reactions target Jaiye's and Remi's player ids, which only board rows carry. Same key as the board tab.
  const houseBoard = useQuery({
    queryKey: ["board", "week"],
    queryFn: ({ signal }) => getBoard({ span: "week" }, signal),
    enabled: items.some((i) => i.locked),
    staleTime: 300_000,
  });
  const houseIds: HouseIds = {
    jaiye: houseBoard.data?.rows.find((row) => row.kind === "jaiye")?.player_id ?? null,
    remi: houseBoard.data?.rows.find((row) => row.kind === "remi")?.player_id ?? null,
  };

  const pullRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([onRefresh(), recap.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: showFooter ? footerH + 24 : 48 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={pullRefresh} tintColor={colors.steel} />}
      >
        <View style={styles.header}>
          <Lockup h={44} />
        </View>

        <Text style={styles.eyebrow}>Week {week.number} · {week.label}</Text>
        <Text style={styles.title}>Beat Jaiye & Remi.</Text>
        <Text style={styles.lockHint}>One Lock of the Week. It doubles the points — up or down.</Text>

        <HeroCard
          kind={heroKind}
          weekNumber={week.number}
          openCount={open.length}
          pickedOpen={pickedOpen}
          lockWhen={lockWhen}
          results={heroResults}
        />

        {week.closest_rival ? <NemesisCard rival={week.closest_rival} /> : null}

        <View style={styles.scoreRow}>
          <ScoreBox name="Jaiye" value={scoreboard.jaiye} tone="accent" />
          <ScoreBox name="Remi" value={scoreboard.remi} tone="paper" />
          <ScoreBox name={meName} value={scoreboard.me ?? 0} tone="paper" />
        </View>

        {resultsLabel ? (
          <Pressable onPress={() => router.push("/results")} style={[styles.boardLink, styles.resultsLink]}>
            <Text style={styles.boardLinkText} numberOfLines={1}>{resultsLabel}</Text>
            <Text style={styles.boardLinkCta}>See results →</Text>
          </Pressable>
        ) : null}

        <Pressable onPress={() => router.push("/board")} style={styles.boardLink}>
          {week.rank ? (
            <Text style={styles.boardLinkText}>{`You're #${week.rank.position} of ${week.rank.of} this week`}</Text>
          ) : null}
          <Text style={styles.boardLinkCta}>See the board →</Text>
        </Pressable>

        <Pressable onPress={() => router.push("/leagues")} style={[styles.boardLink, styles.leagueLink]}>
          <Text style={styles.boardLinkText}>{leagueCount > 0 ? `Leagues · ${leagueCount}` : "Leagues"}</Text>
          <Text style={styles.boardLinkCta}>{leagueCount > 0 ? "Open →" : "Start or join one →"}</Text>
        </Pressable>

        <Pressable onPress={() => router.push("/corner")} style={[styles.boardLink, styles.cornerLink]}>
          <Text style={styles.boardLinkText}>{recapWeek ? `Jaiye's Corner · Week ${recapWeek} recap` : "Jaiye's Corner"}</Text>
          <Text style={styles.boardLinkCta}>Read →</Text>
        </Pressable>

        <View style={styles.cards}>
          {needsAge ? <AgePrompt /> : null}
          {items.map((item) => (
            <PickCard
              key={item.id}
              item={item}
              disabled={week.submitted || week.status !== "open"}
              meId={meId}
              houseIds={houseIds}
              canTalk={canTalk}
              now={now}
            />
          ))}
        </View>

        <Pressable onPress={() => router.push("/settings")} style={[styles.boardLink, styles.settingsLink]}>
          <Text style={styles.boardLinkText} numberOfLines={1}>{`Playing as ${meName}`}</Text>
          <Text style={styles.boardLinkCta}>Settings →</Text>
        </Pressable>
      </ScrollView>

      {showFooter ? (
        <SubmitFooter
          week={week.number}
          pickedOpen={pickedOpen}
          openCount={open.length}
          ready={canSubmit}
          onHeight={setFooterH}
        />
      ) : null}
    </SafeAreaView>
  );
}

/** One-time 13+ check for accounts that never answered (the server only takes it while null). */
function AgePrompt() {
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (age_band: AgeBand) => patchMe({ age_band }),
    onSuccess: (data) => qc.setQueryData(["me"], data),
  });
  const errorText = save.error
    ? save.error instanceof ApiError ? describeError(save.error) : "Couldn't save that. Try again."
    : null;

  return (
    <View style={styles.ageCard}>
      <Text style={styles.ageLabel}>Quick one</Text>
      <Text style={styles.ageQuestion}>Are you 13 or older?</Text>
      <View style={styles.ageRow}>
        {([["13_plus", "Yes"], ["under_13", "No"]] as const).map(([band, label]) => {
          const selected = save.isPending && save.variables === band;
          return (
            <Pressable
              key={band}
              disabled={save.isPending}
              onPress={() => save.mutate(band)}
              accessibilityRole="button"
              accessibilityState={{ disabled: save.isPending, selected }}
              style={[styles.ageBtn, selected && styles.ageBtnSelected, save.isPending && !selected && styles.optionBtnLocked]}
            >
              <Text style={[styles.ageBtnText, selected && styles.ageBtnTextSelected]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      {errorText ? <Text style={styles.cardError}>{errorText}</Text> : null}
    </View>
  );
}

function isPicked(p: ApiItem["my_pick"]): boolean {
  if (!p) return false;
  return p.choice !== null || p.guess !== null;
}

/** "Thu 7:30 PM" in the viewer's locale. */
function fmtWeekdayTime(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString(undefined, { weekday: "short" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} ${time}`;
}

/** Re-renders every `intervalMs` so countdowns tick. */
function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole minutes until `iso`, or null when it's a day or more away. */
function minsWithinDay(iso: string, now: number): number | null {
  const ms = new Date(iso).getTime() - now;
  return ms < DAY_MS ? Math.max(0, Math.floor(ms / 60_000)) : null;
}

function fmtHm(mins: number): string {
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h}h ${mins % 60}m` : `${mins}m`;
}

/** "in 2h 14m" inside 24 hours, else "Thu 7:30 PM". */
function fmtWhen(iso: string, now: number): string {
  const mins = minsWithinDay(iso, now);
  return mins === null ? fmtWeekdayTime(iso) : mins < 1 ? "in under a minute" : `in ${fmtHm(mins)}`;
}

function fmtLockChip(iso: string, now: number): string {
  const mins = minsWithinDay(iso, now);
  if (mins === null) return `LOCKS ${fmtWeekdayTime(iso).toUpperCase()}`;
  return mins < 1 ? "LOCKING" : `LOCKS IN ${fmtHm(mins).toUpperCase()}`;
}

type HeroKind = "picking" | "in" | "live" | "books" | "soon";

/** The "when do I come back" card: one state per phase of the week. */
function HeroCard({
  kind,
  weekNumber,
  openCount,
  pickedOpen,
  lockWhen,
  results,
}: {
  kind: HeroKind;
  weekNumber: number;
  openCount: number;
  pickedOpen: number;
  lockWhen: string | null;
  results: ApiResults | undefined;
}) {
  const board = useQuery({
    queryKey: ["board", "week", results?.week],
    queryFn: ({ signal }) => getBoard({ span: "week", week: results?.week }, signal),
    enabled: kind === "books" && !!results,
    staleTime: 300_000,
  });
  const winner = board.data?.rows[0];

  return (
    <View style={styles.hero}>
      {kind === "picking" ? (
        <>
          <Text style={styles.heroEyebrow}>This week</Text>
          <Text style={styles.heroBig}>{pickedOpen} of {openCount} picked</Text>
          <View
            style={styles.heroBar}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: openCount, now: pickedOpen }}
          >
            <View style={[styles.heroBarFill, { width: `${Math.round((pickedOpen / openCount) * 100)}%` }]} />
          </View>
          {lockWhen ? <Text style={styles.heroLine}>Picks lock {lockWhen}</Text> : null}
        </>
      ) : kind === "in" ? (
        <>
          <Text style={[styles.heroBig, styles.heroBigAccent]}>{"You're in."}</Text>
          <Text style={styles.heroLine}>
            {lockWhen ? `First reveal ${lockWhen}. ` : ""}
            {"Jaiye and Remi's picks show at tip-off."}
          </Text>
        </>
      ) : kind === "live" ? (
        <>
          <Text style={styles.heroBig}>Games are on.</Text>
          <Text style={styles.heroLine}>Watch, then come back Sunday night for the results.</Text>
        </>
      ) : kind === "books" ? (
        <>
          <Text style={styles.heroBig}>Week {weekNumber} is in the books.</Text>
          {results ? (
            <Text style={styles.heroLine}>
              {`Jaiye ${results.scores.jaiye} · Remi ${results.scores.remi}`}
              {results.scores.me !== null ? ` · You ${results.scores.me}` : ""}
            </Text>
          ) : null}
          {winner ? (
            <Text style={[styles.heroWinner, winner.is_me && styles.heroBigAccent]}>
              {winner.is_me ? "You took it." : `${winner.display_name} took it.`}
            </Text>
          ) : null}
        </>
      ) : (
        <Text style={styles.heroBig}>Picks for Week {weekNumber} drop soon.</Text>
      )}
    </View>
  );
}

/** gap is their points minus yours: positive means they're ahead of you. */
function NemesisCard({ rival }: { rival: NonNullable<ApiWeek["closest_rival"]> }) {
  const pts = Math.abs(rival.gap);
  const line =
    rival.gap === 0
      ? `You and ${rival.display_name} are tied`
      : `${rival.display_name} is ${pts} pt${pts === 1 ? "" : "s"} ${rival.gap > 0 ? "ahead of" : "behind"} you`;

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/rivals/[id]", params: { id: rival.player_id } })}
      accessibilityRole="button"
      style={styles.nemesis}
    >
      <View style={styles.nemesisText}>
        <Text style={styles.nemesisLabel}>Nemesis</Text>
        <Text style={styles.nemesisLine} numberOfLines={2}>{line}</Text>
      </View>
      <Text style={styles.nemesisCta}>Head to head →</Text>
    </Pressable>
  );
}

function describeError(err: ApiError): string {
  if (err.body && typeof err.body === "object" && "error" in err.body) {
    return String((err.body as { error: unknown }).error);
  }
  return `Something went wrong (${err.status}).`;
}

function ScoreBox({ name, value, tone }: { name: string; value: number; tone: "accent" | "paper" }) {
  return (
    <View style={styles.scoreBox}>
      <Text style={styles.scoreName} numberOfLines={1}>{name}</Text>
      <Text style={[styles.scoreValue, tone === "accent" ? styles.scoreAccent : styles.scorePaper]}>
        {value >= 0 ? String(value).padStart(2, "0") : String(value)}
      </Text>
    </View>
  );
}

/**
 * One pick card. Tap an option to send the pick; tap the chosen option
 * again to clear it. "Closest" items get a numeric input that commits on
 * submit/blur. The lock toggle appears once the card has a pick — the
 * locked pick scores 2x, and locking one card clears the lock from any
 * other card this week (server handles the move; the optimistic patch
 * mirrors it so the UI stays consistent). All updates are optimistic:
 * the week cache is patched immediately and rolled back on error.
 */
function PickCard({
  item,
  disabled,
  meId,
  houseIds,
  canTalk,
  now,
}: {
  item: ApiItem;
  disabled: boolean;
  meId: string;
  houseIds: HouseIds;
  canTalk: boolean;
  now: number;
}) {
  const qc = useQueryClient();
  const [errorText, setErrorText] = useState<string | null>(null);
  const locked = item.locked || disabled;

  const mutation = useMutation({
    mutationFn: (next: PickPatch) => savePick({ item_id: item.id, ...next }),
    onMutate: async (next) => {
      setErrorText(null);
      await qc.cancelQueries({ queryKey: ["week", "current"] });
      const previous = qc.getQueryData<ApiWeek>(["week", "current"]);
      if (previous) {
        qc.setQueryData<ApiWeek>(["week", "current"], patchItemPick(previous, item.id, next));
      }
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["week", "current"], ctx.previous);
      setErrorText(err instanceof ApiError ? describeError(err) : "Couldn't save that pick.");
    },
    onSuccess: () => {
      // Server may have adjusted other items (lock reassignment). Pull the fresh week.
      qc.invalidateQueries({ queryKey: ["week", "current"] });
    },
  });

  const isClosest = item.type === "closest";
  const hasPick = isPicked(item.my_pick);
  const isLocked = item.my_pick?.is_lock === true;
  // Graded/void cards show the verdict instead of a lock chip.
  const lockChip =
    item.status !== "open" ? null :
    item.locked ? "LOCKED" :
    fmtLockChip(item.locks_at, now);

  return (
    <View style={[styles.card, isLocked && styles.cardIsLock]}>
      <View style={styles.cardTop}>
        <Text style={styles.cardType}>{item.points} pt · {item.type_label}{isLocked ? " · 2× LOCK" : ""}</Text>
        {lockChip ? <Text style={styles.lockChip}>{lockChip}</Text> : null}
      </View>
      <Text style={styles.cardPrompt}>{item.prompt}</Text>
      {item.note ? <Text style={styles.cardNote}>{item.note}</Text> : null}

      {isClosest ? (
        <ClosestInput
          current={item.my_pick?.guess ?? null}
          disabled={locked || mutation.isPending}
          onCommit={(n) => mutation.mutate(n === null && isLocked ? { guess: null, is_lock: false } : { guess: n })}
        />
      ) : (
        <View style={styles.optionsRow}>
          {item.options.map((o) => {
            const selected = item.my_pick?.choice === o.key;
            return (
              <Pressable
                key={o.key}
                disabled={locked || mutation.isPending}
                onPress={() => {
                  // Clearing a locked pick must also release the lock — server
                  // rejects a lock on an empty pick, so send both.
                  if (selected && isLocked) mutation.mutate({ choice: null, is_lock: false });
                  else mutation.mutate({ choice: selected ? null : o.key });
                }}
                style={[styles.optionBtn, selected && styles.optionBtnSelected, locked && styles.optionBtnLocked]}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]} numberOfLines={2}>
                  {o.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {hasPick && !locked ? (
        <Pressable
          onPress={() => mutation.mutate({ is_lock: !isLocked })}
          disabled={mutation.isPending}
          style={[styles.lockBtn, isLocked && styles.lockBtnActive]}
        >
          <Text style={[styles.lockBtnText, isLocked && styles.lockBtnTextActive]}>
            {isLocked ? "★ LOCKED · 2× POINTS" : "★ Lock of the Week · 2×"}
          </Text>
        </Pressable>
      ) : null}

      {errorText ? <Text style={styles.cardError}>{errorText}</Text> : null}

      {item.locked ? <PickReveal item={item} meId={meId} houseIds={houseIds} canTalk={canTalk} /> : null}
      {item.locked && item.result?.display ? (
        <Text style={styles.cardResult}>{item.result.display}</Text>
      ) : null}
    </View>
  );
}

function PickReveal({ item, meId, houseIds, canTalk }: { item: ApiItem; meId: string; houseIds: HouseIds; canTalk: boolean }) {
  const isClosest = item.type === "closest";
  const pick = item.my_pick;
  const points = item.my_points ?? 0;
  const result = item.status === "graded" ? item.result : null;
  const showVerdict = result !== null && isPicked(pick);
  // Closest winners are player ids we can't match here, so fall back to points.
  const called = isClosest
    ? points > 0
    : pick?.choice != null && !!result?.winners.includes(pick.choice);
  const pointsGlyph = points > 0 ? "✓ " : points < 0 ? "✗ " : "";
  const pointsText = `${pointsGlyph}${points < 0 ? points : `+${points}`} pt${pick?.is_lock ? " · 2× LOCK" : ""}`;

  // Agree/fade chip: choice items only, once both the viewer and Jaiye have picked.
  const myChoice = pick?.choice ?? null;
  const jaiyeChoice = item.house.jaiye?.choice ?? null;
  const fadeTone: "agree" | "fade" | "brag" | null =
    isClosest || myChoice === null || jaiyeChoice === null ? null :
    myChoice === jaiyeChoice ? "agree" :
    result && result.winners.includes(myChoice) && !result.winners.includes(jaiyeChoice) ? "brag" :
    "fade";

  return (
    <View style={styles.reveal}>
      {showVerdict ? (
        <View>
          {called ? (
            <View style={styles.verdictStamp}>
              <Text style={styles.verdictStampText}>CALLED IT ✓</Text>
            </View>
          ) : (
            <Text style={styles.verdictMiss}>Not this time.</Text>
          )}
          <Text
            style={[
              styles.verdictPoints,
              points > 0 ? styles.pointsWin : points < 0 ? styles.pointsLoss : styles.pointsFlat,
            ]}
          >
            {pointsText}
          </Text>
        </View>
      ) : null}

      <Text style={[styles.houseHeader, showVerdict && styles.houseHeaderSpaced]}>The House</Text>
      <View style={styles.houseRow}>
        <HouseCell name="Jaiye" pick={item.house.jaiye} item={item} playerId={houseIds.jaiye} />
        <HouseCell name="Remi" pick={item.house.remi} item={item} playerId={houseIds.remi} />
      </View>

      {fadeTone ? (
        <View style={[styles.fadeChip, fadeTone === "agree" ? styles.fadeChipAgree : fadeTone === "brag" ? styles.fadeChipBrag : styles.fadeChipFade]}>
          <Text style={[styles.fadeChipText, fadeTone === "agree" ? styles.fadeChipTextAgree : fadeTone === "brag" ? styles.fadeChipTextBrag : styles.fadeChipTextFade]}>
            {fadeTone === "agree" ? "You and Jaiye agree" : fadeTone === "brag" ? "You faded Jaiye ✓" : "You faded Jaiye"}
          </Text>
        </View>
      ) : null}

      {item.crowd ? <CrowdSummary crowd={item.crowd} options={item.options} isClosest={isClosest} /> : null}

      <TalkBlock item={item} meId={meId} canTalk={canTalk} />
    </View>
  );
}

function HouseCell({ name, pick, item, playerId }: { name: string; pick: ApiHousePick | null; item: ApiItem; playerId: string | null }) {
  const isClosest = item.type === "closest";
  const choice = pick?.choice ?? null;
  const guess = pick?.guess ?? null;
  const winners = item.status === "graded" ? item.result?.winners : undefined;

  let pickText: string | null = null;
  if (isClosest) {
    if (guess !== null) pickText = String(guess);
  } else if (choice !== null) {
    pickText = item.options.find((o) => o.key === choice)?.label ?? choice;
  }

  const outcome: "win" | "loss" | null =
    !isClosest && winners && choice !== null ? (winners.includes(choice) ? "win" : "loss") : null;
  const outcomeStyle = outcome === "win" ? styles.houseCellWin : outcome === "loss" ? styles.houseCellLoss : null;
  const talk = pick?.talk?.trim() ?? "";
  const isJaiye = name === "Jaiye";

  return (
    <View style={[styles.houseCell, outcomeStyle]}>
      <View style={styles.houseHead}>
        <Text style={styles.houseName}>{name}</Text>
        {outcome ? (
          <Text style={[styles.houseGlyph, outcome === "win" ? styles.pointsWin : styles.pointsLoss]}>
            {outcome === "win" ? "✓" : "✗"}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.housePick, pickText === null && styles.housePickEmpty]} numberOfLines={2}>
        {pickText ?? "—"}
      </Text>
      {talk !== "" ? (
        <View style={styles.houseTalkRow}>
          <View style={[styles.houseMono, isJaiye ? styles.houseMonoJaiye : styles.houseMonoRemi]}>
            <Text style={[styles.houseMonoText, isJaiye ? styles.houseMonoTextJaiye : styles.houseMonoTextRemi]}>
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.houseBubble}>
            <Text style={styles.houseBubbleText} numberOfLines={3}>{talk}</Text>
          </View>
        </View>
      ) : null}
      {item.locked && pick && playerId ? (
        <ReactionRow item={item} side={isJaiye ? "jaiye" : "remi"} playerId={playerId} pick={pick} />
      ) : null}
    </View>
  );
}

type HouseSide = "jaiye" | "remi";
type HouseIds = Record<HouseSide, string | null>;

// Mirrors lib/sportsbook/reactions.ts, which Metro can't reach from here. Keep keys and glyphs in sync.
const REACTIONS: ReadonlyArray<{ key: ReactionKey; emoji: string; label: string }> = [
  { key: "fire", emoji: "🔥", label: "Fire" },
  { key: "laugh", emoji: "😂", label: "Funny" },
  { key: "cold", emoji: "🥶", label: "Ice cold" },
  { key: "clown", emoji: "🤡", label: "Clown pick" },
  { key: "target", emoji: "🎯", label: "Called it" },
];

/** Five reaction chips under a house pick: tap to react, tap yours again to remove, tap another to swap. */
function ReactionRow({ item, side, playerId, pick }: { item: ApiItem; side: HouseSide; playerId: string; pick: ApiHousePick }) {
  const qc = useQueryClient();
  const [errorText, setErrorText] = useState<string | null>(null);
  const counts = pick.reactions ?? {};
  const mine = pick.my_reaction ?? null;

  const mutation = useMutation({
    // The server toggles each emoji on its own, so swapping means turning the old one off first.
    mutationFn: async (emoji: ReactionKey) => {
      if (mine && mine !== emoji) await react({ item_id: item.id, player_id: playerId, emoji: mine });
      return react({ item_id: item.id, player_id: playerId, emoji });
    },
    onMutate: async (emoji) => {
      setErrorText(null);
      await qc.cancelQueries({ queryKey: ["week", "current"] });
      const previous = qc.getQueryData<ApiWeek>(["week", "current"]);
      if (previous) {
        qc.setQueryData<ApiWeek>(["week", "current"], patchHouseReaction(previous, item.id, side, emoji));
      }
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["week", "current"], ctx.previous);
      setErrorText(err instanceof ApiError ? describeError(err) : "Couldn't save that reaction.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["week", "current"] });
    },
  });

  return (
    <View>
      <View style={styles.reactRow}>
        {REACTIONS.map((r) => {
          const count = counts[r.key] ?? 0;
          const selected = mine === r.key;
          return (
            <Pressable
              key={r.key}
              disabled={mutation.isPending}
              onPress={() => mutation.mutate(r.key)}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={r.label}
              accessibilityValue={count > 0 ? { text: String(count) } : undefined}
              accessibilityState={{ selected, disabled: mutation.isPending }}
              style={[styles.reactChip, selected && styles.reactChipMine, mutation.isPending && styles.optionBtnLocked]}
            >
              <Text style={styles.reactGlyph}>{r.emoji}</Text>
              {count > 0 ? <Text style={[styles.reactCount, selected && styles.reactCountMine]}>{count}</Text> : null}
            </Pressable>
          );
        })}
      </View>
      {errorText ? <Text style={styles.reactError}>{errorText}</Text> : null}
    </View>
  );
}

function CrowdSummary({
  crowd,
  options,
  isClosest,
}: {
  crowd: ApiCrowd;
  options: ApiOption[];
  isClosest: boolean;
}) {
  return (
    <View>
      <Text style={styles.crowdCount}>
        {crowd.total} {crowd.total === 1 ? "player" : "players"} picked
      </Text>
      {isClosest ? (
        crowd.avg !== null ? <Text style={styles.crowdLine}>Crowd average: {Math.round(crowd.avg)}</Text> : null
      ) : (
        <Text style={styles.crowdLine}>
          {options.map((o) => `${crowd.split[o.key] ?? 0}% ${o.label}`).join(" · ")}
        </Text>
      )}
    </View>
  );
}

type TalkLine = TalkLinesResponse["lines"][number];

/** Locked-item trash talk: the feed (includes my own line) plus a preset-only composer. */
function TalkBlock({ item, meId, canTalk }: { item: ApiItem; meId: string; canTalk: boolean }) {
  const { open } = usePlayerActions();
  const showComposer = canTalk && item.locked && isPicked(item.my_pick);
  const hasFeed = item.talk.length > 0;
  if (!hasFeed && !showComposer) return null;

  const myKey = item.talk.find((t) => t.player_id === meId)?.key ?? null;

  return (
    <View>
      {hasFeed ? (
        <>
          <Text style={[styles.houseHeader, styles.talkHeaderSpaced]}>Talk</Text>
          {item.talk.map((t) => {
            const mine = t.player_id === meId;
            const body = (
              <>
                <Text style={styles.talkName}>{mine ? "You" : t.display_name}</Text>
                {"  "}
                <Text style={[styles.talkText, mine && styles.talkTextMine]}>{t.text}</Text>
              </>
            );
            if (mine) return <Text key={t.player_id} style={styles.talkLine}>{body}</Text>;

            const openSheet = () =>
              open({ player_id: t.player_id, display_name: t.display_name, context: "talk", ref_id: item.id });
            return (
              <Pressable
                key={t.player_id}
                onLongPress={openSheet}
                delayLongPress={350}
                accessibilityHint="Long press for options"
                accessibilityActions={[{ name: "options", label: "Report or mute" }]}
                onAccessibilityAction={(e) => { if (e.nativeEvent.actionName === "options") openSheet(); }}
                style={styles.talkRow}
              >
                <Text style={styles.talkBody}>{body}</Text>
                <MoreButton onPress={openSheet} label={`Options for ${t.display_name}`} />
              </Pressable>
            );
          })}
        </>
      ) : null}
      {showComposer ? <TalkComposer item={item} meId={meId} myKey={myKey} /> : null}
    </View>
  );
}

function TalkComposer({ item, meId, myKey }: { item: ApiItem; meId: string; myKey: string | null }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const lines = useQuery({
    queryKey: ["talk", "lines"],
    queryFn: ({ signal }) => getTalkLines(signal),
    staleTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: (line: TalkLine | null) => postTalk({ item_id: item.id, key: line?.key ?? null }),
    onMutate: async (line) => {
      setErrorText(null);
      await qc.cancelQueries({ queryKey: ["week", "current"] });
      const previous = qc.getQueryData<ApiWeek>(["week", "current"]);
      if (previous) {
        qc.setQueryData<ApiWeek>(["week", "current"], patchItemTalk(previous, item.id, meId, line));
      }
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["week", "current"], ctx.previous);
      setErrorText(err instanceof ApiError ? describeError(err) : "Couldn't save that line.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["week", "current"] });
    },
  });

  // No preset list means nothing to pick from; the feed above still renders.
  if (lines.isError && !lines.data) return null;

  return (
    <View style={styles.talkComposer}>
      {!open ? (
        <Pressable onPress={() => setOpen(true)} style={styles.talkBtn}>
          <Text style={styles.talkBtnText}>{myKey ? "Change my line" : "Talk your talk"}</Text>
        </Pressable>
      ) : lines.data ? (
        <>
          <View style={styles.talkChips}>
            {lines.data.lines.map((l) => {
              const selected = l.key === myKey;
              return (
                <Pressable
                  key={l.key}
                  disabled={mutation.isPending}
                  onPress={() => {
                    setOpen(false);
                    mutation.mutate(selected ? null : l);
                  }}
                  style={[
                    styles.optionBtn,
                    styles.talkChip,
                    selected && styles.optionBtnSelected,
                    mutation.isPending && styles.optionBtnLocked,
                  ]}
                >
                  <Text style={[styles.optionText, styles.talkChipText, selected && styles.optionTextSelected]}>
                    {l.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable onPress={() => setOpen(false)} hitSlop={8} style={styles.talkCancel}>
            <Text style={styles.talkCancelText}>Never mind</Text>
          </Pressable>
        </>
      ) : (
        <ActivityIndicator color={colors.steel} size="small" style={styles.talkSpinner} />
      )}
      {errorText ? <Text style={styles.cardError}>{errorText}</Text> : null}
    </View>
  );
}

/** Numeric input for closest-guess items. Commits on Save/submit/blur if the value changed. */
function ClosestInput({
  current,
  disabled,
  onCommit,
}: {
  current: number | null;
  disabled: boolean;
  onCommit: (n: number | null) => void;
}) {
  const [draft, setDraft] = useState<string>(current == null ? "" : String(current));
  // Last value sent, so Save and the blur it triggers don't send twice.
  const sent = useRef<number | null | undefined>(undefined);
  // Reset local draft when server value changes (e.g. after invalidate).
  useEffect(() => {
    setDraft(current == null ? "" : String(current));
  }, [current]);
  useEffect(() => {
    if (!disabled) sent.current = undefined;
  }, [disabled]);

  const send = (n: number | null) => {
    if (sent.current === n) return;
    sent.current = n;
    onCommit(n);
  };

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === "") {
      if (current != null) send(null);
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0 || n > 999) {
      // Snap back to last saved value — server validation would reject anyway.
      setDraft(current == null ? "" : String(current));
      return;
    }
    const rounded = Math.round(n);
    if (rounded !== current) send(rounded);
  };

  // iOS number-pad has no Done key, so Save is the way out of the keyboard.
  const save = () => { commit(); Keyboard.dismiss(); };

  return (
    <View style={styles.guessRow}>
      <View style={styles.guessInline}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={save}
          onBlur={commit}
          editable={!disabled}
          placeholder="—"
          placeholderTextColor={colors.steel}
          keyboardType="number-pad"
          maxLength={3}
          returnKeyType="done"
          style={[styles.guessInput, disabled && styles.guessInputDisabled]}
        />
        <Pressable
          onPress={save}
          disabled={disabled}
          accessibilityRole="button"
          style={({ pressed }) => [styles.guessSave, pressed && styles.guessSavePressed, disabled && styles.guessInputDisabled]}
        >
          <Text style={styles.guessSaveText}>Save</Text>
        </Pressable>
      </View>
      <Text style={styles.guessHint}>Your number, 0 to 999.</Text>
    </View>
  );
}

/** Sticky footer: pick progress on the left, confirmed Submit on the right. */
function SubmitFooter({
  week,
  pickedOpen,
  openCount,
  ready,
  onHeight,
}: {
  week: number;
  pickedOpen: number;
  openCount: number;
  ready: boolean;
  onHeight: (h: number) => void;
}) {
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const [errorText, setErrorText] = useState<string | null>(null);
  const submit = useMutation({
    mutationFn: () => submitPicks({ week }),
    onMutate: () => setErrorText(null),
    onSuccess: () => {
      // Flip the flag now so the footer drops before the refetch lands.
      qc.setQueryData<ApiWeek>(["week", "current"], (prev) => (prev ? { ...prev, submitted: true } : prev));
      qc.invalidateQueries({ queryKey: ["week", "current"] });
    },
    onError: (err) => {
      setErrorText(err instanceof ApiError ? describeError(err) : "Couldn't submit. Try again.");
    },
  });

  const confirm = () =>
    showDialog("Submit your picks?", "They're final once submitted. Jaiye and Remi's picks show at tip-off.", [
      { text: "Cancel", style: "cancel" },
      { text: "Submit", onPress: () => submit.mutate() },
    ]);

  const blocked = !ready || submit.isPending;

  return (
    <View
      style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}
      onLayout={(e) => onHeight(e.nativeEvent.layout.height)}
    >
      <View style={styles.footerRow}>
        <Text style={styles.footerCount}>{pickedOpen} of {openCount} picked</Text>
        <Pressable
          onPress={confirm}
          disabled={blocked}
          accessibilityRole="button"
          accessibilityState={{ disabled: blocked }}
          style={({ pressed }) => [styles.submitBtn, pressed && styles.submitBtnPressed, blocked && styles.submitBtnDisabled]}
        >
          {submit.isPending
            ? <ActivityIndicator color={colors.ink} />
            : <Text style={styles.submitBtnText}>Submit picks</Text>}
        </Pressable>
      </View>
      {errorText ? <Text style={styles.submitError}>{errorText}</Text> : null}
    </View>
  );
}

type PickPatch = { choice?: string | null; guess?: number | null; is_lock?: boolean };

/**
 * Pure helper: patch a cached ApiWeek with a new choice/guess/is_lock on
 * one item. If next.is_lock is true, every OTHER item in the week has its
 * is_lock cleared — the server does the same thing when a lock moves.
 */
function patchItemPick(prev: ApiWeek, itemId: string, next: PickPatch): ApiWeek {
  const movingLock = next.is_lock === true;
  return {
    ...prev,
    items: prev.items.map((it) => {
      if (it.id !== itemId) {
        if (movingLock && it.my_pick?.is_lock) {
          return { ...it, my_pick: { ...it.my_pick, is_lock: false } };
        }
        return it;
      }
      const curr = it.my_pick ?? { choice: null, guess: null, is_lock: false };
      return {
        ...it,
        my_pick: {
          choice: next.choice !== undefined ? next.choice : curr.choice,
          guess: next.guess !== undefined ? next.guess : curr.guess,
          is_lock: next.is_lock !== undefined ? next.is_lock : curr.is_lock,
        },
      };
    }),
  };
}

/** Pure helper: replace the viewer's line in one item's talk feed. A null line removes it. */
function patchItemTalk(prev: ApiWeek, itemId: string, meId: string, line: TalkLine | null): ApiWeek {
  return {
    ...prev,
    items: prev.items.map((it) => {
      if (it.id !== itemId) return it;
      const others = it.talk.filter((t) => t.player_id !== meId);
      return {
        ...it,
        talk: line
          ? [...others, { player_id: meId, display_name: "You", key: line.key, text: line.text }]
          : others,
      };
    }),
  };
}

/** Pure helper: apply my reaction tap to one house pick. Same key removes it, a new key swaps it in. */
function patchHouseReaction(prev: ApiWeek, itemId: string, side: HouseSide, emoji: ReactionKey): ApiWeek {
  return {
    ...prev,
    items: prev.items.map((it) => {
      const hp = it.house[side];
      if (it.id !== itemId || !hp) return it;
      const old = hp.my_reaction ?? null;
      const reactions = { ...(hp.reactions ?? {}) };
      const bump = (k: ReactionKey, by: number) => { reactions[k] = Math.max(0, (reactions[k] ?? 0) + by); };
      if (old) bump(old, -1);
      if (old !== emoji) bump(emoji, 1);
      return { ...it, house: { ...it.house, [side]: { ...hp, reactions, my_reaction: old === emoji ? null : emoji } } };
    }),
  };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 20, paddingBottom: 48, alignItems: "stretch", alignSelf: "stretch" },
  header: { alignItems: "flex-start", marginBottom: 20 },
  eyebrow: {
    color: colors.accent,
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  title: { color: colors.paper, fontFamily: fonts.displayItalic, fontSize: 36, lineHeight: 38 },
  lockHint: { color: colors.steel, fontSize: 13, marginTop: 6 },
  scoreRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  scoreBox: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingVertical: 10,
    alignItems: "center",
  },
  scoreName: { color: colors.steel, fontFamily: fonts.label, fontSize: 12, letterSpacing: 2, textTransform: "uppercase" },
  scoreValue: { fontFamily: fonts.label, fontSize: 28, lineHeight: 32, marginTop: 4 },
  scoreAccent: { color: colors.accent },
  scorePaper: { color: colors.paper },
  boardLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.button,
  },
  boardLinkText: { flexShrink: 1, color: colors.paper, fontSize: 14 },
  boardLinkCta: { marginLeft: "auto", color: colors.accent, fontFamily: fonts.label, fontSize: 12, letterSpacing: 2, textTransform: "uppercase" },
  leagueLink: { marginTop: 8 },
  cornerLink: { marginTop: 8, minHeight: 44 },
  settingsLink: { marginTop: 24, minHeight: 44 },
  resultsLink: { marginBottom: 8, minHeight: 44, borderColor: colors.accent },
  nemesis: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    minHeight: 44,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
  },
  nemesisText: { flex: 1, minWidth: 0 },
  nemesisLabel: { color: colors.accent, fontFamily: fonts.label, fontSize: 12, letterSpacing: 2, textTransform: "uppercase" },
  nemesisLine: { color: colors.paper, fontSize: 15, lineHeight: 20, marginTop: 2 },
  nemesisCta: { flexShrink: 0, color: colors.accent, fontFamily: fonts.label, fontSize: 12, letterSpacing: 2, textTransform: "uppercase" },
  hero: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 14,
  },
  heroEyebrow: {
    color: colors.steel,
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  heroBig: { color: colors.paper, fontFamily: fonts.label, fontSize: 18, lineHeight: 24 },
  heroBigAccent: { color: colors.accent },
  heroBar: { height: 4, marginTop: 8, borderRadius: 2, backgroundColor: colors.line, overflow: "hidden" },
  heroBarFill: { height: 4, backgroundColor: colors.accent },
  heroLine: { color: colors.steel, fontSize: 13, lineHeight: 18, marginTop: 6 },
  heroWinner: { color: colors.paper, fontSize: 15, lineHeight: 20, marginTop: 6 },
  cards: { marginTop: 20, gap: 12 },
  ageCard: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 14,
  },
  ageLabel: { color: colors.steel, fontFamily: fonts.label, fontSize: 12, letterSpacing: 2, textTransform: "uppercase" },
  ageQuestion: { color: colors.paper, fontSize: 16, lineHeight: 22, marginTop: 6 },
  ageRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  ageBtn: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.button,
    backgroundColor: colors.ink,
  },
  ageBtnSelected: { borderColor: colors.accent, backgroundColor: colors.surface2 },
  ageBtnText: { color: colors.paper, fontSize: 16 },
  ageBtnTextSelected: { color: colors.paper, fontFamily: fonts.label, letterSpacing: 1 },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 14,
  },
  cardIsLock: { borderColor: colors.accent, borderWidth: 2 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardType: { flexShrink: 1, color: colors.accent, fontFamily: fonts.label, fontSize: 12, letterSpacing: 2 },
  lockChip: { flexShrink: 0, marginLeft: 8, color: colors.steel, fontFamily: fonts.label, fontSize: 12, letterSpacing: 1 },
  cardPrompt: { color: colors.paper, fontSize: 16, lineHeight: 22, marginTop: 8 },
  cardNote: { color: colors.steel, fontSize: 13, marginTop: 4, fontStyle: "italic" },
  optionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  optionBtn: {
    flexGrow: 1,
    flexBasis: "45%",
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.button,
    backgroundColor: colors.ink,
  },
  optionBtnSelected: { borderColor: colors.accent, backgroundColor: colors.surface2 },
  optionBtnLocked: { opacity: 0.6 },
  optionText: { color: colors.paper, fontSize: 15, textAlign: "center" },
  optionTextSelected: { color: colors.accent, fontFamily: fonts.label, letterSpacing: 1 },
  guessRow: { marginTop: 12 },
  guessInline: { flexDirection: "row", gap: 8 },
  guessInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.ink,
    color: colors.paper,
    paddingHorizontal: 12,
    fontSize: 20,
    fontFamily: fonts.label,
    letterSpacing: 2,
    borderRadius: radius.button,
    textAlign: "center",
  },
  guessInputDisabled: { opacity: 0.5 },
  guessSave: {
    minHeight: 48,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.button,
  },
  guessSavePressed: { backgroundColor: colors.surface2 },
  guessSaveText: { color: colors.accent, fontFamily: fonts.label, fontSize: 12, letterSpacing: 2, textTransform: "uppercase" },
  guessHint: { color: colors.steel, fontSize: 12, marginTop: 6 },
  lockBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.button,
    backgroundColor: colors.ink,
  },
  lockBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  lockBtnText: {
    color: colors.steel,
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  lockBtnTextActive: { color: colors.ink },
  cardError: { color: colors.loss, fontSize: 13, marginTop: 8 },
  cardResult: { color: colors.steel, fontSize: 13, marginTop: 6 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  footerCount: { flexShrink: 1, color: colors.paper, fontSize: 15 },
  submitBtn: {
    minHeight: 48,
    paddingHorizontal: 20,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.button,
  },
  submitBtnPressed: { backgroundColor: colors.paper },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    color: colors.ink,
    fontFamily: fonts.label,
    fontSize: 14,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  submitError: { color: colors.loss, fontSize: 14, marginTop: 10, textAlign: "center" },
  errorBox: { alignItems: "center", padding: 20 },
  errorText: { color: colors.paper, fontSize: 15, textAlign: "center" },
  retryBtn: {
    marginTop: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.button,
  },
  retryText: { color: colors.paper, fontSize: 14 },
  switchLink: { marginTop: 8, minHeight: 44, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  switchLinkText: { color: colors.steel, fontSize: 14, textDecorationLine: "underline" },
  reveal: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
  verdictStamp: {
    alignSelf: "flex-start",
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: radius.button,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  verdictStampText: { color: colors.accent, fontFamily: fonts.displayItalic, fontSize: 20, lineHeight: 24, letterSpacing: 1 },
  verdictMiss: { color: colors.steel, fontSize: 15 },
  verdictPoints: { fontFamily: fonts.label, fontSize: 14, letterSpacing: 1, marginTop: 6 },
  pointsWin: { color: colors.win },
  pointsLoss: { color: colors.loss },
  pointsFlat: { color: colors.steel },
  houseHeader: { color: colors.steel, fontFamily: fonts.label, fontSize: 12, letterSpacing: 2, textTransform: "uppercase" },
  houseHeaderSpaced: { marginTop: 14 },
  houseRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  houseCell: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.button,
    backgroundColor: colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  houseCellWin: { borderColor: colors.win },
  houseCellLoss: { borderColor: colors.loss },
  houseHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  houseName: { color: colors.steel, fontFamily: fonts.label, fontSize: 12, letterSpacing: 2, textTransform: "uppercase" },
  houseGlyph: { fontFamily: fonts.label, fontSize: 14 },
  housePick: { color: colors.paper, fontSize: 15, marginTop: 4 },
  housePickEmpty: { color: colors.steel },
  crowdCount: { color: colors.steel, fontSize: 12, marginTop: 12 },
  crowdLine: { color: colors.paper, fontSize: 13, lineHeight: 18, marginTop: 2 },
  houseTalkRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 6 },
  houseMono: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  houseMonoJaiye: { backgroundColor: colors.accent },
  houseMonoRemi: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line },
  houseMonoText: { fontFamily: fonts.label, fontSize: 12, lineHeight: 14 },
  houseMonoTextJaiye: { color: colors.ink },
  houseMonoTextRemi: { color: colors.paper },
  houseBubble: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface2,
    borderRadius: radius.button,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  houseBubbleText: { color: colors.paper, fontSize: 13 },
  reactRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  reactChip: {
    flexGrow: 1,
    minWidth: 36,
    height: 36,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.button,
    backgroundColor: colors.ink,
  },
  reactChipMine: { borderColor: colors.accent, backgroundColor: colors.surface2 },
  reactGlyph: { fontSize: 16 },
  reactCount: { color: colors.steel, fontFamily: fonts.label, fontSize: 12 },
  reactCountMine: { color: colors.accent },
  reactError: { color: colors.loss, fontSize: 12, marginTop: 6 },
  fadeChip: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: radius.button,
  },
  fadeChipAgree: { borderColor: colors.accent },
  fadeChipFade: { borderColor: colors.line },
  fadeChipBrag: { borderColor: colors.win },
  fadeChipText: { fontFamily: fonts.label, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  fadeChipTextAgree: { color: colors.accent },
  fadeChipTextFade: { color: colors.steel },
  fadeChipTextBrag: { color: colors.win },
  talkHeaderSpaced: { marginTop: 14 },
  talkLine: { marginTop: 6, lineHeight: 20 },
  talkRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  talkBody: { flex: 1, minWidth: 0, lineHeight: 20 },
  talkName: { color: colors.paper, fontFamily: fonts.label, fontSize: 12, letterSpacing: 1 },
  talkText: { color: colors.paper, fontSize: 14 },
  talkTextMine: { color: colors.accent },
  talkComposer: { marginTop: 10 },
  talkBtn: {
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.button,
    backgroundColor: colors.ink,
  },
  talkBtnText: { color: colors.paper, fontFamily: fonts.label, fontSize: 12, letterSpacing: 1 },
  talkChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  talkChip: { flexGrow: 0, flexBasis: "auto", maxWidth: "100%", minHeight: 44, paddingVertical: 8 },
  talkChipText: { fontSize: 13 },
  talkCancel: { alignSelf: "flex-start", marginTop: 10 },
  talkCancelText: { color: colors.steel, fontSize: 13, textDecorationLine: "underline" },
  talkSpinner: { alignSelf: "flex-start" },
});
