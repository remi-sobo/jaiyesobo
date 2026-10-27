import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BoardList } from "@/components/BoardList";
import { Lockup } from "@/components/Lockup";
import { ApiError, clearToken } from "@/lib/api";
import { colors, fonts, radius } from "@/lib/brand";
import { archiveLeague, getLeague, leaveLeague, removeMember, renameLeague } from "@/lib/routes";
import type { ApiLeagueDetail, ApiLeagueMember } from "@shared/types";

type Span = "week" | "season";

const TABS: { key: Span; label: string }[] = [
  { key: "week", label: "This week" },
  { key: "season", label: "Season" },
];

/**
 * One private league: invite code + share, its week/season boards, the
 * member list, and commissioner (rename, remove, archive) or member (leave)
 * actions. The server enforces every rule; its messages surface inline.
 */
export default function League() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const q = useQuery({
    queryKey: ["league", id],
    queryFn: ({ signal }) => getLeague(id, signal),
    enabled: !!id,
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
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => { q.refetch(); }} tintColor={colors.steel} />}
      >
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/leagues"))}
          hitSlop={8}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>← Leagues</Text>
        </Pressable>
        <View style={styles.header}>
          <Lockup h={36} />
        </View>

        {q.data ? (
          <LeagueBody id={id} detail={q.data} />
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

function LeagueBody({ id, detail }: { id: string; detail: ApiLeagueDetail }) {
  const { league, members } = detail;
  const qc = useQueryClient();
  const [span, setSpan] = useState<Span>("week");
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState("");

  const refreshLeague = () => {
    qc.invalidateQueries({ queryKey: ["league", id] });
    qc.invalidateQueries({ queryKey: ["leagues"] });
  };

  const leaveScreen = () => {
    qc.invalidateQueries({ queryKey: ["leagues"] });
    qc.invalidateQueries({ queryKey: ["me"] });
    // Pop back to the Leagues screen already in the stack instead of stacking another.
    router.dismissTo("/leagues");
  };

  const remove = useMutation({
    mutationFn: (playerId: string) => removeMember(id, playerId),
    onSuccess: refreshLeague,
  });

  const rename = useMutation({
    mutationFn: () => renameLeague(id, { name: draft.trim() }),
    onSuccess: () => {
      refreshLeague();
      setRenaming(false);
    },
  });

  const archive = useMutation({ mutationFn: () => archiveLeague(id), onSuccess: leaveScreen });
  const leave = useMutation({ mutationFn: () => leaveLeague(id), onSuccess: leaveScreen });

  const share = async () => {
    try {
      await Share.share({ message: `Join my league "${league.name}" on Run It Back Picks: ${league.invite_url}` });
    } catch {
      // Dismissed or unavailable; nothing to report.
    }
  };

  const confirmRemove = (m: ApiLeagueMember) =>
    Alert.alert(`Remove ${m.display_name}?`, "They'll need you to add them back.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => remove.mutate(m.player_id) },
    ]);

  const confirmArchive = () =>
    Alert.alert(`Archive ${league.name}?`, "This hides the league for everyone. You can't undo it from the app.", [
      { text: "Cancel", style: "cancel" },
      { text: "Archive", style: "destructive", onPress: () => archive.mutate() },
    ]);

  const confirmLeave = () =>
    Alert.alert(`Leave ${league.name}?`, undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Leave", style: "destructive", onPress: () => leave.mutate() },
    ]);

  const trimmed = draft.trim();
  const canSave = trimmed.length >= 3 && trimmed !== league.name && !rename.isPending;
  const board = span === "week" ? detail.week : detail.season;

  return (
    <View>
      <Text style={styles.eyebrow}>Private league</Text>
      <Text style={styles.title} numberOfLines={2}>{league.name}</Text>

      <View style={styles.codeRow}>
        <Text style={styles.codeLine}>Code: <Text style={styles.codeMono}>{league.code}</Text></Text>
        <Pressable onPress={share} hitSlop={{ top: 8, bottom: 8 }} style={styles.shareBtn}>
          <Text style={styles.shareBtnText}>Share invite</Text>
        </Pressable>
      </View>

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

      {board ? (
        <BoardList board={board} span={span} />
      ) : (
        <Text style={styles.noWeek}>No week in play.</Text>
      )}

      <Text style={[styles.eyebrow, styles.section]}>Members · {members.length}</Text>
      <View style={styles.members}>
        {members.map((m) => (
          <View key={m.player_id} style={styles.memberRow}>
            <View style={styles.memberLeft}>
              <Text style={styles.memberName}>{m.display_name}</Text>
              {m.is_commissioner ? <Text style={styles.tag}>COMMISSIONER</Text> : null}
            </View>
            <View style={styles.memberRight}>
              {m.picked_this_week !== null ? (
                <Text style={[styles.marker, m.picked_this_week ? styles.markerPicked : styles.markerNotYet]}>
                  {m.picked_this_week ? "Picked" : "Not yet"}
                </Text>
              ) : null}
              {league.is_commissioner && !m.is_commissioner ? (
                <Pressable
                  disabled={remove.isPending}
                  onPress={() => confirmRemove(m)}
                  style={[styles.removeBtn, remove.isPending && styles.disabled]}
                >
                  <Text style={styles.linkText}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}
      </View>
      {remove.error ? (
        <Text style={styles.actionError}>{actionError(remove.error, "Couldn't remove them. Try again.")}</Text>
      ) : null}

      <View style={styles.footer}>
        {league.is_commissioner ? (
          <>
            {renaming ? (
              <View>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="League name"
                  placeholderTextColor={colors.steel}
                  maxLength={30}
                  autoFocus
                  style={styles.input}
                />
                <View style={styles.renameActions}>
                  <Pressable
                    disabled={!canSave}
                    onPress={() => rename.mutate()}
                    style={({ pressed }) => [styles.save, !canSave && styles.disabled, pressed && canSave && styles.savePressed]}
                  >
                    {rename.isPending ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.saveText}>Save</Text>}
                  </Pressable>
                  <Pressable
                    onPress={() => { setRenaming(false); rename.reset(); }}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.linkText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => { setDraft(league.name); rename.reset(); setRenaming(true); }}
                style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
              >
                <Text style={styles.actionRowText}>Rename league</Text>
              </Pressable>
            )}
            {rename.error ? (
              <Text style={styles.actionError}>{actionError(rename.error, "Couldn't rename it. Try again.")}</Text>
            ) : null}

            <Pressable
              disabled={archive.isPending}
              onPress={confirmArchive}
              style={[styles.dangerBtn, archive.isPending && styles.disabled]}
            >
              <Text style={styles.dangerText}>Archive league</Text>
            </Pressable>
            {archive.error ? (
              <Text style={styles.actionError}>{actionError(archive.error, "Couldn't archive it. Try again.")}</Text>
            ) : null}
          </>
        ) : (
          <>
            <Pressable
              disabled={leave.isPending}
              onPress={confirmLeave}
              style={[styles.dangerBtn, leave.isPending && styles.disabled]}
            >
              <Text style={styles.dangerText}>Leave league</Text>
            </Pressable>
            {leave.error ? (
              <Text style={styles.actionError}>{actionError(leave.error, "Couldn't leave. Try again.")}</Text>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

function actionError(err: Error, fallback: string): string {
  return err instanceof ApiError ? describeError(err) : fallback;
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
  codeRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 12 },
  codeLine: { color: colors.steel, fontSize: 14 },
  codeMono: { color: colors.paper, fontFamily: "Courier" },
  shareBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.button,
    backgroundColor: colors.ink,
  },
  shareBtnText: { color: colors.paper, fontFamily: fonts.label, fontSize: 12, letterSpacing: 1 },
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
  noWeek: { color: colors.steel, fontSize: 15, textAlign: "center", marginTop: 32 },
  section: { marginTop: 32, marginBottom: 8 },
  members: { gap: 8 },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
  },
  memberLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
  },
  memberName: { flexShrink: 1, color: colors.paper, fontSize: 15 },
  tag: { color: colors.accent, fontFamily: fonts.label, fontSize: 10, letterSpacing: 1 },
  memberRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  marker: { fontFamily: fonts.label, fontSize: 11, letterSpacing: 1 },
  markerPicked: { color: colors.win },
  markerNotYet: { color: colors.steel },
  removeBtn: { minHeight: 44, justifyContent: "center" },
  linkText: { color: colors.steel, fontSize: 13, textDecorationLine: "underline" },
  disabled: { opacity: 0.5 },
  footer: { marginTop: 32 },
  actionRow: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.button,
  },
  actionRowPressed: { backgroundColor: colors.surface2 },
  actionRowText: { color: colors.paper, fontSize: 15 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.paper,
    paddingHorizontal: 12,
    fontSize: 16,
    borderRadius: radius.button,
  },
  renameActions: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 12 },
  save: {
    minHeight: 44,
    paddingHorizontal: 24,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.button,
  },
  savePressed: { backgroundColor: colors.paper },
  saveText: {
    color: colors.ink,
    fontFamily: fonts.label,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  cancelBtn: { minHeight: 44, justifyContent: "center" },
  dangerBtn: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", marginTop: 12 },
  dangerText: { color: colors.loss, fontSize: 14, textDecorationLine: "underline" },
  actionError: { color: colors.loss, fontSize: 13, marginTop: 8 },
  loading: { alignItems: "center", paddingVertical: 48 },
  errorBox: { alignItems: "center", padding: 20, marginTop: 24 },
  errorText: { color: colors.paper, fontSize: 15, textAlign: "center" },
  retryBtn: { marginTop: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.button },
  retryText: { color: colors.paper, fontSize: 14 },
});
