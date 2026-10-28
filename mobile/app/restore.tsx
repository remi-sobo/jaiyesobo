import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lockup } from "@/components/Lockup";
import { ApiError } from "@/lib/api";
import { colors, fonts, radius } from "@/lib/brand";
import { restoreSession } from "@/lib/routes";

/**
 * Bring an existing account onto this phone with its player code (like
 * HOOP-7342). Pairs with Join — Join issues the code, Restore moves the
 * account.
 */
export default function Restore() {
  const { invite } = useLocalSearchParams<{ invite?: string }>();
  const [code, setCode] = useState("");
  const qc = useQueryClient();

  const restore = useMutation({
    mutationFn: () => restoreSession({ code: code.trim().toUpperCase() }),
    onSuccess: () => {
      // Seed the cached gate so Home doesn't bounce back to Join on a stale `false`.
      qc.setQueryData(["session", "has-token"], true);
      qc.invalidateQueries();
      // Came from an invite link: go back to it (now signed in) instead of Home.
      if (typeof invite === "string" && invite.length > 0) router.replace({ pathname: "/l/[code]", params: { code: invite } });
      else router.replace("/");
    },
  });

  const canSubmit = /^[A-Z0-9]{3,}-\d{3,}$/.test(code.trim().toUpperCase()) && !restore.isPending;
  const errorText = restore.error instanceof ApiError
    ? (restore.error.body && typeof restore.error.body === "object" && "error" in restore.error.body
      ? String((restore.error.body as { error: unknown }).error)
      : `We couldn't find that code (${restore.error.status}).`)
    : restore.error
      ? "Couldn't look that up. Try again."
      : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Lockup h={48} />
      </View>

      <Text style={styles.title}>Already playing?</Text>
      <Text style={styles.sub}>Enter the player code from your other phone or the website. It looks like <Text style={styles.code}>HOOP-7342</Text>.</Text>

      <Text style={styles.label}>Player code</Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="HOOP-7342"
        placeholderTextColor={colors.steel}
        maxLength={16}
        autoCapitalize="characters"
        autoCorrect={false}
        style={styles.input}
      />

      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}

      <Pressable
        disabled={!canSubmit}
        onPress={() => restore.mutate()}
        style={({ pressed }) => [styles.primary, !canSubmit && styles.primaryDisabled, pressed && canSubmit && styles.primaryPressed]}
      >
        {restore.isPending ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.primaryText}>Bring my picks over</Text>}
      </Pressable>

      {/* Keep the invite code when switching screens, so signing in still lands back on it. */}
      <Link replace href={typeof invite === "string" && invite.length > 0 ? { pathname: "/join", params: { invite } } : "/join"} style={styles.joinLink}>
        <Text style={styles.joinLinkText}>New here? Join instead</Text>
      </Link>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink, padding: 20 },
  header: { alignItems: "flex-start", marginBottom: 20 },
  title: { color: colors.paper, fontFamily: fonts.displayItalic, fontSize: 36, lineHeight: 38 },
  sub: { color: colors.steel, fontSize: 15, lineHeight: 22, marginTop: 10 },
  code: { color: colors.paper, fontFamily: "Courier" },
  label: {
    color: colors.steel,
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.paper,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: "Courier",
    letterSpacing: 2,
    borderRadius: radius.button,
  },
  error: { color: colors.loss, fontSize: 14, marginTop: 16 },
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
  joinLink: { marginTop: 20, alignSelf: "center" },
  joinLinkText: { color: colors.steel, fontSize: 15, textDecorationLine: "underline" },
});
