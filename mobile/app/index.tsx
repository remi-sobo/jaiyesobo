import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lockup } from "@/components/Lockup";
import { appApi, API_BASE_URL } from "@/lib/api";
import { colors, fonts, radius } from "@/lib/brand";
import type { TalkLinesResponse } from "@/lib/types";

/**
 * Starter screen — the "hello world" of the Phase 2 scaffold. It proves
 * three things end to end:
 *   1. Archivo + the brand lockup render natively (see <Lockup/>),
 *   2. The /api/app/v1 base URL resolves from app.json or the env var,
 *   3. The TanStack Query + fetch client against the real API returns
 *      the preset trash-talk lines (a public endpoint, no auth needed).
 * Flows (Join → This Week → Pick cards → Lock → Reveal → Trash talk →
 * Leagues → Jaiye's Corner → Profile) land in follow-up PRs, each
 * replacing a slice of this screen.
 */
export default function Starter() {
  const talk = useQuery({
    queryKey: ["talk-lines"],
    queryFn: ({ signal }) => appApi<TalkLinesResponse>("/talk/lines", { anonymous: true, signal }),
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Lockup h={56} />
        </View>

        <Text style={styles.eyebrow}>Phase 2 scaffold</Text>
        <Text style={styles.title}>Beat Jaiye & Remi.</Text>
        <Text style={styles.body}>
          The pipes are wired. Join and the pick cards land next. Below are the preset trash-talk lines from
          <Text style={styles.code}>{` ${API_BASE_URL}/talk/lines`}</Text>.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Preset lines</Text>
          {talk.isPending ? <Text style={styles.body}>Loading…</Text> : null}
          {talk.error ? <Text style={[styles.body, { color: colors.loss }]}>Error: {String(talk.error)}</Text> : null}
          {talk.data?.lines.map((line) => (
            <View key={line.key} style={styles.lineRow}>
              <Text style={styles.lineKey}>{line.key}</Text>
              <Text style={styles.lineText}>“{line.text}”</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  scroll: { padding: 20, paddingBottom: 48 },
  header: { marginBottom: 24, alignItems: "flex-start" },
  eyebrow: {
    color: colors.accent,
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    color: colors.paper,
    fontFamily: fonts.displayItalic,
    fontSize: 40,
    lineHeight: 44,
  },
  body: {
    color: colors.steel,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },
  code: {
    color: colors.paper,
    fontFamily: "Courier",
    fontSize: 13,
  },
  card: {
    marginTop: 32,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardLabel: {
    color: colors.accent,
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  lineRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  lineKey: {
    color: colors.steel,
    fontSize: 11,
    fontFamily: "Courier",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  lineText: {
    color: colors.paper,
    fontSize: 16,
    marginTop: 2,
  },
});
