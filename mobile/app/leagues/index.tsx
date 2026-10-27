import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lockup } from "@/components/Lockup";
import { ApiError, clearToken } from "@/lib/api";
import { colors, fonts, radius } from "@/lib/brand";
import { createLeague, getLeagues, getMe, joinLeague } from "@/lib/routes";
import type { ApiLeague } from "@shared/types";

const retryUnlessSignedOut = (failureCount: number, err: unknown) =>
  !(err instanceof ApiError && err.status === 401) && failureCount < 2;

/**
 * My leagues — the viewer's private leagues, plus join-by-code and (with a
 * Season Pass) start-a-league. Needs /me for has_pass / can_talk.
 */
export default function Leagues() {
  const leagues = useQuery({
    queryKey: ["leagues"],
    queryFn: ({ signal }) => getLeagues(signal),
    retry: retryUnlessSignedOut,
  });

  const me = useQuery({
    queryKey: ["me"],
    queryFn: ({ signal }) => getMe(signal),
    retry: retryUnlessSignedOut,
  });

  if (
    (leagues.error instanceof ApiError && leagues.error.status === 401) ||
    (me.error instanceof ApiError && me.error.status === 401)
  ) {
    clearToken().catch(() => {});
    return <Redirect href="/join" />;
  }

  const errorText =
    leagues.error instanceof ApiError ? describeError(leagues.error) :
    me.error instanceof ApiError ? describeError(me.error) :
    "Can't reach Run It Back right now.";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
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

        <Text style={styles.eyebrow}>Private leagues</Text>
        <Text style={styles.title}>Your leagues.</Text>

        {leagues.data && me.data ? (
          <LeaguesBody
            leagues={leagues.data.leagues}
            canCreate={me.data.player.has_pass && me.data.player.can_talk}
          />
        ) : leagues.isPending || me.isPending ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorText}</Text>
            <Pressable onPress={() => { leagues.refetch(); me.refetch(); }} style={styles.retryBtn}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LeaguesBody({ leagues, canCreate }: { leagues: ApiLeague[]; canCreate: boolean }) {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const refreshAndOpen = (league: ApiLeague) => {
    qc.invalidateQueries({ queryKey: ["leagues"] });
    qc.invalidateQueries({ queryKey: ["me"] });
    openLeague(league);
  };

  const join = useMutation({
    mutationFn: () => joinLeague({ code: code.trim() }),
    onSuccess: ({ league }) => {
      setCode("");
      refreshAndOpen(league);
    },
  });

  const create = useMutation({
    mutationFn: () => createLeague({ name: name.trim() }),
    onSuccess: ({ league }) => {
      setName("");
      refreshAndOpen(league);
    },
  });

  const canJoin = code.trim().length > 0 && !join.isPending;
  const canStart = name.trim().length >= 3 && !create.isPending;
  const joinError = errorMessage(join.error, "Couldn't join that league. Try again.");
  const createError = errorMessage(create.error, "Couldn't start that league. Try again.");

  return (
    <View>
      {leagues.length === 0 ? (
        <Text style={styles.empty}>No leagues yet. Join one with a code or start your own.</Text>
      ) : (
        <View style={styles.rows}>
          {leagues.map((league) => (
            <Pressable
              key={league.id}
              onPress={() => openLeague(league)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.nameLine}>
                <Text style={styles.name}>{league.name}</Text>
                {league.is_commissioner ? <Text style={styles.tag}>COMMISSIONER</Text> : null}
              </View>
              <Text style={styles.count}>
                {league.members} {league.members === 1 ? "player" : "players"}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={[styles.eyebrow, styles.section]}>Join with a code</Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="WORD-1234"
        placeholderTextColor={colors.steel}
        maxLength={16}
        autoCapitalize="characters"
        autoCorrect={false}
        style={[styles.input, styles.codeInput]}
      />
      <Pressable
        disabled={!canJoin}
        onPress={() => join.mutate()}
        style={({ pressed }) => [styles.primary, !canJoin && styles.primaryDisabled, pressed && canJoin && styles.primaryPressed]}
      >
        {join.isPending ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.primaryText}>Join</Text>}
      </Pressable>
      {joinError ? <Text style={styles.error}>{joinError}</Text> : null}

      <Text style={[styles.eyebrow, styles.section]}>Start a league</Text>
      {canCreate ? (
        <>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="The Group Chat"
            placeholderTextColor={colors.steel}
            maxLength={30}
            style={styles.input}
          />
          <Pressable
            disabled={!canStart}
            onPress={() => create.mutate()}
            style={({ pressed }) => [styles.primary, !canStart && styles.primaryDisabled, pressed && canStart && styles.primaryPressed]}
          >
            {create.isPending ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.primaryText}>Create</Text>}
          </Pressable>
          {createError ? <Text style={styles.error}>{createError}</Text> : null}
        </>
      ) : (
        <Text style={styles.note}>Creating a league comes with the Season Pass.</Text>
      )}
    </View>
  );
}

function openLeague(league: ApiLeague) {
  router.push({ pathname: "/leagues/[id]", params: { id: league.id } });
}

function errorMessage(err: Error | null, fallback: string): string | null {
  if (!err) return null;
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
  title: { color: colors.paper, fontFamily: fonts.displayItalic, fontSize: 36, lineHeight: 38 },
  section: { marginTop: 32, marginBottom: 8 },
  rows: { marginTop: 16, gap: 8 },
  row: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
  },
  rowPressed: { backgroundColor: colors.surface2 },
  nameLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  name: { flexShrink: 1, color: colors.paper, fontSize: 16 },
  tag: { color: colors.accent, fontFamily: fonts.label, fontSize: 10, letterSpacing: 1 },
  count: { color: colors.steel, fontSize: 13, marginTop: 2 },
  empty: { color: colors.steel, fontSize: 15, marginTop: 16 },
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
  codeInput: { fontFamily: "Courier", letterSpacing: 2 },
  primary: {
    minHeight: 48,
    marginTop: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.button,
  },
  primaryDisabled: { opacity: 0.5 },
  primaryPressed: { backgroundColor: colors.paper },
  primaryText: {
    color: colors.ink,
    fontFamily: fonts.label,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  error: { color: colors.loss, fontSize: 14, marginTop: 12 },
  note: { color: colors.steel, fontSize: 14 },
  loading: { alignItems: "center", paddingVertical: 48 },
  errorBox: { alignItems: "center", padding: 20, marginTop: 24 },
  errorText: { color: colors.paper, fontSize: 15, textAlign: "center" },
  retryBtn: { marginTop: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.button },
  retryText: { color: colors.paper, fontSize: 14 },
});
