import { createServiceClient } from "@/lib/supabase/server";

export type StreakRules = {
  weekdays_only: boolean;
  completion_threshold: number;
};

const DEFAULT_STREAK_RULES: StreakRules = {
  weekdays_only: true,
  completion_threshold: 0.8,
};

export async function getStreakRules(): Promise<StreakRules> {
  try {
    const supa = createServiceClient();
    const { data } = await supa
      .from("app_config")
      .select("value")
      .eq("key", "streak_rules")
      .maybeSingle();
    if (data?.value && typeof data.value === "object") {
      return { ...DEFAULT_STREAK_RULES, ...(data.value as Partial<StreakRules>) };
    }
  } catch {
    // app_config may not exist yet (migration 005 not run) — fall through
  }
  return DEFAULT_STREAK_RULES;
}
