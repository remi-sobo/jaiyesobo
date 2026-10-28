import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { ApiError } from "@/lib/api";
import { colors, fonts } from "@/lib/brand";
import { showDialog } from "@/lib/dialog";
import { mutePlayer, reportPlayer } from "@/lib/routes";
import type { MeResponse, ReportRequest } from "@shared/types";

type Context = ReportRequest["context"];

export type PlayerActionTarget = {
  player_id: string;
  display_name: string;
  context: Context;
  ref_id?: string;
};

// `muted` is being added to MeResponse separately; this reads it before and after.
type MeCache = MeResponse & { muted?: string[] };

const REASONS: Record<Context, string[]> = {
  talk: ["Mean or inappropriate line"],
  name: ["Inappropriate name", "Pretending to be someone"],
  league_name: ["Inappropriate league name"],
};

// Everything that shows a name, a talk line, or the muted list.
const MUTE_REFRESH_KEYS = ["me", "week", "board", "league", "leagues"];

/**
 * Report / mute sheet for another player, built on showDialog (Alert.alert on the
 * phone, three buttons at most so it also fits Android; a numbered prompt in the browser). Callers attach it only to other
 * challengers, never to the viewer or the house.
 */
export function usePlayerActions() {
  const qc = useQueryClient();

  const open = useCallback(
    (target: PlayerActionTarget) => {
      const { player_id, display_name } = target;
      const me = qc.getQueryData<MeCache>(["me"]);
      if (player_id === me?.player.id) return;
      const muted = (me?.muted ?? []).includes(player_id);

      const toggleMute = async () => {
        try {
          await mutePlayer({ player_id, muted: !muted });
          for (const key of MUTE_REFRESH_KEYS) qc.invalidateQueries({ queryKey: [key] });
        } catch (err) {
          showDialog("Couldn't do that.", describeError(err));
        }
      };

      showDialog(display_name, undefined, [
        { text: "Report", onPress: () => chooseReason(target) },
        { text: muted ? "Unmute" : "Mute", onPress: toggleMute },
        { text: "Cancel", style: "cancel" },
      ]);
    },
    [qc],
  );

  return { open };
}

/** The small "···" button that opens the sheet. hitSlop turns the 28pt box into a 44pt target. */
export function MoreButton({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label} style={styles.more}>
      <Text style={styles.moreText}>···</Text>
    </Pressable>
  );
}

function chooseReason({ player_id, display_name, context, ref_id }: PlayerActionTarget) {
  const send = async () => {
    try {
      await reportPlayer({ player_id, context, ref_id });
      showDialog("Thanks.", "We'll take a look.");
    } catch (err) {
      showDialog("Couldn't send that.", describeError(err));
    }
  };

  // The reason is only for the reporter; the server takes the context alone.
  showDialog(`Report ${display_name}?`, "Tell us what's wrong.", [
    ...REASONS[context].map((text) => ({ text, onPress: send })),
    { text: "Cancel", style: "cancel" },
  ]);
}

function describeError(err: unknown): string {
  if (!(err instanceof ApiError)) return "Check your connection and try again.";
  if (err.body && typeof err.body === "object" && "error" in err.body) {
    return String((err.body as { error: unknown }).error);
  }
  return `Something went wrong (${err.status}).`;
}

const styles = StyleSheet.create({
  more: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  moreText: { color: colors.steel, fontFamily: fonts.label, fontSize: 18, letterSpacing: 1 },
});
