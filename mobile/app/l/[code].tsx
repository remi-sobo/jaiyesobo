import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lockup } from "@/components/Lockup";
import { ApiError, clearToken, getToken } from "@/lib/api";
import { colors, fonts, radius } from "@/lib/brand";
import { getInvite, getLeagues, joinLeague } from "@/lib/routes";
import type { InviteResponse } from "@shared/types";

const retryUnlessSignedOut = (failureCount: number, err: unknown) =>
  !(err instanceof ApiError && err.status === 401) && failureCount < 2;

/**
 * League invite — "You've been challenged." Where an invite link lands:
 * `/runitback/app/l/<code>` on the site is this screen, and so is the website
 * invite page's "Open in the app" link. Anyone can see it, signed in or not,
 * so unlike the other screens it never redirects to /join.
 *
 * Loads the public invite (league name, players, featured week) and the
 * viewer's own leagues. Signed in: "Join this league", or "You're in." with a
 * way to the board if they already belong. Signed out: Join (new account) or
 * Restore (existing account), both of which come back here via `?invite=`.
 * A dead code gets the same "doesn't work anymore" copy as the website.
 */
export default function Invite() {
  const { code } = useLocalSearchParams<{ code: string }>();

  const invite = useQuery({
    queryKey: ["invite", code],
    queryFn: ({ signal }) => getInvite(code, signal),
    enabled: !!code,
    // A 404 is a dead code, not a flaky network: retrying only delays the answer.
    retry: (failureCount, err) => !(err instanceof ApiError && err.status === 404) && failureCount < 2,
  });

  if (invite.isPending) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  const dead = invite.error instanceof ApiError && invite.error.status === 404;
  const errorText =
    invite.error instanceof ApiError ? describeError(invite.error) : "Can't reach Run It Back right now.";

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Lockup h={44} />
        </View>

        {invite.data ? (
          <InviteBody code={code} invite={invite.data} />
        ) : dead ? (
          <View>
            <Text style={styles.title}>{"That invite doesn't work anymore."}</Text>
            <Text style={styles.body}>
              Ask whoever sent it for a new link. You can still play against Jaiye and Remi.
            </Text>
            <Pressable
              onPress={() => router.replace("/")}
              accessibilityRole="button"
              style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
            >
              <Text style={styles.primaryText}>Play this week</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorText}</Text>
            <Pressable onPress={() => { invite.refetch(); }} accessibilityRole="button" style={styles.retryBtn}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InviteBody({ code, invite }: { code: string; invite: InviteResponse }) {
  const { league, week } = invite;
  const meta = `${league.members} ${league.members === 1 ? "player" : "players"}${week !== null ? ` · Week ${week}` : ""} · Code ${league.code}`;

  return (
    <View>
      <Text style={styles.eyebrow}>League invite</Text>
      <Text style={styles.title}>{"You've been challenged."}</Text>

      <View style={styles.card}>
        <Text style={styles.leagueName}>{league.name}</Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>

      <Text style={styles.body}>
        A new slate of NBA picks every Monday. Everyone plays the same picks. Most points wins the week, and the board runs all season. Free. No money, ever.
      </Text>

      <InviteActions code={code} leagueCode={league.code} />
    </View>
  );
}

/** The buttons under the invite, by who is looking: signed out, a member already, or someone who can join. */
function InviteActions({ code, leagueCode }: { code: string; leagueCode: string }) {
  const qc = useQueryClient();

  const hasToken = useQuery({
    queryKey: ["session", "has-token"],
    queryFn: async () => (await getToken()) !== null,
    staleTime: 0,
  });

  const leagues = useQuery({
    queryKey: ["leagues"],
    queryFn: ({ signal }) => getLeagues(signal),
    enabled: hasToken.data === true,
    retry: retryUnlessSignedOut,
  });

  // The server disowned the token (revoked, account deleted). This screen
  // doesn't redirect, so clear it and fall through to the signed-out buttons.
  const tokenRejected = leagues.error instanceof ApiError && leagues.error.status === 401;
  useEffect(() => {
    if (!tokenRejected) return;
    clearToken().catch(() => {});
    qc.setQueryData(["session", "has-token"], false);
  }, [tokenRejected, qc]);

  const join = useMutation({
    mutationFn: () => joinLeague({ code: leagueCode }),
    onSuccess: ({ league }) => {
      qc.invalidateQueries({ queryKey: ["leagues"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      router.replace({ pathname: "/leagues/[id]", params: { id: league.id } });
    },
  });
  const joinError = errorMessage(join.error, "Couldn't join that league. Try again.");

  const signedIn = hasToken.data === true && !tokenRejected;
  if (hasToken.isPending || (signedIn && leagues.isPending)) {
    return (
      <View style={styles.actionsLoading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!signedIn) {
    return (
      <View>
        <Pressable
          onPress={() => router.push({ pathname: "/join", params: { invite: code } })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
        >
          <Text style={styles.primaryText}>Join to play</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push({ pathname: "/restore", params: { invite: code } })}
          accessibilityRole="button"
          style={styles.textBtn}
        >
          <Text style={styles.textBtnText}>I already have a code</Text>
        </Pressable>
      </View>
    );
  }

  const mine = leagues.data?.leagues.find((l) => l.code.toUpperCase() === leagueCode.toUpperCase());
  if (mine) {
    return (
      <View>
        <Text style={styles.youreIn}>{"You're in."}</Text>
        <Pressable
          onPress={() => router.replace({ pathname: "/leagues/[id]", params: { id: mine.id } })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
        >
          <Text style={styles.primaryText}>See the board</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <Pressable
        disabled={join.isPending}
        onPress={() => join.mutate()}
        accessibilityRole="button"
        accessibilityState={{ disabled: join.isPending }}
        style={({ pressed }) => [styles.primary, join.isPending && styles.primaryDisabled, pressed && !join.isPending && styles.primaryPressed]}
      >
        {join.isPending ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.primaryText}>Join this league</Text>}
      </Pressable>
      {joinError ? <Text style={styles.error}>{joinError}</Text> : null}
    </View>
  );
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
  safe: { flex: 1, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  screen: { flex: 1, backgroundColor: colors.ink },
  scroll: { padding: 20, paddingBottom: 48 },
  header: { alignItems: "flex-start", marginBottom: 20 },
  eyebrow: {
    color: colors.accent,
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  title: { color: colors.paper, fontFamily: fonts.displayItalic, fontSize: 40, lineHeight: 42 },
  card: {
    marginTop: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
  },
  leagueName: { color: colors.paper, fontFamily: fonts.label, fontSize: 20, lineHeight: 26 },
  meta: { color: colors.steel, fontFamily: "Courier", fontSize: 13, letterSpacing: 1, marginTop: 6 },
  body: { color: colors.steel, fontSize: 15, lineHeight: 22, marginTop: 16 },
  youreIn: { color: colors.accent, fontFamily: fonts.label, fontSize: 18, lineHeight: 24, marginTop: 24 },
  primary: {
    minHeight: 48,
    marginTop: 24,
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
  textBtn: { marginTop: 8, minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  textBtnText: { color: colors.steel, fontSize: 15, textDecorationLine: "underline" },
  error: { color: colors.loss, fontSize: 14, marginTop: 12 },
  actionsLoading: { alignItems: "center", paddingVertical: 32 },
  errorBox: { alignItems: "center", padding: 20, marginTop: 24 },
  errorText: { color: colors.paper, fontSize: 15, textAlign: "center" },
  retryBtn: {
    marginTop: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.button,
  },
  retryText: { color: colors.paper, fontSize: 14 },
});
