import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lockup } from "@/components/Lockup";
import { ApiError, clearToken, getToken } from "@/lib/api";
import { colors, fonts, radius } from "@/lib/brand";
import { getCurrentWeek, getMe, getTalkLines, postTalk, savePick, submitPicks } from "@/lib/routes";
import type { ApiCrowd, ApiHousePick, ApiItem, ApiOption, ApiWeek, TalkLinesResponse } from "@shared/types";

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
  });

  if (hasToken.data === false) return <Redirect href="/join" />;
  if (me.error instanceof ApiError && me.error.status === 401) {
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
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorText ?? "Loading went sideways. Pull down to refresh."}</Text>
          <Pressable onPress={() => { me.refetch(); week.refetch(); }} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try again</Text>
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
      meCode={me.data.player.code}
      canTalk={me.data.player.can_talk}
    />
  );
}

function ThisWeekBody({
  week,
  meId,
  meName,
  meCode,
  canTalk,
}: {
  week: ApiWeek;
  meId: string;
  meName: string;
  meCode: string | null;
  canTalk: boolean;
}) {
  const scoreboard = week.scores;
  const items = week.items;
  const picked = items.filter((i) => isPicked(i.my_pick)).length;
  const total = items.length;
  const canSubmit = picked === total && total > 0 && !week.submitted && week.status === "open";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Lockup h={44} />
        </View>

        <Text style={styles.eyebrow}>Week {week.number} · {week.label}</Text>
        <Text style={styles.title}>Beat Jaiye & Remi.</Text>

        <View style={styles.scoreRow}>
          <ScoreBox name="Jaiye" value={scoreboard.jaiye} tone="accent" />
          <ScoreBox name="Remi" value={scoreboard.remi} tone="paper" />
          <ScoreBox name={meName} value={scoreboard.me ?? 0} tone="paper" />
        </View>

        <Text style={styles.progress}>
          {week.submitted
            ? "Submitted. Sit back."
            : `${picked} of ${total} picked. ${picked === total ? "Hit Submit when you're ready." : "Pick them all, then submit."}`}
        </Text>
        {week.next_lock_at ? (
          <Text style={styles.nextLock}>Next lock: {new Date(week.next_lock_at).toLocaleString()}</Text>
        ) : null}

        <View style={styles.cards}>
          {items.map((item) => (
            <PickCard
              key={item.id}
              item={item}
              disabled={week.submitted || week.status !== "open"}
              meId={meId}
              canTalk={canTalk}
            />
          ))}
        </View>

        {canSubmit ? <SubmitButton week={week.number} /> : null}

        <View style={styles.account}>
          <Text style={styles.accountLabel}>Playing as</Text>
          <Text style={styles.accountName}>{meName}</Text>
          {meCode ? (
            <Text style={styles.accountCode}>Your code: <Text style={styles.codeMono}>{meCode}</Text></Text>
          ) : null}
          <Text style={styles.accountHint}>Save it so you can play on another phone.</Text>
          <Pressable
            onPress={async () => { await clearToken(); router.replace("/join"); }}
            style={styles.signOutBtn}
          >
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function isPicked(p: ApiItem["my_pick"]): boolean {
  if (!p) return false;
  return p.choice !== null || p.guess !== null;
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
  canTalk,
}: {
  item: ApiItem;
  disabled: boolean;
  meId: string;
  canTalk: boolean;
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

  return (
    <View style={[styles.card, isLocked && styles.cardIsLock]}>
      <View style={styles.cardTop}>
        <Text style={styles.cardType}>{item.points} pt · {item.type_label}{isLocked ? " · 2× LOCK" : ""}</Text>
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
            {isLocked ? "LOCKED · 2× POINTS" : "Lock this pick (2×)"}
          </Text>
        </Pressable>
      ) : null}

      {errorText ? <Text style={styles.cardError}>{errorText}</Text> : null}

      {item.locked ? <PickReveal item={item} meId={meId} canTalk={canTalk} /> : null}
      {item.locked && item.result?.display ? (
        <Text style={styles.cardResult}>{item.result.display}</Text>
      ) : null}
    </View>
  );
}

