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
import { getRival } from "@/lib/routes";
import type { ApiRivalDetail } from "@shared/types";

const CHIP: Record<"W" | "L" | "T", { color: string; label: string }> = {
  W: { color: colors.win, label: "Win" },
  L: { color: colors.loss, label: "Loss" },
  T: { color: colors.steel, label: "Tie" },
};

/**
 * Head to head — your record against one player and every graded week
 * between you, newest first. The server computes it; this lays it out.
 */
export default function Rival() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const q = useQuery({
    queryKey: ["rival", id],
    queryFn: ({ signal }) => getRival(id, signal),
    enabled: !!id,
    retry: (failureCount, err) =>
      !(err instanceof ApiError && (err.status === 401 || err.status === 404)) && failureCount < 2,
  });

  if (q.error instanceof ApiError && q.error.status === 401) {
    clearToken().catch(() => {});
    return <Redirect href="/join" />;
  }

  // 404 means the player is gone; retrying can't help.
  const notFound = q.error instanceof ApiError && q.error.status === 404;
  const errorText = q.error instanceof ApiError ? describeError(q.error) : "Can't reach Run It Back right now.";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => { q.refetch(); }} tintColor={colors.steel} />}
      >
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/rivals"))}
          hitSlop={8}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>← Rivals</Text>
        </Pressable>
        <View style={styles.header}>
          <Lockup h={36} />
        </View>

        {q.data ? (
          <RivalBody detail={q.data} />
        ) : q.isError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorText}</Text>
            {notFound ? null : (
              <Pressable onPress={() => { q.refetch(); }} style={styles.retryBtn}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            )}
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

function RivalBody({ detail }: { detail: ApiRivalDetail }) {
  const { rival } = detail;
  const record = `${rival.wins}-${rival.losses}-${rival.ties}`;
  const weeks = [...detail.weeks].sort((a, b) => b.week - a.week);
  const streakText =
    rival.streak > 0 ? `Won ${rival.streak} in a row` :
    rival.streak < 0 ? `Lost ${Math.abs(rival.streak)} in a row` :
    "No streak yet";

  const share = async () => {
    try {
      await Share.share({ message: `Me vs ${rival.display_name} on Run It Back Picks: ${record}. jaiyesobo.com/runitback` });
    } catch {
      // Dismissed or unavailable; nothing to report.
    }
  };

  return (
    <>
      <Text style={styles.eyebrow}>Head to head</Text>
      <Text style={[styles.title, rival.kind !== "challenger" && styles.titleHouse]} numberOfLines={2}>
        {rival.display_name}
      </Text>

      <Text style={styles.record}>{record}</Text>
      <Text style={styles.recordMeta}>{`${streakText}${rival.shared_league ? " · league mate" : ""}`}</Text>

      {weeks.length === 0 ? (
        <Text style={styles.empty}>Nothing graded yet between you two.</Text>
      ) : (
        <View style={styles.list}>
          {weeks.map((w, i) => (
            <View key={w.week} style={[styles.weekRow, i > 0 && styles.rowDivider]}>
              <Text style={styles.weekLabel}>{`Week ${w.week}`}</Text>
              <Text style={styles.weekScore}>{`${w.me}–${w.them}`}</Text>
              <View
                accessible
                accessibilityLabel={CHIP[w.result].label}
                style={[styles.chip, { borderColor: CHIP[w.result].color }]}
              >
                <Text style={[styles.chipText, { color: CHIP[w.result].color }]}>{w.result}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <Pressable
        onPress={() => { share(); }}
        accessibilityRole="button"
        style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
      >
        <Text style={styles.primaryText}>Share</Text>
      </Pressable>
    </>
  );
}

function describeError(err: ApiError): string {
  if (err.body && typeof err.body === "object" && "error" in err.body) {
    return String((err.body as { error: unknown }).error);
  }
  return `Something went wrong (${err.status}).`;
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
  title: { color: colors.paper, fontFamily: fonts.displayItalic, fontSize: 32, lineHeight: 34 },
  titleHouse: { color: colors.accent },
  record: { color: colors.paper, fontFamily: fonts.label, fontSize: 20, marginTop: 16 },
  recordMeta: { color: colors.steel, fontSize: 13, marginTop: 4 },
  list: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  weekRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  weekLabel: {
    flex: 1,
    minWidth: 0,
    color: colors.steel,
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  weekScore: { color: colors.paper, fontFamily: fonts.label, fontSize: 15 },
  chip: {
    minWidth: 28,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.button,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chipText: { fontFamily: fonts.label, fontSize: 12 },
  empty: { color: colors.steel, fontSize: 15, marginTop: 24 },
  primary: {
    minHeight: 48,
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
