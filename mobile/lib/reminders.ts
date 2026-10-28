import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const LEAD_MS = 60 * 60 * 1000;

type LockReminderInput = { weekNumber: number; nextLockAt: string | null; unpicked: number; enabled: boolean };

let lastKey: string | null = null;
let askedThisSession = false;
// Syncs run one at a time, so a burst of pick changes can't leave two reminders scheduled.
let queue: Promise<void> = Promise.resolve();

/** Keep exactly one local "1 hour to tip-off" reminder in sync with the week. No-op when disabled, nothing left to pick, or tip-off is under an hour away. Never throws. Phone only: does nothing in the browser (no scheduling, no permission prompt). */
export async function syncLockReminder(input: LockReminderInput): Promise<void> {
  if (Platform.OS === "web") return;
  const run = queue.then(() => apply(input));
  queue = run;
  await run;
}

async function apply({ weekNumber, nextLockAt, unpicked, enabled }: LockReminderInput): Promise<void> {
  try {
    const key = `${weekNumber}:${nextLockAt}:${unpicked}:${enabled}`;
    if (key === lastKey) return;
    lastKey = key;

    // Scheduled notifications outlive the process, so sweep rather than trust a remembered id. This app schedules nothing else.
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!enabled || unpicked <= 0 || !nextLockAt) return;
    const fireAt = new Date(nextLockAt).getTime() - LEAD_MS;
    if (!(fireAt > Date.now())) return;

    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && !askedThisSession) {
      askedThisSession = true;
      perm = await Notifications.requestPermissionsAsync();
    }
    if (!perm.granted) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "1 hour to tip-off",
        body: `${unpicked} pick${unpicked === 1 ? "" : "s"} left. Jaiye and Remi are already in.`,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(fireAt) },
    });
  } catch {
    lastKey = null;
  }
}
