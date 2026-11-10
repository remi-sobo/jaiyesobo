// In-app dialog for the web build. The browser's own alert / confirm / prompt boxes looked wrong in the
// installed PWA (system chrome, no brand, a numbered text prompt for the report sheet), so on web
// lib/dialog.ts hands every showDialog call to this host, which draws it as a bottom sheet. On the phone
// showDialog still calls Alert.alert and this component renders nothing.
//
// Mounted once at the root (app/_layout.tsx). It shows one dialog at a time; lib/dialog.ts queues the rest.
import { useSyncExternalStore } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius } from "@/lib/brand";
import { getCurrentRequest, resolve, subscribe, type DialogButton } from "@/lib/dialog";

// The brand tokens have no spacing scale; 20 is the side padding every screen uses.
const GUTTER = 20;

const dismiss = () => resolve(null);

export default function DialogHost() {
  if (Platform.OS !== "web") return null;
  return <WebDialogHost />;
}

function WebDialogHost() {
  const request = useSyncExternalStore(subscribe, getCurrentRequest, () => null);
  const insets = useSafeAreaInsets();
  if (!request) return null;

  // Cancel goes last, like an action sheet; everything else keeps the order the caller gave.
  const ordered = [
    ...request.buttons.filter((b) => b.style !== "cancel"),
    ...request.buttons.filter((b) => b.style === "cancel"),
  ];

  return (
    <Modal transparent animationType="fade" visible onRequestClose={dismiss}>
      <View style={styles.root}>
        <Pressable accessible={false} onPress={dismiss} style={[StyleSheet.absoluteFill, styles.backdrop]} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + GUTTER }]}>
          <Text style={styles.title}>{request.title}</Text>
          {request.message ? <Text style={styles.message}>{request.message}</Text> : null}
          <View style={styles.buttons}>
            {ordered.map((button, i) => (
              <SheetButton key={`${i}-${button.text}`} button={button} />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SheetButton({ button }: { button: DialogButton }) {
  const kind = button.style ?? "default";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => resolve(button)}
      style={({ pressed }) => [styles.button, BUTTON_STYLE[kind], pressed && PRESSED_STYLE[kind]]}
    >
      <Text style={[styles.buttonText, kind === "cancel" && styles.cancelText]}>{button.text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    width: "100%",
    maxWidth: 480, // a phone fills it; a desktop window gets a centered sheet, not a full-width bar
    alignSelf: "center",
    paddingTop: 24,
    paddingHorizontal: GUTTER,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.line,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
  title: { color: colors.paper, fontFamily: fonts.label, fontSize: 20, lineHeight: 26 },
  message: { color: colors.steel, fontSize: 15, lineHeight: 22, marginTop: 8 },
  buttons: { gap: 10, marginTop: 20 },
  button: {
    minHeight: 48,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.button,
  },
  buttonText: {
    color: colors.ink,
    fontFamily: fonts.label,
    fontSize: 13,
    letterSpacing: 2,
    textAlign: "center",
    textTransform: "uppercase",
  },
  cancelText: { color: colors.steel },
  destructive: { backgroundColor: colors.accent },
  destructivePressed: { backgroundColor: colors.paper },
  default: { backgroundColor: colors.paper },
  defaultPressed: { opacity: 0.8 },
  cancel: { backgroundColor: "transparent" },
  cancelPressed: { backgroundColor: colors.surface2 },
});

const BUTTON_STYLE = { destructive: styles.destructive, default: styles.default, cancel: styles.cancel };
const PRESSED_STYLE = {
  destructive: styles.destructivePressed,
  default: styles.defaultPressed,
  cancel: styles.cancelPressed,
};
