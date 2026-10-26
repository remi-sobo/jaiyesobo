import { Image } from "expo-image";
import { StyleSheet, View, Text } from "react-native";
import { colors, fonts } from "@/lib/brand";

type Props = {
  /** Overall lockup height in dp. Internal elements scale from this. */
  h?: number;
};

/**
 * Run It Back Picks lockup, native edition. Mirrors the web `BrandLockup`
 * (components/sportsbook/public/brand-lockup.tsx): the symbol is the
 * authoritative path-only SVG from the brand folder, and "RUN IT BACK" +
 * "PICKS" render as live Archivo <Text> so the font context is actually
 * applied (the web learned the same lesson when its earlier <img>-based
 * version silently fell back to Arial Black).
 */
export function Lockup({ h = 48 }: Props) {
  const symbolSize = h; // symbol is roughly square, baseline-matched to the row height
  const titleFontSize = h * 0.56;
  const labelFontSize = Math.max(h * 0.24, 12); // "12px minimum for mono labels" generalized up to Archivo 600
  const dividerHeight = Math.max(h * 0.045, 2);
  const dividerWidth = h * 0.52;

  return (
    <View style={styles.row} accessible accessibilityRole="image" accessibilityLabel="Run It Back Picks">
      <Image
        source={require("@brand/symbol_reversed.svg")}
        style={{ height: symbolSize, width: symbolSize * (102 / 96) }}
        contentFit="contain"
        accessibilityLabel=""
      />
      <View style={styles.textCol}>
        <Text
          style={{ color: colors.paper, fontFamily: fonts.displayItalic, fontSize: titleFontSize, lineHeight: titleFontSize }}
          allowFontScaling={false}
        >
          RUN IT BACK
        </Text>
        <View style={{ marginVertical: dividerHeight, height: dividerHeight, width: dividerWidth, backgroundColor: colors.accent }} />
        <Text
          style={{ color: colors.paper, fontFamily: fonts.label, fontSize: labelFontSize, letterSpacing: labelFontSize * 0.3, lineHeight: labelFontSize }}
          allowFontScaling={false}
        >
          PICKS
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  textCol: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
});
