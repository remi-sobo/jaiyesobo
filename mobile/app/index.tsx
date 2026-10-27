import { useQuery } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lockup } from "@/components/Lockup";
import { ApiError, clearToken, getToken } from "@/lib/api";
import { colors, fonts, radius } from "@/lib/brand";
import { getCurrentWeek, getMe } from "@/lib/routes";
import type { ApiItem } from "@shared/types";

/**
 * This Week — the home of the signed-in app. Loads /me and /week/current,
 * shows the Beat Jaiye & Remi scoreboard, the next lock, and read-only
 * pick cards for the active slate. Tap-to-pick, Lock-of-the-Week, Reveal
 * and the trash-talk strip land in follow-up PRs that each replace a
 * slice of this view.
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

  const scoreboard = week.data.scores;
  const items = week.data.items;
  const picked = items.filter((i) => i.my_pick?.choice || i.my_pick?.guess != null).length;
  const total = items.length;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Lockup h={44} />
        </View>

        <Text style={styles.eyebrow}>Week {week.data.number} · {week.data.label}</Text>
        <Text style={styles.title}>Beat Jaiye & Remi.</Text>

        <View style={styles.scoreRow}>
          <ScoreBox name="Jaiye" value={scoreboard.jaiye} tone="accent" />
          <ScoreBox name="Remi" value={scoreboard.remi} tone="paper" />
          <ScoreBox name={me.data.player.display_name} value={scoreboard.me ?? 0} tone="paper" />
        </View>

        <Text style={styles.progress}>
          {picked} of {total} picked. {picked === total ? "Hit Submit when you're ready." : "Pick them all, then submit."}
        </Text>
        {week.data.next_lock_at ? (
          <Text style={styles.nextLock}>Next lock: {new Date(week.data.next_lock_at).toLocaleString()}</Text>
        ) : null}

        <View style={styles.cards}>
          {items.map((item) => (
            <PickCard key={item.id} item={item} />
          ))}
        </View>

        <View style={styles.account}>
          <Text style={styles.accountLabel}>Playing as</Text>
          <Text style={styles.accountName}>{me.data.player.display_name}</Text>
          {me.data.player.code ? (
            <Text style={styles.accountCode}>Your code: <Text style={styles.codeMono}>{me.data.player.code}</Text></Text>
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

/** Read-only summary of a pick card. Tap-to-pick lands in the next PR. */
function PickCard({ item }: { item: ApiItem }) {
  const myChoiceLabel = item.my_pick?.choice
    ? item.options.find((o) => o.key === item.my_pick!.choice)?.label ?? item.my_pick.choice
    : null;
  const myGuessLabel = item.my_pick?.guess != null ? String(item.my_pick.guess) : null;
  const picked = myChoiceLabel ?? myGuessLabel;
  return (
    <View style={[styles.card, item.locked && styles.cardLocked]}>
      <View style={styles.cardTop}>
        <Text style={styles.cardType}>{item.points} pt · {item.type_label}</Text>
        {item.my_pick?.is_lock ? <Text style={styles.cardLockBadge}>LOCK</Text> : null}
      </View>
      <Text style={styles.cardPrompt}>{item.prompt}</Text>
      {picked ? (
        <Text style={styles.cardPicked}>Your pick: <Text style={styles.cardPickedValue}>{picked}</Text></Text>
      ) : (
        <Text style={styles.cardUnpicked}>Not picked yet. Tap-to-pick lands next PR.</Text>
      )}
      {item.locked && item.result?.display ? (
        <Text style={styles.cardResult}>{item.result.display}</Text>
      ) : null}
    </View>
  );
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
  cardPicked: { color: colors.steel, fontSize: 14, marginTop: 10 },
  cardPickedValue: { color: colors.paper, fontFamily: fonts.label },
  cardUnpicked: { color: colors.steel, fontSize: 13, fontStyle: "italic", marginTop: 10 },
  cardResult: { color: colors.steel, fontSize: 13, marginTop: 6 },
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
