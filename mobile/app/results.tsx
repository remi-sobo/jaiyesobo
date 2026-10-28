import { useQuery } from "@tanstack/react-query";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lockup } from "@/components/Lockup";
import { ApiError, clearToken } from "@/lib/api";
import { colors, fonts, radius } from "@/lib/brand";
import { getResults } from "@/lib/routes";
import type { ApiResults } from "@shared/types";

type Verdict = "sat_out" | "house" | "jaiye" | "remi" | "none";

const HERO: Record<Verdict, { text: string; color: string }> = {
  sat_out: { text: "You sat this one out", color: colors.steel },
  house: { text: "You beat the house", color: colors.accent },
  jaiye: { text: "You beat Jaiye", color: colors.accent },
  remi: { text: "You beat Remi", color: colors.accent },
  none: { text: "Jaiye got you", color: colors.paper },
};

const SHARE_VERDICT: Record<Verdict, string> = {
  sat_out: "Sat this one out",
  house: "You beat the house ✓",
  jaiye: "You beat Jaiye ✓",
  remi: "You beat Remi ✓",
  none: "Jaiye got me ✗",
};

const CHIP: Record<"W" | "L" | "T", { color: string; label: string }> = {
  W: { color: colors.win, label: "Win" },
  L: { color: colors.loss, label: "Loss" },
  T: { color: colors.steel, label: "Tie" },
};

/**
 * Monday results — the payoff for a graded week and the share moment.
 * /results/current by default, or /results/{season}/{week} when both params
 * are passed. The server computes everything; this screen only lays it out.
 */
export default function Results() {
  const { season, week } = useLocalSearchParams<{ season?: string; week?: string }>();
  const weekNum = week ? Number(week) : NaN;
  const ref = season && Number.isInteger(weekNum) ? { season, week: weekNum } : undefined;

  const q = useQuery({
    queryKey: ["results", season ?? "current", week ?? ""],
    queryFn: ({ signal }) => getResults(ref, signal),
    retry: (failureCount, err) =>
      !(err instanceof ApiError && (err.status === 401 || err.status === 404)) && failureCount < 2,
  });

  if (q.error instanceof ApiError && q.error.status === 401) {
    clearToken().catch(() => {});
    return <Redirect href="/join" />;
  }

  // 404 means no week is graded yet — a normal state, not a failure.
  const notGraded = q.error instanceof ApiError && q.error.status === 404;
  const errorText = q.error instanceof ApiError ? describeError(q.error) : "Can't reach Run It Back right now.";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => { q.refetch(); }} tintColor={colors.steel} />}
      >
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace(ref ? "/weeks" : "/"))}
          hitSlop={8}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>{ref ? "← Past weeks" : "← This Week"}</Text>
        </Pressable>
        <View style={styles.header}>
          <Lockup h={36} />
        </View>

        {q.data ? (
          <ResultsBody r={q.data} showPastWeeks={!ref && q.data.week > 1} />
        ) : notGraded ? (
          <Text style={styles.notice}>{errorText}</Text>
        ) : q.isError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorText}</Text>
            <Pressable onPress={() => { q.refetch(); }} style={styles.retryBtn}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        )}
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

function verdictOf(r: ApiResults): Verdict {
  if (r.scores.me === null) return "sat_out";
  if (r.you_beat.jaiye && r.you_beat.remi) return "house";
  if (r.you_beat.jaiye) return "jaiye";
  if (r.you_beat.remi) return "remi";
  return "none";
}

/** The hero's verdict wording, without the full stop. Past weeks rows reuse it. */
export function verdictLine(r: ApiResults): string {
  return HERO[verdictOf(r)].text;
}

function buildShareMessage(r: ApiResults): string {
  const lines = [`Run It Back Picks · Week ${r.week}`, SHARE_VERDICT[verdictOf(r)]];
  if (r.scores.me !== null) {
    lines.push(`${r.record.right}-${r.record.wrong} · ${r.scores.me} pts (Jaiye ${r.scores.jaiye}, Remi ${r.scores.remi})`);
  }
  if (r.lock) {
    lines.push(`Lock: ${r.lock.hit ? `✓ +${r.lock.points}` : `✗ ${r.lock.points}`}`);
  }
  if (r.best_call) {
    const { prompt, points, crowd_pct } = r.best_call;
    const crowd =
      crowd_pct === null ? "" : crowd_pct <= 50 ? `, only ${crowd_pct}% had it` : `, ${crowd_pct}% had it`;
    lines.push(`Best call: "${prompt}" +${points}${crowd}`);
  }
  lines.push("jaiyesobo.com/runitback");
  return lines.join("\n");
}

