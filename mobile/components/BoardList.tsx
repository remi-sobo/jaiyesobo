import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius } from "@/lib/brand";
import type { ApiBoard, ApiBoardRow } from "@shared/types";

type Span = "week" | "season";

export function BoardList({ board, span }: { board: ApiBoard; span: Span }) {
  const me = board.me;
  const meInRows = me !== null && board.rows.some((r) => r.player_id === me.player_id);
  const empty = board.rows.length === 0;

  return (
    <View>
      {board.headline ? <Text style={styles.headline}>{board.headline}</Text> : null}

      {empty ? (
        <Text style={styles.empty}>Nobody's on the board yet. Make your picks.</Text>
      ) : (
        <View style={styles.rows}>
          {board.rows.map((row) => (
            <BoardRow key={row.player_id} row={row} span={span} />
          ))}
        </View>
      )}

      {me && !meInRows ? (
        <View style={[styles.rows, !empty && styles.pinned]}>
          {!empty ? <Text style={styles.divider}>···</Text> : null}
          <BoardRow row={me} span={span} />
        </View>
      ) : null}
    </View>
  );
}

function BoardRow({ row, span }: { row: ApiBoardRow; span: Span }) {
  const isHouse = row.kind !== "challenger";
  const stat = span === "week" ? `${row.correct}-${row.wrong}` : `${row.weeks_won} won · ${row.correct} played`;

  return (
    <View style={[styles.row, row.is_me && styles.rowMe, row.ghost && styles.rowGhost]}>
      <View style={styles.rowLeft}>
        <Text style={styles.rank}>#{row.rank}</Text>
        <View style={styles.nameLine}>
          <Text style={[styles.name, isHouse && styles.nameHouse]}>
            {row.display_name}
            {row.ghost ? <Text style={styles.ghostNote}> (would be here)</Text> : null}
          </Text>
          {row.is_me ? <Text style={styles.youTag}>YOU</Text> : null}
          {!isHouse && row.beat_jaiye ? <BeatChip letter="J" label="Beat Jaiye" /> : null}
          {!isHouse && row.beat_remi ? <BeatChip letter="R" label="Beat Remi" /> : null}
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.points}>{row.points}</Text>
        <Text style={styles.stat}>{stat}</Text>
      </View>
    </View>
  );
}

function BeatChip({ letter, label }: { letter: string; label: string }) {
  return (
    <View style={styles.chip} accessible accessibilityLabel={label}>
      <Text style={styles.chipText}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headline: { color: colors.paper, fontSize: 15, lineHeight: 21, marginTop: 16 },
  rows: { marginTop: 16, gap: 8 },
  pinned: { marginTop: 8 },
  divider: { color: colors.steel, fontFamily: fonts.label, fontSize: 16, letterSpacing: 4, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
  },
  rowMe: { borderColor: colors.accent },
  rowGhost: { opacity: 0.5 },
  rowLeft: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8 },
  rank: { minWidth: 28, color: colors.steel, fontFamily: fonts.label, fontSize: 12 },
  nameLine: { flex: 1, minWidth: 0, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  name: { flexShrink: 1, color: colors.paper, fontSize: 16 },
  nameHouse: { color: colors.accent },
  ghostNote: { color: colors.steel },
  youTag: { color: colors.accent, fontFamily: fonts.label, fontSize: 10, letterSpacing: 1 },
  chip: {
    borderWidth: 1,
    borderColor: colors.win,
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  chipText: { color: colors.win, fontFamily: fonts.label, fontSize: 10 },
  rowRight: { alignItems: "flex-end" },
  points: { color: colors.paper, fontFamily: fonts.label, fontSize: 20 },
  stat: { color: colors.steel, fontSize: 12, marginTop: 2 },
  empty: { color: colors.steel, fontSize: 15, textAlign: "center", marginTop: 32 },
});
