import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lockup } from "@/components/Lockup";
import { ApiError, clearToken } from "@/lib/api";
import { colors, fonts, radius } from "@/lib/brand";
import { showDialog } from "@/lib/dialog";
import { pushAvailable, registerForPush } from "@/lib/push";
import { deleteMe, getMe, patchMe, signOut } from "@/lib/routes";
import type { ApiPlayer, MeResponse, PushSettings } from "@shared/types";

const ALERTS: { key: keyof PushSettings; label: string }[] = [
  { key: "lock", label: "When picks lock" },
  { key: "reveal", label: "When picks reveal" },
  { key: "graded", label: "When the week is graded" },
  { key: "recap", label: "When Jaiye's recap drops" },
];

const ABOUT_LINKS = [
  { label: "Privacy", url: "https://jaiyesobo.com/runitback/privacy" },
  { label: "Terms", url: "https://jaiyesobo.com/runitback/terms" },
  { label: "For parents", url: "https://jaiyesobo.com/runitback/parents" },
  { label: "Support", url: "https://jaiyesobo.com/runitback/support" },
];

/**
 * Account settings: display name, player code, push alert toggles, sign out,
 * and account deletion. Server rules (name length, characters) surface inline
 * through describeError. Push token registration is best-effort and never
 * blocks the toggles from saving.
 */
export default function Settings() {
  const me = useQuery({
    queryKey: ["me"],
    queryFn: ({ signal }) => getMe(signal),
    retry: (failureCount, err) => !(err instanceof ApiError && err.status === 401) && failureCount < 2,
  });

  if (me.error instanceof ApiError && me.error.status === 401) {
    clearToken().catch(() => {});
    return <Redirect href="/join" />;
  }

  const errorText = me.error instanceof ApiError ? describeError(me.error) : "Can't reach Run It Back right now.";

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
        <Text style={styles.eyebrow}>Account</Text>
        <Text style={styles.title}>Settings.</Text>

        {me.data ? (
          <SettingsBody player={me.data.player} />
        ) : me.isError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorText}</Text>
            <Pressable onPress={() => { me.refetch(); }} style={styles.retryBtn}>
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

function SettingsBody({ player }: { player: ApiPlayer }) {
  const qc = useQueryClient();

  const leaveAccount = async () => {
    await clearToken();
    qc.clear();
    router.replace("/join");
  };

  // Best effort: push off and token revoked server-side first; a failure never traps the user here.
  const out = useMutation({
    mutationFn: async () => {
      await patchMe({ push_token: null }).catch(() => {});
      await signOut().catch(() => {});
    },
    onSuccess: leaveAccount,
  });

  // DELETE /me already drops this account's sessions and push token.
  const del = useMutation({ mutationFn: () => deleteMe(), onSuccess: leaveAccount });

  const confirmSignOut = () =>
    showDialog("Sign out?", "You'll need your player code to get back in.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", onPress: () => out.mutate() },
    ]);

  const confirmDelete = () =>
    showDialog("Delete your account?", "Your picks and your spot on every board go away. This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => del.mutate() },
    ]);

  return (
    <View>
      <NameSection name={player.display_name} />
      {player.code ? <CodeSection code={player.code} /> : null}
      <AlertsSection player={player} />

      {out.isPending ? (
        <View style={styles.signOutBtn}>
          <ActivityIndicator color={colors.steel} />
        </View>
      ) : (
        <Pressable onPress={confirmSignOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      )}

      {del.isPending ? (
        <View style={styles.deleteBtn}>
          <ActivityIndicator color={colors.loss} />
        </View>
      ) : (
        <Pressable onPress={confirmDelete} style={styles.deleteBtn}>
          <Text style={styles.deleteText}>Delete my account</Text>
        </Pressable>
      )}
      {del.error ? <Text style={styles.error}>{actionError(del.error, "Couldn't delete your account. Try again.")}</Text> : null}

      <AboutSection />
    </View>
  );
}

