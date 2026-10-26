import tokens from "../../public/runitback-brand/brand_tokens.json";

export const runItBackBrand = tokens as RunItBackBrand;

export type RunItBackBrand = {
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

const PUBLIC_BASE = "/runitback-brand/";

export const runItBackAssetUrl = (key: keyof RunItBackBrand["assets"]) =>
  PUBLIC_BASE + runItBackBrand.assets[key];
