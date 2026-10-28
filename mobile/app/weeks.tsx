import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lockup } from "@/components/Lockup";
import { ApiError, clearToken } from "@/lib/api";
import { colors, fonts, radius } from "@/lib/brand";
import { getCurrentWeek, getMe, getResults } from "@/lib/routes";
import { verdictLine } from "./results";

const retryUnlessSignedOut = (failureCount: number, err: unknown) =>
  !(err instanceof ApiError && err.status === 401) && failureCount < 2;

/**
 * Past weeks — one row per graded week, newest first, each opening that week's
 * Results. There is no weeks-index route, so the list comes from the current
 * week number; every row loads its own summary and shares the Results cache.
 */
export default function Weeks() {
  const qc = useQueryClient();

  const me = useQuery({
    queryKey: ["me"],
    queryFn: ({ signal }) => getMe(signal),
    retry: retryUnlessSignedOut,
  });

  const week = useQuery({
    queryKey: ["week", "current"],
    queryFn: ({ signal }) => getCurrentWeek(signal),
    retry: retryUnlessSignedOut,
  });

  if ([me.error, week.error].some((e) => e instanceof ApiError && e.status === 401)) {
    clearToken().catch(() => {});
    return <Redirect href="/join" />;
  }

  const season = me.data?.season;
  const current = week.data;
  // Every earlier week, plus this one once it's graded.
  const lastGraded = current
    ? current.status === "graded" || current.status === "final"
      ? current.number
      : current.number - 1
    : 0;

  const err = me.error ?? week.error;
  const errorText = err instanceof ApiError ? describeError(err) : "Can't reach Run It Back right now.";

  const refresh = () => {
    me.refetch();
    week.refetch();
    if (season) qc.invalidateQueries({ queryKey: ["results", season] });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={me.isRefetching || week.isRefetching} onRefresh={refresh} tintColor={colors.steel} />}
      >
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/results"))}
          hitSlop={8}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>← Results</Text>
        </Pressable>
        <View style={styles.header}>
          <Lockup h={36} />
        </View>

        {season ? <Text style={styles.eyebrow}>{`Season ${season}`}</Text> : null}
        <Text style={styles.title}>Past weeks.</Text>

        {season && current ? (
          lastGraded < 1 ? (
            <Text style={styles.notice}>{"Nothing's graded yet. Come back Sunday night."}</Text>
          ) : (
            <View style={styles.list}>
              {Array.from({ length: lastGraded }, (_, i) => lastGraded - i).map((n) => (
                <WeekRow key={n} season={season} n={n} />
              ))}
            </View>
          )
        ) : me.isError || week.isError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorText}</Text>
            <Pressable
              onPress={() => {
                if (me.isError) me.refetch();
                if (week.isError) week.refetch();
              }}
              style={styles.retryBtn}
            >
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

function WeekRow({ season, n }: { season: string; n: number }) {
  // Same key the Results screen uses for a specific week, so the cache is shared.
  const q = useQuery({
    queryKey: ["results", season, String(n)],
    queryFn: ({ signal }) => getResults({ season, week: n }, signal),
    staleTime: 24 * 3_600_000,
    retry: false,
  });
  const r = q.data;

  if (!r) {
    return (
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.weekLabel}>{`Week ${n}`}</Text>
          {q.isError ? (
            <Text style={styles.notGraded}>Not graded yet</Text>
          ) : (
            <Text style={styles.waiting} accessibilityLabel="Loading">…</Text>
          )}
        </View>
      </View>
    );
  }

  const sides = [
    ...(r.scores.me === null ? [] : [{ name: "You", short: "You", pts: r.scores.me }]),
    { name: "Jaiye", short: "J", pts: r.scores.jaiye },
    { name: "Remi", short: "R", pts: r.scores.remi },
  ];
  const verdict = verdictLine(r);

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/results", params: { season, week: String(n) } })}
      accessibilityRole="button"
      accessibilityLabel={`Week ${n}. ${verdict}. ${sides.map((s) => `${s.name} ${s.pts}`).join(", ")}`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.left}>
        <Text style={styles.weekLabel}>{`Week ${n}`}</Text>
        <Text style={styles.verdict}>{verdict}</Text>
      </View>
      <Text style={styles.score}>{sides.map((s) => `${s.short} ${s.pts}`).join(" · ")}</Text>
      <Text style={styles.arrow}>→</Text>
    </Pressable>
  );
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
  title: { color: colors.paper, fontFamily: fonts.displayItalic, fontSize: 36, lineHeight: 38 },
  list: { marginTop: 20, gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
  },
  rowPressed: { backgroundColor: colors.surface2 },
  left: { flex: 1, minWidth: 0 },
  weekLabel: {
    color: colors.accent,
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  verdict: { color: colors.paper, fontSize: 15, marginTop: 2 },
  waiting: { color: colors.steel, fontSize: 15, marginTop: 2 },
  notGraded: { color: colors.steel, fontSize: 13, marginTop: 2 },
  score: { flexShrink: 0, color: colors.paper, fontFamily: fonts.label, fontSize: 14 },
  arrow: { color: colors.steel, fontSize: 14 },
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
