// Brand tokens for the iPhone app. Single source of truth is
// public/runitback-brand/brand_tokens.json at the repo root; Metro's
// watchFolders exposes it through the @brand/* alias (see metro.config.js
// and tsconfig.json). React Native can't consume a JSON file for its
// StyleSheet directly without the extra module boilerplate, so we re-export
// typed constants here that mirror the JSON exactly.
import rawTokens from "@brand/brand_tokens.json";

export const brandTokens = rawTokens as BrandTokens;

export type BrandTokens = {
  brand: string;
  version: string;
  colors: {
    ink: string;
    accent: string;
    paper: string;
    steel: string;
    surface: string;
    surface2: string;
    line: string;
    win: string;
    loss: string;
  };
  type: {
    display: { family: string; weight: number; style: string; stretch: string; fallback: string };
    heading: { family: string; weight: number; stretch: string };
    ui: { family: string; fallback: string };
    data: { family: string; minSize: number; fallback: string };
  };
  radius: { card: number; button: number; sheet: number };
  motion: { base: string; easing: string; direction: string };
  assets: {
    appIcon: string;
    appIconVector: string;
    appIconSmall: string;
    favicon: string;
    appleTouch: string;
    markOnLight: string;
    markOnDark: string;
    logoLight: string;
    logoDark: string;
    stackedLight: string;
    stackedDark: string;
    socialAvatar: string;
  };
};

export const colors = brandTokens.colors;
export const radius = brandTokens.radius;

// Font families, after expo-font loads the TTFs with these keys in
// app/_layout.tsx.
export const fonts = {
  displayItalic: "Archivo-900-italic-semi",
  label: "Archivo-600",
} as const;
