import { useQuery } from "@tanstack/react-query";
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
import { getRivals } from "@/lib/routes";
import type { ApiRival } from "@shared/types";

/**
 * Rivals — your season record against Jaiye, Remi and the people you play
 * with. The server builds the list; each row opens the week-by-week view.
 */
export default function Rivals() {
  const q = useQuery({
    queryKey: ["rivals"],
    queryFn: ({ signal }) => getRivals(signal),
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

        <Text style={styles.eyebrow}>Rivalries</Text>
        <Text style={styles.title}>Your rivals.</Text>

        {q.data ? (
          q.data.rivals.length === 0 ? (
            <Text style={styles.empty}>Rivalries build as weeks get graded. Pick, then come back Monday.</Text>
          ) : (
            <View style={styles.rows}>
              {q.data.rivals.map((rival) => (
                <RivalRow key={rival.player_id} rival={rival} />
              ))}
            </View>
          )
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

function RivalRow({ rival }: { rival: ApiRival }) {
  const isHouse = rival.kind !== "challenger";
  const winning = rival.streak > 0;
  const streakColor = winning ? colors.win : colors.loss;

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/rivals/[id]", params: { id: rival.player_id } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowLeft}>
        <Text style={[styles.name, isHouse && styles.nameHouse]} numberOfLines={1}>{rival.display_name}</Text>
        <Text style={styles.meta}>
          {`${rival.wins}-${rival.losses}-${rival.ties}${rival.shared_league ? " · league mate" : ""}`}
        </Text>
      </View>
      {rival.streak !== 0 ? (
        <View
          accessible
          accessibilityLabel={`${winning ? "Won" : "Lost"} ${Math.abs(rival.streak)} in a row`}
          style={[styles.chip, { borderColor: streakColor }]}
        >
          <Text style={[styles.chipText, { color: streakColor }]}>
            {`${winning ? "W" : "L"}${Math.abs(rival.streak)}`}
          </Text>
        </View>
      ) : null}
    </Pressable>
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
  rows: { marginTop: 16, gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 44,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
  },
  rowPressed: { backgroundColor: colors.surface2 },
  rowLeft: { flex: 1, minWidth: 0 },
  name: { color: colors.paper, fontSize: 16 },
  nameHouse: { color: colors.accent },
  meta: { color: colors.steel, fontSize: 13, marginTop: 2 },
  chip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipText: { fontFamily: fonts.label, fontSize: 12 },
  empty: { color: colors.steel, fontSize: 15, textAlign: "center", marginTop: 32 },
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
