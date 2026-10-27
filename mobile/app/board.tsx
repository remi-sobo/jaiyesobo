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
import { BoardList } from "@/components/BoardList";
import { Lockup } from "@/components/Lockup";
import { ApiError, clearToken } from "@/lib/api";
import { colors, fonts, radius } from "@/lib/brand";
import { getBoard } from "@/lib/routes";

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
  loading: { alignItems: "center", paddingVertical: 48 },
  errorBox: { alignItems: "center", padding: 20, marginTop: 24 },
  errorText: { color: colors.paper, fontSize: 15, textAlign: "center" },
  retryBtn: { marginTop: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.button },
  retryText: { color: colors.paper, fontSize: 14 },
});
