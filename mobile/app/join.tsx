import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lockup } from "@/components/Lockup";
import { ApiError } from "@/lib/api";
import { colors, fonts, radius } from "@/lib/brand";
import { joinSession, putEmail } from "@/lib/routes";
import type { AgeBand } from "@shared/types";

/**
 * Fresh account. Collects display name + the 13+ age gate (per spec: under
 * 13 can play with a nickname but can't post trash talk or start leagues).
 * On success, the token is in the Keychain and we replace onto This Week.
 */
export default function Join() {
  const { invite } = useLocalSearchParams<{ invite?: string }>();
  const [name, setName] = useState("");
  const [age, setAge] = useState<AgeBand | null>(null);
  const [email, setEmail] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const qc = useQueryClient();

  const join = useMutation({
    mutationFn: async () => {
      // Real names are 13+ only; the server refuses them otherwise.
      const teen = age === "13_plus";
      const res = await joinSession({
        name: name.trim(),
        age_band: age!,
        first_name: teen ? first.trim() || null : null,
        last_name: teen ? last.trim() || null : null,
      });
      // The email is optional and never blocks joining: a bad address or a network blip is fixed later in Settings.
      const address = email.trim();
      if (address) await putEmail({ email: address, results: true, newsletter: true }).catch(() => {});
      return res;
    },
    onSuccess: () => {
      // Replace instead of push so the back gesture doesn't return here
      // after signing in.
      // Seed the cached gate so Home doesn't bounce back here on a stale `false`.
      qc.setQueryData(["session", "has-token"], true);
      qc.invalidateQueries();
      // Came from an invite link: go back to it (now signed in) instead of Home.
      if (typeof invite === "string" && invite.length > 0) router.replace({ pathname: "/l/[code]", params: { code: invite } });
      else router.replace("/");
    },
  });

  const canSubmit = name.trim().length >= 1 && name.trim().length <= 20 && age !== null && !join.isPending;
  const errorText = join.error instanceof ApiError
    ? (join.error.body && typeof join.error.body === "object" && "error" in join.error.body
      ? String((join.error.body as { error: unknown }).error)
      : `Couldn't join (${join.error.status}).`)
    : join.error
      ? "Couldn't join. Try again."
      : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Lockup h={48} />
      </View>

      <Text style={styles.title}>
        Beat Jaiye <Text style={styles.titleAccent}>& Remi.</Text>
      </Text>
      <Text style={styles.sub}>
        Pick the same games as me and my dad. Most points by Sunday night wins the week. No money, just bragging rights.
      </Text>

      <Text style={styles.label}>Nickname</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Big Ticket"
        placeholderTextColor={colors.steel}
        maxLength={20}
        autoCapitalize="words"
        autoCorrect={false}
        style={styles.input}
      />
      <Text style={styles.help}>Everybody sees your nickname on the board.</Text>

      <Text style={styles.label}>Are you 13 or older?</Text>
      <View style={styles.ageRow}>
        <AgeButton selected={age === "13_plus"} label="Yes" onPress={() => setAge("13_plus")} />
        <AgeButton selected={age === "under_13"} label="No" onPress={() => setAge("under_13")} />
      </View>

      {age === "13_plus" ? (
        <View>
          <Text style={styles.label}>Your real name (optional)</Text>
          <View style={styles.nameRow}>
            <TextInput
              value={first}
              onChangeText={setFirst}
              placeholder="First"
              placeholderTextColor={colors.steel}
              maxLength={30}
              autoCapitalize="words"
              autoCorrect={false}
              autoComplete="given-name"
              textContentType="givenName"
              accessibilityLabel="First name"
              style={[styles.input, styles.nameInput]}
            />
            <TextInput
              value={last}
              onChangeText={setLast}
              placeholder="Last"
              placeholderTextColor={colors.steel}
              maxLength={30}
              autoCapitalize="words"
              autoCorrect={false}
              autoComplete="family-name"
              textContentType="familyName"
              accessibilityLabel="Last name"
              style={[styles.input, styles.nameInput]}
            />
          </View>
          <Text style={styles.help}>Private. Only Jaiye and his dad see it, so they know who&apos;s who.</Text>
        </View>
      ) : null}

      <Text style={styles.label}>{age === "under_13" ? "A parent's email (optional)" : "Email (optional)"}</Text>
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
        style={styles.input}
      />
      <Text style={styles.help}>{age === "under_13" ? "Get your results every Monday. We'll ask them first." : "Get your results every Monday, and sign in on any phone with a code."}</Text>

      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}

      <Pressable
        disabled={!canSubmit}
        onPress={() => join.mutate()}
        style={({ pressed }) => [styles.primary, !canSubmit && styles.primaryDisabled, pressed && canSubmit && styles.primaryPressed]}
      >
        {join.isPending ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.primaryText}>I&apos;m in</Text>}
      </Pressable>

      <Text style={styles.legal}>
        By joining you agree to the{" "}
        <Text accessibilityRole="link" style={styles.legalLink} onPress={() => openPolicy("terms")}>
          Terms
        </Text>
        . See{" "}
        <Text accessibilityRole="link" style={styles.legalLink} onPress={() => openPolicy("privacy")}>
          Privacy
        </Text>{" "}
        and{" "}
        <Text accessibilityRole="link" style={styles.legalLink} onPress={() => openPolicy("parents")}>
          For parents
        </Text>
        .
      </Text>

      {/* Keep the invite code when switching screens, so signing in still lands back on it. */}
      <Link replace href={typeof invite === "string" && invite.length > 0 ? { pathname: "/restore", params: { invite } } : "/restore"} style={styles.restoreLink}>
        <Text style={styles.restoreLinkText}>Already playing? Sign back in</Text>
      </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

/** The policy pages live on the website, same as the links in Settings. */
function openPolicy(page: "terms" | "privacy" | "parents") {
  Linking.openURL(`https://jaiyesobo.com/runitback/${page}`).catch(() => {});
}

function AgeButton({ selected, label, onPress }: { selected: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.ageBtn, selected && styles.ageBtnSelected]}
    >
      <Text style={[styles.ageBtnText, selected && styles.ageBtnTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { alignItems: "flex-start", marginBottom: 20 },
  title: { color: colors.paper, fontFamily: fonts.displayItalic, fontSize: 40, lineHeight: 42 },
  titleAccent: { color: colors.accent },
  sub: { color: colors.steel, fontSize: 15, lineHeight: 22, marginTop: 10 },
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
  help: { color: colors.steel, fontSize: 13, marginTop: 6 },
  legal: { color: colors.steel, fontSize: 13, lineHeight: 19, marginTop: 14, textAlign: "center" },
  legalLink: { color: colors.paper, textDecorationLine: "underline" },
  nameRow: { flexDirection: "row", gap: 8 },
  // flexBasis and minWidth 0: on web a text box has a built-in width that would push "Last" off a phone screen.
  nameInput: { flex: 1, flexBasis: 0, minWidth: 0 },
  ageRow: { flexDirection: "row", gap: 8 },
  ageBtn: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.button,
    backgroundColor: colors.surface,
  },
  ageBtnSelected: { borderColor: colors.accent, backgroundColor: colors.surface2 },
  ageBtnText: { color: colors.paper, fontSize: 16 },
  ageBtnTextSelected: { color: colors.paper, fontFamily: fonts.label, letterSpacing: 1 },
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
  restoreLink: { marginTop: 20, alignSelf: "center" },
  restoreLinkText: { color: colors.steel, fontSize: 15, textDecorationLine: "underline" },
});
