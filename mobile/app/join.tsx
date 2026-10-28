import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lockup } from "@/components/Lockup";
import { ApiError } from "@/lib/api";
import { colors, fonts, radius } from "@/lib/brand";
import { joinSession } from "@/lib/routes";
import type { AgeBand } from "@shared/types";

/**
 * Fresh account. Collects display name + the 13+ age gate (per spec: under
 * 13 can play with a nickname but can't post trash talk or start leagues).
 * On success, the token is in the Keychain and we replace onto This Week.
 */
export default function Join() {
  const [name, setName] = useState("");
  const [age, setAge] = useState<AgeBand | null>(null);
  const qc = useQueryClient();

  const join = useMutation({
    mutationFn: () => joinSession({ name: name.trim(), age_band: age! }),
    onSuccess: () => {
      // Replace instead of push so the back gesture doesn't return here
      // after signing in.
      // Seed the cached gate so Home doesn't bounce back here on a stale `false`.
      qc.setQueryData(["session", "has-token"], true);
      qc.invalidateQueries();
      router.replace("/");
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
      <View style={styles.header}>
        <Lockup h={48} />
      </View>

      <Text style={styles.title}>
        Beat Jaiye <Text style={styles.titleAccent}>& Remi.</Text>
      </Text>
      <Text style={styles.sub}>
        Pick the same games as me and my dad. Most points by Sunday night wins the week. No money, just bragging rights.
      </Text>

      <Text style={styles.label}>Your name or nickname</Text>
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
      <Text style={styles.help}>Everybody can see this name. Just your first name or a nickname.</Text>

      <Text style={styles.label}>Are you 13 or older?</Text>
      <View style={styles.ageRow}>
        <AgeButton selected={age === "13_plus"} label="Yes" onPress={() => setAge("13_plus")} />
        <AgeButton selected={age === "under_13"} label="No" onPress={() => setAge("under_13")} />
      </View>

      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}

      <Pressable
        disabled={!canSubmit}
        onPress={() => join.mutate()}
        style={({ pressed }) => [styles.primary, !canSubmit && styles.primaryDisabled, pressed && canSubmit && styles.primaryPressed]}
      >
        {join.isPending ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.primaryText}>I&apos;m in</Text>}
      </Pressable>

      <Link replace href="/restore" style={styles.restoreLink}>
        <Text style={styles.restoreLinkText}>Already playing? Use your code</Text>
      </Link>
    </SafeAreaView>
  );
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
  safe: { flex: 1, backgroundColor: colors.ink, padding: 20 },
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