async function shareWeek(r: ApiResults) {
  try {
    await Share.share({ message: buildShareMessage(r) });
  } catch {
    // A share sheet that won't open isn't something the player can act on.
  }
}

function ResultsBody({ r, showPastWeeks }: { r: ApiResults; showPastWeeks: boolean }) {
  const hero = HERO[verdictOf(r)];
  const scoreLine = [
    ...(r.scores.me === null ? [] : [`You ${r.scores.me}`]),
    `Jaiye ${r.scores.jaiye}`,
    `Remi ${r.scores.remi}`,
  ].join(" · ");
  const noun = r.players === 1 ? "player" : "players";

  return (
    <>
      <Text style={styles.eyebrow}>{`Week ${r.week} results`}</Text>
      <Text style={[styles.hero, { color: hero.color }]}>{`${hero.text}.`}</Text>
      <Text style={styles.scoreLine}>{scoreLine}</Text>
      <Text style={styles.recordLine}>
        {`${r.record.right}-${r.record.wrong} · ${r.beat_jaiye.count} of ${r.players} ${noun} beat Jaiye · ${r.beat_remi.count} beat Remi`}
      </Text>

      {r.lock ? (
        <View style={styles.card}>
          <Text style={[styles.cardLabel, styles.lockLabel]}>★ Lock of the Week</Text>
          <Text style={styles.cardPrompt}>{r.lock.prompt}</Text>
          <Text style={[styles.cardResult, r.lock.hit ? styles.win : styles.loss]}>
            {r.lock.hit ? `✓ Hit · +${r.lock.points}` : `✗ Missed · ${r.lock.points}`}
          </Text>
        </View>
      ) : null}

      {r.best_call ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Best call</Text>
          <Text style={styles.cardPrompt}>{r.best_call.prompt}</Text>
          <Text style={[styles.cardResult, styles.win]}>{`+${r.best_call.points}`}</Text>
          {r.best_call.crowd_pct !== null ? (
            <Text style={styles.cardNote}>
              {r.best_call.crowd_pct <= 50
                ? `Only ${r.best_call.crowd_pct}% had this.`
                : `${r.best_call.crowd_pct}% had this.`}
            </Text>
          ) : null}
        </View>
      ) : null}

      {r.worst_miss ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Worst miss</Text>
          <Text style={styles.cardPrompt}>{r.worst_miss.prompt}</Text>
          <Text style={[styles.cardResult, styles.loss]}>{`${r.worst_miss.points}`}</Text>
        </View>
      ) : null}

      {r.rivals.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.label}>Head to head</Text>
          <View style={styles.list}>
            {r.rivals.map((rv, i) => (
              <Pressable
                key={rv.player_id}
                onPress={() => router.push({ pathname: "/rivals/[id]", params: { id: rv.player_id } })}
                accessibilityRole="button"
                style={({ pressed }) => [styles.row, i > 0 && styles.rowDivider, pressed && styles.rowPressed]}
              >
                <Text style={styles.rowName} numberOfLines={1}>{rv.display_name}</Text>
                <Text style={styles.rowValue}>{`${rv.me}–${rv.them}`}</Text>
                <View
                  accessible
                  accessibilityLabel={CHIP[rv.result].label}
                  style={[styles.chip, { borderColor: CHIP[rv.result].color }]}
                >
                  <Text style={[styles.chipText, { color: CHIP[rv.result].color }]}>{rv.result}</Text>
                </View>
                <Text style={styles.rowArrow}>→</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {r.leagues.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.label}>Your leagues</Text>
          <View style={styles.list}>
            {r.leagues.map((lg, i) => (
              <View key={lg.id} style={[styles.row, i > 0 && styles.rowDivider]}>
                <Text style={styles.rowName} numberOfLines={1}>{lg.name}</Text>
                <Text style={styles.rowValue}>{`#${lg.rank} of ${lg.of}`}</Text>
                <Movement rank={lg.rank} prev={lg.prev_rank} />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <Pressable
        onPress={() => { shareWeek(r); }}
        accessibilityRole="button"
        style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
      >
        <Text style={styles.primaryText}>Share my week</Text>
      </Pressable>

      {showPastWeeks ? (
        <Pressable onPress={() => router.push("/weeks")} accessibilityRole="button" style={styles.pastLink}>
          <Text style={styles.pastLinkText}>Past weeks</Text>
          <Text style={styles.pastLinkCta}>See all →</Text>
        </Pressable>
      ) : null}
    </>
  );
}

function Movement({ rank, prev }: { rank: number; prev: number | null }) {
  if (prev === null) return <Text style={[styles.move, styles.steel]}>new</Text>;
  if (rank < prev) {
    return (
      <Text style={[styles.move, styles.win]} accessibilityLabel={`Up ${prev - rank}`}>
        {`▲ ${prev - rank}`}
      </Text>
    );
  }
  if (rank > prev) {
    return (
      <Text style={[styles.move, styles.loss]} accessibilityLabel={`Down ${rank - prev}`}>
        {`▼ ${rank - prev}`}
      </Text>
    );
  }
  return <Text style={[styles.move, styles.steel]} accessibilityLabel="No change">—</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  scroll: { padding: 20, paddingBottom: 48 },
  backBtn: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  backText: { color: colors.steel, fontSize: 14 },
  header: { alignItems: "flex-start", marginTop: 4, marginBottom: 20 },
  eyebrow: {
    color: colors.accent,
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  hero: { fontFamily: fonts.displayItalic, fontSize: 36, lineHeight: 38 },
  scoreLine: { color: colors.paper, fontFamily: fonts.label, fontSize: 14, marginTop: 10 },
  recordLine: { color: colors.steel, fontSize: 14, marginTop: 8 },
  win: { color: colors.win },
  loss: { color: colors.loss },
  steel: { color: colors.steel },
  card: {
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
  },
  cardLabel: {
    color: colors.steel,
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  lockLabel: { color: colors.accent },
  cardPrompt: { color: colors.paper, fontSize: 15 },
  cardResult: { fontFamily: fonts.label, fontSize: 14, marginTop: 8 },
  cardNote: { color: colors.steel, fontSize: 13, marginTop: 4 },
  section: { marginTop: 28 },
  label: {
    color: colors.steel,
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  list: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  rowPressed: { backgroundColor: colors.surface2 },
  rowArrow: { color: colors.steel, fontSize: 14 },
  rowName: { flex: 1, minWidth: 0, color: colors.paper, fontSize: 15 },
  rowValue: { color: colors.paper, fontFamily: fonts.label, fontSize: 14 },
  chip: {
    minWidth: 28,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.button,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chipText: { fontFamily: fonts.label, fontSize: 12 },
  move: { minWidth: 44, textAlign: "right", fontFamily: fonts.label, fontSize: 14 },
  primary: {
    minHeight: 56,
    marginTop: 28,
    paddingHorizontal: 24,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.button,
  },
  primaryPressed: { backgroundColor: colors.paper },
  primaryText: {
    color: colors.ink,
    fontFamily: fonts.label,
    fontSize: 14,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  pastLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 44,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.button,
  },
  pastLinkText: { flexShrink: 1, color: colors.paper, fontSize: 14 },
  pastLinkCta: { marginLeft: "auto", color: colors.accent, fontFamily: fonts.label, fontSize: 12, letterSpacing: 2, textTransform: "uppercase" },
  notice: { color: colors.steel, fontSize: 15, textAlign: "center", marginTop: 24 },
  loading: { alignItems: "center", paddingVertical: 48 },
  errorBox: { alignItems: "center", padding: 20, marginTop: 24 },
  errorText: { color: colors.paper, fontSize: 15, textAlign: "center" },
  retryBtn: {
    marginTop: 12,
    minHeight: 44,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    borderRadius: radius.button,
  },
  retryText: { color: colors.paper, fontSize: 14 },
});
