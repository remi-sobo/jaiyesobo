import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lockup } from "@/components/Lockup";
import { ApiError } from "@/lib/api";
import { colors, fonts, radius } from "@/lib/brand";
import { emailLogin, requestEmailCode, restoreSession } from "@/lib/routes";

type Mode = "email" | "email_code" | "code";

function messageFor(err: unknown, fallback: string): string | null {
  if (!err) return null;
  if (err instanceof ApiError && err.body && typeof err.body === "object" && "error" in err.body) return String((err.body as { error: unknown }).error);
  return fallback;
}

/**
 * Bring an existing account onto this phone. Two ways in:
 * - Email me a login code: for 13+ players whose own email is confirmed. The
 *   server answers the same for any address, so we always move on to the
 *   code box.
 * - Player code (like HOOP-7342): works for everyone, under 13 included.
 */
export default function Restore() {
  const { invite } = useLocalSearchParams<{ invite?: string }>();
  const [mode, setMode] = useState<Mode>("email");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const qc = useQueryClient();

  const signedIn = () => {
    // Seed the cached gate so Home doesn't bounce back to Join on a stale `false`.
    qc.setQueryData(["session", "has-token"], true);
    qc.invalidateQueries();
    // Came from an invite link: go back to it (now signed in) instead of Home.
    if (typeof invite === "string" && invite.length > 0) router.replace({ pathname: "/l/[code]", params: { code: invite } });
    else router.replace("/");
  };

  const restore = useMutation({ mutationFn: () => restoreSession({ code: code.trim().toUpperCase() }), onSuccess: signedIn });
  const ask = useMutation({
    mutationFn: () => requestEmailCode({ email: email.trim() }),
    onSuccess: () => {
      setLoginCode("");
      setMode("email_code");
    },
  });
  const verify = useMutation({ mutationFn: () => emailLogin({ email: email.trim(), code: loginCode.replace(/\D/g, "") }), onSuccess: signedIn });

  const go = (next: Mode) => {
    restore.reset();
    ask.reset();
    verify.reset();
    setMode(next);
  };

  const busy = restore.isPending || ask.isPending || verify.isPending;
  const canSubmit =
    !busy &&
    (mode === "code"
      ? /^[A-Z0-9]{3,}-\d{3,}$/.test(code.trim().toUpperCase())
      : mode === "email"
        ? /^\S+@\S+\.\S+$/.test(email.trim())
        : loginCode.replace(/\D/g, "").length === 6);
  const submit = () => (mode === "code" ? restore.mutate() : mode === "email" ? ask.mutate() : verify.mutate());
  const errorText =
    mode === "code"
      ? messageFor(restore.error, "We couldn't find that code. Try again.")
      : mode === "email"
        ? messageFor(ask.error, "Couldn't send the email. Try again, or use your player code.")
        : messageFor(verify.error, "That code didn't work. Try again.");
  const buttonText = mode === "code" ? "Bring my picks over" : mode === "email" ? "Email me a code" : "Let me back in";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Lockup h={48} />
        </View>

        <Text style={styles.title}>Already playing?</Text>

        {mode === "code" ? (
          <>
            <Text style={styles.sub}>
              Enter the player code from your other phone or the website. It looks like <Text style={styles.codeInline}>HOOP-7342</Text>.
            </Text>
            <Text style={styles.label}>Player code</Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="HOOP-7342"
              placeholderTextColor={colors.steel}
              maxLength={16}
              autoCapitalize="characters"
              autoCorrect={false}
              style={[styles.input, styles.mono]}
            />
          </>
        ) : mode === "email" ? (
          <>
            <Text style={styles.sub}>We&apos;ll email you a 6 digit code. For players 13 and up who confirmed their email. Under 13? Use your player code.</Text>
            <Text style={styles.label}>Your email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.steel}
              maxLength={254}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={() => { if (canSubmit) submit(); }}
              style={styles.input}
            />
          </>
        ) : (
          <>
            <Text style={styles.sub}>
              If {email.trim()} is on a player, the code is on its way. It works for 15 minutes. Check spam if it&apos;s not there.
            </Text>
            <Text style={styles.label}>6 digit code</Text>
            <TextInput
              value={loginCode}
              onChangeText={setLoginCode}
              placeholder="123456"
              placeholderTextColor={colors.steel}
              maxLength={7}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => { if (canSubmit) submit(); }}
              style={[styles.input, styles.mono, styles.codeInput]}
            />
          </>
        )}

        {errorText ? <Text style={styles.error}>{errorText}</Text> : null}

        <Pressable
          disabled={!canSubmit}
          onPress={submit}
          style={({ pressed }) => [styles.primary, !canSubmit && styles.primaryDisabled, pressed && canSubmit && styles.primaryPressed]}
        >
          {busy ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.primaryText}>{buttonText}</Text>}
        </Pressable>

        {mode === "code" ? (
          <Pressable onPress={() => go("email")} style={styles.altLink}>
            <Text style={styles.altLinkText}>No code? Email me a login code</Text>
          </Pressable>
        ) : mode === "email_code" ? (
          <Pressable onPress={() => go("email")} style={styles.altLink}>
            <Text style={styles.altLinkText}>Send a new code</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => go("code")} style={styles.altLink}>
            <Text style={styles.altLinkText}>Use my player code instead</Text>
          </Pressable>
        )}

        {/* Keep the invite code when switching screens, so signing in still lands back on it. */}
        <Link replace href={typeof invite === "string" && invite.length > 0 ? { pathname: "/join", params: { invite } } : "/join"} style={styles.joinLink}>
          <Text style={styles.joinLinkText}>New here? Join instead</Text>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { alignItems: "flex-start", marginBottom: 20 },
  title: { color: colors.paper, fontFamily: fonts.displayItalic, fontSize: 36, lineHeight: 38 },
  sub: { color: colors.steel, fontSize: 15, lineHeight: 22, marginTop: 10 },
  codeInline: { color: colors.paper, fontFamily: "Courier" },
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
    borderRadius: radius.button,
  },
  mono: { fontFamily: "Courier", letterSpacing: 2 },
  codeInput: { fontSize: 22, letterSpacing: 8 },
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
  altLink: { marginTop: 16, alignSelf: "center", minHeight: 44, justifyContent: "center" },
  altLinkText: { color: colors.steel, fontSize: 15, textDecorationLine: "underline" },
  joinLink: { marginTop: 4, alignSelf: "center" },
  joinLinkText: { color: colors.steel, fontSize: 15, textDecorationLine: "underline" },
});