function PickReveal({ item, meId, canTalk }: { item: ApiItem; meId: string; canTalk: boolean }) {
  const isClosest = item.type === "closest";
  const pick = item.my_pick;
  const points = item.my_points ?? 0;
  const result = item.status === "graded" ? item.result : null;
  const showVerdict = result !== null && isPicked(pick);
  // Closest winners are player ids we can't match here, so fall back to points.
  const called = isClosest
    ? points > 0
    : pick?.choice != null && !!result?.winners.includes(pick.choice);
  const pointsText = `${points < 0 ? points : `+${points}`} pt${pick?.is_lock ? " · 2× LOCK" : ""}`;

  return (
    <View style={styles.reveal}>
      {showVerdict ? (
        <View>
          {called ? (
            <View style={styles.verdictStamp}>
              <Text style={styles.verdictStampText}>CALLED IT ✓</Text>
            </View>
          ) : (
            <Text style={styles.verdictMiss}>Missed.</Text>
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
        <HouseCell name="Jaiye" pick={item.house.jaiye} item={item} />
        <HouseCell name="Remi" pick={item.house.remi} item={item} />
      </View>

      {item.crowd ? <CrowdSummary crowd={item.crowd} options={item.options} isClosest={isClosest} /> : null}

      <TalkBlock item={item} meId={meId} canTalk={canTalk} />
    </View>
  );
}

function HouseCell({ name, pick, item }: { name: string; pick: ApiHousePick | null; item: ApiItem }) {
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

  const outcomeStyle =
    !isClosest && winners && choice !== null
      ? winners.includes(choice) ? styles.houseCellWin : styles.houseCellLoss
      : null;

  return (
    <View style={[styles.houseCell, outcomeStyle]}>
      <Text style={styles.houseName}>{name}</Text>
      <Text style={[styles.housePick, pickText === null && styles.housePickEmpty]} numberOfLines={2}>
        {pickText ?? "—"}
      </Text>
      {pick?.talk ? (
        <Text style={styles.houseQuote} numberOfLines={2}>{`"${pick.talk}"`}</Text>
      ) : null}
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
          {options.map((o) => `${o.label}: ${crowd.split[o.key] ?? 0}%`).join(", ")}
        </Text>
      )}
    </View>
  );
}

type TalkLine = TalkLinesResponse["lines"][number];

/** Locked-item trash talk: the feed (includes my own line) plus a preset-only composer. */
function TalkBlock({ item, meId, canTalk }: { item: ApiItem; meId: string; canTalk: boolean }) {
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
            return (
              <Text key={t.player_id} style={styles.talkLine}>
                <Text style={styles.talkName}>{mine ? "You" : t.display_name}</Text>
                {"  "}
                <Text style={[styles.talkText, mine && styles.talkTextMine]}>{t.text}</Text>
              </Text>
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

/** Numeric input for closest-guess items. Commits on submit/blur if the value changed. */
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
  // Reset local draft when server value changes (e.g. after invalidate).
  useEffect(() => {
    setDraft(current == null ? "" : String(current));
  }, [current]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === "") {
      if (current != null) onCommit(null);
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0 || n > 999) {
      // Snap back to last saved value — server validation would reject anyway.
      setDraft(current == null ? "" : String(current));
      return;
    }
    const rounded = Math.round(n);
    if (rounded !== current) onCommit(rounded);
  };

  return (
    <View style={styles.guessRow}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={() => { commit(); Keyboard.dismiss(); }}
        onBlur={commit}
        editable={!disabled}
        placeholder="—"
        placeholderTextColor={colors.steel}
        keyboardType="number-pad"
        maxLength={3}
        returnKeyType="done"
        style={[styles.guessInput, disabled && styles.guessInputDisabled]}
      />
      <Text style={styles.guessHint}>Enter a number 0–999.</Text>
    </View>
  );
}

function SubmitButton({ week }: { week: number }) {
  const qc = useQueryClient();
  const [errorText, setErrorText] = useState<string | null>(null);
  const submit = useMutation({
    mutationFn: () => submitPicks({ week }),
    onSuccess: () => {
      setErrorText(null);
      qc.invalidateQueries({ queryKey: ["week", "current"] });
    },
    onError: (err) => {
      setErrorText(err instanceof ApiError ? describeError(err) : "Couldn't submit. Try again.");
    },
  });

  return (
    <View style={styles.submitBox}>
      <Pressable
        onPress={() => submit.mutate()}
        disabled={submit.isPending}
        style={({ pressed }) => [styles.submitBtn, pressed && styles.submitBtnPressed, submit.isPending && styles.submitBtnDisabled]}
      >
        {submit.isPending
          ? <ActivityIndicator color={colors.ink} />
          : <Text style={styles.submitBtnText}>Lock in my picks</Text>}
      </Pressable>
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
  scoreName: { color: colors.steel, fontFamily: fonts.label, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" },
  scoreValue: { fontFamily: fonts.label, fontSize: 28, lineHeight: 32, marginTop: 4 },
  scoreAccent: { color: colors.accent },
  scorePaper: { color: colors.paper },
  progress: { color: colors.paper, fontSize: 15, marginTop: 18 },
  nextLock: { color: colors.steel, fontSize: 13, marginTop: 4 },
  cards: { marginTop: 20, gap: 12 },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 14,
  },
  cardIsLock: { borderColor: colors.accent, borderWidth: 2 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardType: { color: colors.accent, fontFamily: fonts.label, fontSize: 11, letterSpacing: 2 },
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
  guessInput: {
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
  guessHint: { color: colors.steel, fontSize: 12, marginTop: 6 },
  lockBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
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
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  lockBtnTextActive: { color: colors.ink },
  cardError: { color: colors.loss, fontSize: 13, marginTop: 8 },
  cardResult: { color: colors.steel, fontSize: 13, marginTop: 6 },
  submitBox: { marginTop: 24 },
  submitBtn: {
    minHeight: 56,
    paddingHorizontal: 24,
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
  account: {
    marginTop: 32,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  accountLabel: { color: colors.steel, fontFamily: fonts.label, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" },
  accountName: { color: colors.paper, fontSize: 20, marginTop: 4 },
  accountCode: { color: colors.steel, fontSize: 14, marginTop: 8 },
  codeMono: { color: colors.paper, fontFamily: "Courier" },
  accountHint: { color: colors.steel, fontSize: 12, marginTop: 4 },
  signOutBtn: { alignSelf: "flex-start", marginTop: 12 },
  signOutText: { color: colors.steel, fontSize: 14, textDecorationLine: "underline" },
  errorBox: { alignItems: "center", padding: 20 },
  errorText: { color: colors.paper, fontSize: 15, textAlign: "center" },
  retryBtn: { marginTop: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.button },
  retryText: { color: colors.paper, fontSize: 14 },
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
  houseHeader: { color: colors.steel, fontFamily: fonts.label, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" },
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
  houseName: { color: colors.steel, fontFamily: fonts.label, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" },
  housePick: { color: colors.paper, fontSize: 15, marginTop: 4 },
  housePickEmpty: { color: colors.steel },
  crowdCount: { color: colors.steel, fontSize: 12, marginTop: 12 },
  crowdLine: { color: colors.paper, fontSize: 13, lineHeight: 18, marginTop: 2 },
  houseQuote: { color: colors.steel, fontSize: 12, fontStyle: "italic", marginTop: 4 },
  talkHeaderSpaced: { marginTop: 14 },
  talkLine: { marginTop: 6, lineHeight: 20 },
  talkName: { color: colors.paper, fontFamily: fonts.label, fontSize: 12, letterSpacing: 1 },
  talkText: { color: colors.paper, fontSize: 14 },
  talkTextMine: { color: colors.accent },
  talkComposer: { marginTop: 10 },
  talkBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.button,
    backgroundColor: colors.ink,
  },
  talkBtnText: { color: colors.paper, fontFamily: fonts.label, fontSize: 12, letterSpacing: 1 },
  talkChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  talkChip: { flexGrow: 0, flexBasis: "auto", maxWidth: "100%", minHeight: 0, paddingVertical: 8 },
  talkChipText: { fontSize: 13 },
  talkCancel: { alignSelf: "flex-start", marginTop: 10 },
  talkCancelText: { color: colors.steel, fontSize: 13, textDecorationLine: "underline" },
  talkSpinner: { alignSelf: "flex-start" },
});
