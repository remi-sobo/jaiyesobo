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
import { getCurrentWeek, getMe, savePick, submitPicks } from "@/lib/routes";
import type { ApiItem, ApiWeek } from "@shared/types";

/**
 * This Week — the home of the signed-in app. Loads /me and /week/current,
 * shows the Beat Jaiye & Remi scoreboard, next lock, and interactive pick
 * cards. Tap an option to pick (or tap your selected option to clear);
 * closest-guess items get a numeric input that commits on blur. Lock of
 * the Week, Reveal and trash talk land in follow-up PRs.
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

  return <ThisWeekBody week={week.data} meName={me.data.player.display_name} meCode={me.data.player.code} />;
}

function ThisWeekBody({
  week,
  meName,
  meCode,
}: {
  week: ApiWeek;
  meName: string;
  meCode: string | null;
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
            <PickCard key={item.id} item={item} disabled={week.submitted || week.status !== "open"} />
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
 * submit/blur. Updates are optimistic — the week cache is patched
 * immediately so the UI feels instant, and rolled back if the save fails.
 */
function PickCard({ item, disabled }: { item: ApiItem; disabled: boolean }) {
  const qc = useQueryClient();
  const [errorText, setErrorText] = useState<string | null>(null);
  const locked = item.locked || disabled;

  const mutation = useMutation({
    mutationFn: (next: { choice?: string | null; guess?: number | null }) =>
      savePick({ item_id: item.id, ...next }),
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
  const choiceLabel = item.my_pick?.choice
    ? item.options.find((o) => o.key === item.my_pick!.choice)?.label ?? item.my_pick.choice
    : null;

  return (
    <View style={[styles.card, locked && styles.cardLocked]}>
      <View style={styles.cardTop}>
        <Text style={styles.cardType}>{item.points} pt · {item.type_label}</Text>
        {item.my_pick?.is_lock ? <Text style={styles.cardLockBadge}>LOCK</Text> : null}
      </View>
      <Text style={styles.cardPrompt}>{item.prompt}</Text>
      {item.note ? <Text style={styles.cardNote}>{item.note}</Text> : null}

      {isClosest ? (
        <ClosestInput
          current={item.my_pick?.guess ?? null}
          disabled={locked || mutation.isPending}
          onCommit={(n) => mutation.mutate({ guess: n })}
        />
      ) : (
        <View style={styles.optionsRow}>
          {item.options.map((o) => {
            const selected = item.my_pick?.choice === o.key;
            return (
              <Pressable
                key={o.key}
                disabled={locked || mutation.isPending}
                onPress={() => mutation.mutate({ choice: selected ? null : o.key })}
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

      {errorText ? <Text style={styles.cardError}>{errorText}</Text> : null}

      {locked && !isClosest && choiceLabel ? (
        <Text style={styles.cardPicked}>Your pick: <Text style={styles.cardPickedValue}>{choiceLabel}</Text></Text>
      ) : null}
      {item.locked && item.result?.display ? (
        <Text style={styles.cardResult}>{item.result.display}</Text>
      ) : null}
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

/** Pure helper: patch a cached ApiWeek with a new choice/guess on one item. */
function patchItemPick(
  prev: ApiWeek,
  itemId: string,
  next: { choice?: string | null; guess?: number | null },
): ApiWeek {
  return {
    ...prev,
    items: prev.items.map((it) => {
      if (it.id !== itemId) return it;
      const curr = it.my_pick ?? { choice: null, guess: null, is_lock: false };
      return {
        ...it,
        my_pick: {
          choice: next.choice !== undefined ? next.choice : curr.choice,
          guess: next.guess !== undefined ? next.guess : curr.guess,
          is_lock: curr.is_lock,
        },
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
  cardLocked: { opacity: 0.75 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardType: { color: colors.accent, fontFamily: fonts.label, fontSize: 11, letterSpacing: 2 },
  cardLockBadge: {
    color: colors.ink,
    backgroundColor: colors.accent,
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
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
  cardError: { color: colors.loss, fontSize: 13, marginTop: 8 },
  cardPicked: { color: colors.steel, fontSize: 14, marginTop: 10 },
  cardPickedValue: { color: colors.paper, fontFamily: fonts.label },
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
});