function AboutSection() {
  return (
    <View>
      <Text style={styles.label}>About</Text>
      {ABOUT_LINKS.map((l) => (
        <Pressable
          key={l.label}
          accessibilityRole="link"
          onPress={() => { Linking.openURL(l.url).catch(() => {}); }}
          style={styles.aboutLink}
        >
          <Text style={styles.aboutText}>{l.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function NameSection({ name }: { name: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const save = useMutation({
    mutationFn: (displayName: string) => patchMe({ display_name: displayName }),
    onSuccess: (data) => {
      qc.setQueryData(["me"], data);
      // The name shows on every board and league roster.
      qc.invalidateQueries({ queryKey: ["week"] });
      qc.invalidateQueries({ queryKey: ["board"] });
      qc.invalidateQueries({ queryKey: ["league"] });
      qc.invalidateQueries({ queryKey: ["leagues"] });
      setEditing(false);
    },
  });

  const trimmed = draft.trim();
  const canSave = trimmed.length >= 2 && trimmed !== name && !save.isPending;

  return (
    <View>
      <Text style={styles.label}>Your name</Text>
      {editing ? (
        <View>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Your name or nickname"
            placeholderTextColor={colors.steel}
            maxLength={20}
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => { if (canSave) save.mutate(trimmed); }}
            style={styles.input}
          />
          <View style={styles.editActions}>
            <Pressable
              disabled={!canSave}
              onPress={() => save.mutate(trimmed)}
              style={({ pressed }) => [styles.primary, !canSave && styles.primaryDisabled, pressed && canSave && styles.primaryPressed]}
            >
              {save.isPending ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.primaryText}>Save</Text>}
            </Pressable>
            <Pressable onPress={() => { setEditing(false); save.reset(); }} style={styles.linkBtn}>
              <Text style={styles.linkText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.nameRow}>
          <Text style={styles.nameText} numberOfLines={1}>{name}</Text>
          <Pressable
            onPress={() => { setDraft(name); save.reset(); setEditing(true); }}
            hitSlop={{ left: 8, right: 8 }}
            style={styles.linkBtn}
          >
            <Text style={styles.linkText}>Change</Text>
          </Pressable>
        </View>
      )}
      {save.error ? <Text style={styles.error}>{actionError(save.error, "Couldn't change your name. Try again.")}</Text> : null}
    </View>
  );
}

function CodeSection({ code }: { code: string }) {
  const share = async () => {
    try {
      await Share.share({ message: `My Run It Back Picks code: ${code}` });
    } catch {
      // Dismissed or unavailable; nothing to report.
    }
  };

  return (
    <View>
      <Text style={styles.label}>Your code</Text>
      <View style={styles.codeRow}>
        <Text style={styles.codeText} selectable>{code}</Text>
        <Pressable onPress={share} hitSlop={{ top: 8, bottom: 8 }} style={styles.shareBtn}>
          <Text style={styles.shareBtnText}>Share</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>Use it to play on another phone or on the website.</Text>
    </View>
  );
}

function AlertsSection({ player }: { player: ApiPlayer }) {
  const qc = useQueryClient();
  const canTalk = player.can_talk;
  const push = player.push_enabled;

  const toggle = useMutation({
    mutationFn: (patch: Partial<PushSettings>) => patchMe({ push_enabled: patch }),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["me"] });
      const previous = qc.getQueryData<MeResponse>(["me"]);
      if (previous) {
        qc.setQueryData<MeResponse>(["me"], {
          ...previous,
          player: { ...previous.player, push_enabled: { ...previous.player.push_enabled, ...patch } },
        });
      }
      return { previous };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.previous) qc.setQueryData(["me"], ctx.previous);
    },
    onSuccess: (data) => qc.setQueryData(["me"], data),
  });

  // Errors are swallowed on purpose: the toggles are saved either way.
  const { mutate: saveToken } = useMutation({
    mutationFn: (token: string) => patchMe({ push_token: token }),
    onSuccess: (data) => qc.setQueryData(["me"], data),
  });

  // Runs on mount and on the first toggle to on; the ref keeps it to one attempt.
  const attempted = useRef(false);
  const anyOn = ALERTS.some((a) => push[a.key]);
  useEffect(() => {
    if (!canTalk || !anyOn || attempted.current) return;
    attempted.current = true;
    registerForPush().then((token) => {
      if (token) saveToken(token);
    });
  }, [canTalk, anyOn, saveToken]);

  return (
    <View>
      <Text style={styles.label}>Alerts</Text>
      {!canTalk ? <Text style={styles.note}>Alerts aren&apos;t on for players under 13.</Text> : null}
      <View style={styles.switchList}>
        {ALERTS.map((a) => (
          <View key={a.key} style={styles.switchRow}>
            <Text style={styles.switchLabel}>{a.label}</Text>
            <Switch
              value={push[a.key]}
              onValueChange={(value) => toggle.mutate({ [a.key]: value })}
              disabled={!canTalk || toggle.isPending}
              trackColor={{ false: colors.line, true: colors.accent }}
              thumbColor={colors.paper}
              ios_backgroundColor={colors.line}
              accessibilityLabel={a.label}
            />
          </View>
        ))}
      </View>
      {toggle.error ? <Text style={styles.error}>{actionError(toggle.error, "Couldn't save that. Try again.")}</Text> : null}
      {canTalk && !pushAvailable() ? (
        <Text style={styles.hint}>Push alerts arrive with the App Store build. Your choices are saved.</Text>
      ) : null}
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
  title: { color: colors.paper, fontFamily: fonts.displayItalic, fontSize: 36, lineHeight: 38 },
  label: {
    color: colors.steel,
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 28,
    marginBottom: 8,
  },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  nameText: { flexShrink: 1, color: colors.paper, fontSize: 20 },
  linkBtn: { minHeight: 44, justifyContent: "center" },
  linkText: { color: colors.steel, fontSize: 14, textDecorationLine: "underline" },
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
  editActions: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 12 },
  primary: {
    minHeight: 48,
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
  codeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  codeText: { flexShrink: 1, color: colors.paper, fontFamily: "Courier", fontSize: 18, letterSpacing: 2 },
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
  hint: { color: colors.steel, fontSize: 12, marginTop: 8 },
  note: { color: colors.steel, fontSize: 13, marginBottom: 8 },
  switchList: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  switchLabel: { flex: 1, color: colors.paper, fontSize: 16 },
  error: { color: colors.loss, fontSize: 13, marginTop: 8 },
  signOutBtn: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", marginTop: 28 },
  signOutText: { color: colors.steel, fontSize: 15, textDecorationLine: "underline" },
  aboutLink: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  aboutText: { color: colors.steel, fontSize: 15, textDecorationLine: "underline" },
  deleteBtn: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", marginTop: 32 },
  deleteText: { color: colors.loss, fontSize: 15, textDecorationLine: "underline" },
  loading: { alignItems: "center", paddingVertical: 48 },
  errorBox: { alignItems: "center", padding: 20, marginTop: 24 },
  errorText: { color: colors.paper, fontSize: 15, textAlign: "center" },
  retryBtn: { marginTop: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.button },
  retryText: { color: colors.paper, fontSize: 14 },
});
