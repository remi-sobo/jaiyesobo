import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

function easProjectId(): string | null {
  const extra: Record<string, any> | undefined = Constants.expoConfig?.extra;
  const id: unknown = extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  return typeof id === "string" && id.length > 0 ? id : null;
}

/** True when an EAS projectId is configured, i.e. a push token can be requested at all. No prompt, no await. Always false in the browser. */
export function pushAvailable(): boolean {
  if (Platform.OS === "web") return false;
  return easProjectId() !== null;
}

/** Expo push token for this device, or null when push can't work here (no EAS projectId, permission denied, Expo Go). Never throws. */
export async function registerForPush(): Promise<string | null> {
  if (Platform.OS === "web") return null;
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
