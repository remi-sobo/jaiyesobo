import { Alert, Platform } from "react-native";

export type DialogButton = {
  text: string;
  style?: "cancel" | "destructive" | "default";
  onPress?: () => void;
};

/** One dialog waiting to be shown on web. `buttons` is never empty: no buttons given becomes a single OK. */
export type DialogRequest = {
  title: string;
  message?: string;
  buttons: DialogButton[];
};

/**
 * Alert.alert on the phone. On web, react-native-web's Alert.alert does nothing and the browser's own
 * dialogs looked wrong in the installed PWA, so the request goes to an in-app bottom sheet instead:
 * components/DialogHost.tsx, mounted once in app/_layout.tsx. Same arguments either way, so call sites
 * don't branch.
 *
 * Web behavior:
 * - The sheet shows the buttons given (none given: a single OK). Tapping the backdrop or pressing Escape
 *   dismisses it and runs the cancel button's onPress, if there is one.
 * - One dialog at a time, first in first out. A request made while one is open waits and shows after it
 *   closes. The report / mute sheet relies on this: its "Report" button opens the reasons sheet from onPress.
 * - If no DialogHost has subscribed (should not happen), it falls back to plain browser dialogs:
 *   - one button (or none): window.alert, then that button's onPress
 *   - a cancel + one other button: window.confirm. OK runs the other button, Cancel runs the cancel button
 *   - anything else: window.prompt with the options numbered. A number runs that option; Cancel, blank or
 *     anything else dismisses and runs the cancel button, if there is one
 */
export function showDialog(title: string, message?: string, buttons?: DialogButton[]): void {
  if (Platform.OS !== "web") {
    Alert.alert(title, message, buttons);
    return;
  }

  const request: DialogRequest = { title, message, buttons: buttons?.length ? buttons : [{ text: "OK" }] };

  if (listeners.size === 0) {
    showBrowserDialog(request);
    return;
  }
  if (current) queue.push(request);
  else {
    current = request;
    notify();
  }
}

// Web only: the store the host reads. Module state, because showDialog is called from plain functions
// (PlayerActions' sheets, mutation callbacks) that have no React context to put a dialog in.
const queue: DialogRequest[] = [];
let current: DialogRequest | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of [...listeners]) listener();
}

/** Calls `listener` whenever the dialog being shown changes. Returns the unsubscribe function. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The dialog being shown, or null. The same object until it changes, so it is safe as a store snapshot. */
export function getCurrentRequest(): DialogRequest | null {
  return current;
}

/**
 * Closes the dialog being shown and runs the button that was chosen. `null` means it was dismissed (backdrop,
 * Escape): the cancel button's onPress runs, if there is one. Then the next waiting request shows.
 *
 * The dialog stays current while onPress runs, so a dialog opened from onPress goes to the back of the
 * queue (true first in, first out) and still shows right away when nothing else is waiting.
 */
export function resolve(button: DialogButton | null): void {
  const shown = current;
  if (!shown) return;
  // A button from a dialog that already closed (a double tap) must not fire a second time.
  if (button && !shown.buttons.includes(button)) return;

  const chosen = button ?? shown.buttons.find((b) => b.style === "cancel");
  try {
    chosen?.onPress?.();
  } finally {
    current = queue.shift() ?? null;
    notify();
  }
}

function showBrowserDialog({ title, message, buttons }: DialogRequest): void {
  const text = `${title}\n\n${message ?? ""}`;
  const cancel = buttons.find((b) => b.style === "cancel");
  const others = buttons.filter((b) => b !== cancel);

  if (buttons.length <= 1) {
    window.alert(text);
    buttons[0]?.onPress?.();
    return;
  }

  if (buttons.length === 2 && cancel && others[0]) {
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
