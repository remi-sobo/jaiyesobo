import { useQuery } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import { useState } from "react";
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
import { getBoard } from "@/lib/routes";
import type { ApiBoard, ApiBoardRow } from "@shared/types";

type Span = "week" | "season";

const TABS: { key: Span; label: string }[] = [
  { key: "week", label: "This week" },
  { key: "season", label: "Season" },
];

export default function Board() {
  const [span, setSpan] = useState<Span>("week");

  const q = useQuery({
    queryKey: ["board", span],
    queryFn: ({ signal }) => getBoard({ span }, signal),
    retry: (failureCount, err) => !(err instanceof ApiError && err.status === 401) && failureCount < 2,
  });

  if (q.error instanceof ApiError && q.error.status === 401) {
    clearToken().catch(() => {});
    return <Redirect href="/join" />;
  }

  const errorText = q.error instanceof ApiError ? describeError(q.error) : "Can't reach Run It Back right now.";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => { q.refetch(); }} tintColor={colors.steel} />}
      >
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          hitSlop={8}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>← This Week</Text>
        </Pressable>
        <View style={styles.header}>
          <Lockup h={36} />
        </View>

        <Text style={styles.eyebrow}>Beat Jaiye & Remi</Text>
        <Text style={styles.title}>The board.</Text>

        <View style={styles.tabs}>
          {TABS.map((t) => {
            const selected = span === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setSpan(t.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={[styles.tab, selected && styles.tabSelected]}
              >
                <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {q.data ? (
          <BoardList board={q.data} span={span} />
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

function BoardList({ board, span }: { board: ApiBoard; span: Span }) {
  const me = board.me;
  const meInRows = me !== null && board.rows.some((r) => r.player_id === me.player_id);
  const empty = board.rows.length === 0;

  return (
    <View>
      {board.headline ? <Text style={styles.headline}>{board.headline}</Text> : null}

      {empty ? (
        <Text style={styles.empty}>Nobody's on the board yet. Make your picks.</Text>
      ) : (
        <View style={styles.rows}>
          {board.rows.map((row) => (
            <BoardRow key={row.player_id} row={row} span={span} />
          ))}
        </View>
      )}

      {me && !meInRows ? (
        <View style={[styles.rows, !empty && styles.pinned]}>
          {!empty ? <Text style={styles.divider}>···</Text> : null}
          <BoardRow row={me} span={span} />
        </View>
      ) : null}
    </View>
  );
}

function BoardRow({ row, span }: { row: ApiBoardRow; span: Span }) {
  const isHouse = row.kind !== "challenger";
  const stat = span === "week" ? `${row.correct}-${row.wrong}` : `${row.weeks_won} won · ${row.correct} played`;

  return (
    <View style={[styles.row, row.is_me && styles.rowMe, row.ghost && styles.rowGhost]}>
      <View style={styles.rowLeft}>
        <Text style={styles.rank}>#{row.rank}</Text>
        <View style={styles.nameLine}>
          <Text style={[styles.name, isHouse && styles.nameHouse]}>
            {row.display_name}
            {row.ghost ? <Text style={styles.ghostNote}> (would be here)</Text> : null}
          </Text>
          {row.is_me ? <Text style={styles.youTag}>YOU</Text> : null}
          {!isHouse && row.beat_jaiye ? <BeatChip letter="J" label="Beat Jaiye" /> : null}
          {!isHouse && row.beat_remi ? <BeatChip letter="R" label="Beat Remi" /> : null}
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.points}>{row.points}</Text>
        <Text style={styles.stat}>{stat}</Text>
      </View>
    </View>
  );
}

function BeatChip({ letter, label }: { letter: string; label: string }) {
  return (
    <View style={styles.chip} accessible accessibilityLabel={label}>
      <Text style={styles.chipText}>{letter}</Text>
    </View>
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
  title: { color: colors.paper, fontFamily: fonts.displayItalic, fontSize: 36, lineHeight: 38 },
  tabs: { flexDirection: "row", marginTop: 20, borderBottomWidth: 1, borderBottomColor: colors.line },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1, // sit on top of the strip's own bottom border
  },
  tabSelected: { borderBottomColor: colors.accent },
  tabText: { color: colors.steel, fontFamily: fonts.label, fontSize: 14, letterSpacing: 1 },
  tabTextSelected: { color: colors.accent },
  headline: { color: colors.paper, fontSize: 15, lineHeight: 21, marginTop: 16 },
  rows: { marginTop: 16, gap: 8 },
  pinned: { marginTop: 8 },
  divider: { color: colors.steel, fontFamily: fonts.label, fontSize: 16, letterSpacing: 4, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
  },
  rowMe: { borderColor: colors.accent },
  rowGhost: { opacity: 0.5 },
  rowLeft: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8 },
  rank: { minWidth: 28, color: colors.steel, fontFamily: fonts.label, fontSize: 12 },
  nameLine: { flex: 1, minWidth: 0, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  name: { flexShrink: 1, color: colors.paper, fontSize: 16 },
  nameHouse: { color: colors.accent },
  ghostNote: { color: colors.steel },
  youTag: { color: colors.accent, fontFamily: fonts.label, fontSize: 10, letterSpacing: 1 },
  chip: {
    borderWidth: 1,
    borderColor: colors.win,
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  chipText: { color: colors.win, fontFamily: fonts.label, fontSize: 10 },
  rowRight: { alignItems: "flex-end" },
  points: { color: colors.paper, fontFamily: fonts.label, fontSize: 20 },
  stat: { color: colors.steel, fontSize: 12, marginTop: 2 },
  empty: { color: colors.steel, fontSize: 15, textAlign: "center", marginTop: 32 },
  loading: { alignItems: "center", paddingVertical: 48 },
  errorBox: { alignItems: "center", padding: 20, marginTop: 24 },
  errorText: { color: colors.paper, fontSize: 15, textAlign: "center" },
  retryBtn: { marginTop: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.button },
  retryText: { color: colors.paper, fontSize: 14 },
});
