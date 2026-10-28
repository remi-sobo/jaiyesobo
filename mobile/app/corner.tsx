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
import { getCurrentWeek, getRecap } from "@/lib/routes";
import type { ApiHousePick, ApiItem, RecapResponse } from "@shared/types";

const retryUnlessUnauthorized = (failureCount: number, err: Error) =>
  !(err instanceof ApiError && err.status === 401) && failureCount < 2;

/**
 * Jaiye's Corner — his weekly recap plus a rundown of his picks and
 * one-liners. Reads /recap/current and /week/current (the same cache key
 * This Week uses, so the week is usually already warm). The recap's audio
 * is intentionally not played here.
 */
export default function Corner() {
  const recap = useQuery({
    queryKey: ["recap", "current"],
    queryFn: ({ signal }) => getRecap(signal),
    retry: retryUnlessUnauthorized,
  });

  const week = useQuery({
    queryKey: ["week", "current"],
    queryFn: ({ signal }) => getCurrentWeek(signal),
    retry: retryUnlessUnauthorized,
  });

  const unauthorized = [recap.error, week.error].some((e) => e instanceof ApiError && e.status === 401);
  if (unauthorized) {
    clearToken().catch(() => {});
    return <Redirect href="/join" />;
  }

  const refetchAll = () => {
    recap.refetch();
    week.refetch();
  };

  const failure = recap.error ?? week.error;
  const errorText = failure instanceof ApiError ? describeError(failure) : "Can't reach Run It Back right now.";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={recap.isRefetching || week.isRefetching}
            onRefresh={refetchAll}
            tintColor={colors.steel}
          />
        }
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

        <Text style={styles.eyebrow}>Jaiye's Corner</Text>
        <Text style={styles.title}>Jaiye's take.</Text>

        {recap.data && week.data ? (
          <>
            <RecapSection recap={recap.data} />
            <View style={styles.picksSection}>
              <Text style={styles.label}>{`Jaiye's picks · Week ${week.data.number}`}</Text>
              {week.data.items.length > 0 ? (
                <View style={styles.pickList}>
                  {week.data.items.map((item) => (
                    <PickRow key={item.id} item={item} />
                  ))}
                </View>
              ) : (
                <Text style={styles.empty}>No picks posted yet.</Text>
              )}
            </View>
          </>
        ) : recap.isPending || week.isPending ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorText}</Text>
            <Pressable onPress={refetchAll} style={styles.retryBtn}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
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

function RecapSection({ recap }: { recap: RecapResponse }) {
  const paragraphs = (recap.text ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p !== "");

  return (
    <View style={styles.recapSection}>
      <Text style={styles.label}>{recap.week !== null ? `Week ${recap.week} recap` : "Recap"}</Text>
      {paragraphs.length > 0 ? (
        <View style={styles.paragraphs}>
          {paragraphs.map((p, i) => (
            <Text key={i} style={styles.paragraph}>{p}</Text>
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>Jaiye's writing it up. Check back after Sunday night.</Text>
      )}
    </View>
  );
}

function PickRow({ item }: { item: ApiItem }) {
  const pick = item.house.jaiye;
  const talk = pick?.talk?.trim() || null;

  return (
    <View style={styles.pickRow}>
      <View style={styles.pickCols}>
        <View style={styles.pickLeft}>
          <Text style={styles.pickPrompt} numberOfLines={2}>{item.prompt}</Text>
          <Text style={styles.pickMeta}>{`${item.type_label} · ${item.points} pt`}</Text>
        </View>
        <View style={styles.pickRight}>
          {pick === null ? (
            <Text style={styles.pickHidden}>Shows at tip-off</Text>
          ) : (
            <JaiyePick item={item} pick={pick} />
          )}
        </View>
      </View>
      {talk ? <Text style={styles.pickTalk}>{`"${talk}"`}</Text> : null}
    </View>
  );
}

function JaiyePick({ item, pick }: { item: ApiItem; pick: ApiHousePick }) {
  const isClosest = item.type === "closest";
  const text = isClosest
    ? pick.guess === null ? "—" : String(pick.guess)
    : item.options.find((o) => o.key === pick.choice)?.label ?? pick.choice ?? "—";

  // Closest winners are player ids, so only choice items get a verdict color.
  let outcome: "win" | "loss" | null = null;
  if (!isClosest && item.status === "graded" && pick.choice !== null) {
    outcome = item.result?.winners.includes(pick.choice) ? "win" : "loss";
  }

  return (
    <>
      <Text
        style={[
          styles.pickValue,
          outcome === "win" && styles.pickWin,
          outcome === "loss" && styles.pickLoss,
        ]}
      >
        {outcome === "win" ? `${text} ✓` : text}
      </Text>
      {pick.is_lock ? <Text style={styles.lockTag}>2× LOCK</Text> : null}
    </>
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
  label: {
    color: colors.steel,
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  recapSection: { marginTop: 24 },
  paragraphs: { gap: 12 },
  paragraph: { color: colors.paper, fontSize: 16, lineHeight: 24 },
  empty: { color: colors.steel, fontSize: 15 },
  picksSection: { marginTop: 28 },
  pickList: { gap: 8 },
  pickRow: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 12,
  },
  pickCols: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  pickLeft: { flex: 1, minWidth: 0 },
  pickPrompt: { color: colors.paper, fontSize: 14 },
  pickMeta: { color: colors.steel, fontFamily: fonts.label, fontSize: 11, letterSpacing: 1, marginTop: 4 },
  pickRight: { maxWidth: "45%", alignItems: "flex-end" },
  pickHidden: { color: colors.steel, fontSize: 12, fontStyle: "italic", textAlign: "right" },
  pickValue: { color: colors.accent, fontFamily: fonts.label, fontSize: 14, textAlign: "right" },
  pickWin: { color: colors.win },
  pickLoss: { color: colors.loss },
  lockTag: { color: colors.accent, fontFamily: fonts.label, fontSize: 10, letterSpacing: 1, marginTop: 4 },
  pickTalk: { color: colors.steel, fontSize: 13, fontStyle: "italic", marginTop: 8 },
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
