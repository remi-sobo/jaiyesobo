import { Alert, Platform } from "react-native";

export type DialogButton = {
  text: string;
  style?: "cancel" | "destructive" | "default";
  onPress?: () => void;
};

/**
 * Alert.alert on the phone; plain browser dialogs on web, where react-native-web's
 * Alert.alert does nothing. Same arguments either way, so call sites don't branch.
 *
 * Web mapping:
 * - one button (or none): window.alert, then that button's onPress
 * - a cancel + one other button: window.confirm. OK runs the other button, Cancel runs the cancel button
 * - anything else (the report / mute sheets): window.prompt with the options numbered. A number runs
 *   that option; Cancel, blank or anything else dismisses and runs the cancel button, if there is one
 */
export function showDialog(title: string, message?: string, buttons?: DialogButton[]): void {
  if (Platform.OS !== "web") {
    Alert.alert(title, message, buttons);
    return;
  }

  const list = buttons ?? [];
  const text = `${title}\n\n${message ?? ""}`;
  const cancel = list.find((b) => b.style === "cancel");
  const others = list.filter((b) => b !== cancel);

  if (list.length <= 1) {
    window.alert(text);
    list[0]?.onPress?.();
    return;
  }

  if (list.length === 2 && cancel && others[0]) {
    if (window.confirm(text)) others[0].onPress?.();
    else cancel.onPress?.();
    return;
  }

  const options = others.map((b, i) => `${i + 1}. ${b.text}`).join("\n");
  const answer = window.prompt(`${text}\n${options}\n\nType a number, or press Cancel to dismiss.`, "");
  const picked = answer === null ? undefined : others[Number.parseInt(answer.trim(), 10) - 1];
  if (picked) picked.onPress?.();
  else cancel?.onPress?.();
}
