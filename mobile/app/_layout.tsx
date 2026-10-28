import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@/lib/brand";

// Keep the native splash up until the Archivo faces have loaded, so the
// brand lockup doesn't flash in a system font first.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* already hidden on cold starts after a reload — fine. */
});

// Local reminders (see lib/reminders.ts) should still show as a banner while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// One client for the whole app. The spec calls for optimistic pick saves
// with retry and an offline banner; this is where that behavior will land.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 15_000, refetchOnWindowFocus: true },
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "Archivo-900-italic-semi": require("@/assets/fonts/Archivo-900-italic-semi.ttf"),
    "Archivo-600": require("@/assets/fonts/Archivo-600.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // RN has no window focus events; map app foregrounding onto TanStack's focus.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => focusManager.setFocused(s === "active"));
    return () => sub.remove();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: colors.ink }}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.ink },
            }}
          />
        </View>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
