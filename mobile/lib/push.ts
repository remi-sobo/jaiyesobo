import Constants from "expo-constants";
import * as Notifications from "expo-notifications";

function easProjectId(): string | null {
  const extra: Record<string, any> | undefined = Constants.expoConfig?.extra;
  const id: unknown = extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  return typeof id === "string" && id.length > 0 ? id : null;
}

/** True when an EAS projectId is configured, i.e. a push token can be requested at all. No prompt, no await. */
export function pushAvailable(): boolean {
  return easProjectId() !== null;
}

/** Expo push token for this device, or null when push can't work here (no EAS projectId, permission denied, Expo Go). Never throws. */
export async function registerForPush(): Promise<string | null> {
  try {
    const projectId = easProjectId();
    if (!projectId) return null;

    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return null;

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch {
    return null;
  }
}
