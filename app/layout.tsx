import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Tracker from "@/components/analytics/tracker";

// Fonts are self-hosted from app/fonts so the build never calls Google Fonts.
// next/font/google sometimes failed the Turbopack build on Vercel while mapping
// the downloaded Fraunces files ("next/font/google queries have exactly one
// entry"). These are the same latin-subset woff2 files Google served us. Each
// file is a variable font; it is listed once per weight we used before so
// weights in between (700, say) snap to the same face as they did with Google.
const fraunces = localFont({
  variable: "--font-fraunces",
  adjustFontFallback: "Times New Roman",
  src: [
    { path: "./fonts/fraunces-latin.woff2", weight: "400", style: "normal" },
    { path: "./fonts/fraunces-latin.woff2", weight: "600", style: "normal" },
    { path: "./fonts/fraunces-latin.woff2", weight: "900", style: "normal" },
    { path: "./fonts/fraunces-latin-italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/fraunces-latin-italic.woff2", weight: "600", style: "italic" },
    { path: "./fonts/fraunces-latin-italic.woff2", weight: "900", style: "italic" },
  ],
});
const inter = localFont({
  variable: "--font-inter",
  src: [
    { path: "./fonts/inter-latin.woff2", weight: "400", style: "normal" },
    { path: "./fonts/inter-latin.woff2", weight: "500", style: "normal" },
    { path: "./fonts/inter-latin.woff2", weight: "600", style: "normal" },
  ],
});
const jetbrains = localFont({
  variable: "--font-jetbrains",
  src: [
    { path: "./fonts/jetbrains-mono-latin.woff2", weight: "400", style: "normal" },
    { path: "./fonts/jetbrains-mono-latin.woff2", weight: "500", style: "normal" },
  ],
});
const caveat = localFont({
  variable: "--font-caveat",
  src: [
    { path: "./fonts/caveat-latin.woff2", weight: "400", style: "normal" },
    { path: "./fonts/caveat-latin.woff2", weight: "600", style: "normal" },
  ],
});
// Run It Back display face. Scoped to .runitback-brand (see globals.css) so
// the rest of the site keeps Fraunces. The 600 weight is for the "PICKS"
// sub-label of the wordmark lockup; 900 italic is the main display tier.
const archivo = localFont({
  variable: "--font-archivo",
  src: [
    { path: "./fonts/archivo-latin.woff2", weight: "600", style: "normal" },
    { path: "./fonts/archivo-latin.woff2", weight: "800", style: "normal" },
    { path: "./fonts/archivo-latin.woff2", weight: "900", style: "normal" },
    { path: "./fonts/archivo-latin-italic.woff2", weight: "600", style: "italic" },
    { path: "./fonts/archivo-latin-italic.woff2", weight: "800", style: "italic" },
    { path: "./fonts/archivo-latin-italic.woff2", weight: "900", style: "italic" },
  ],
});

export const metadata: Metadata = {
  title: "Jaiye Sobo · Ballin' + Buildin'",
  description: "Just a kid from East Palo Alto. Ballin' + Buildin'.",
  openGraph: {
    title: "Jaiye Sobo",
    description: "Just a kid from East Palo Alto. Ballin' + Buildin'.",
    type: "website",
  },
  applicationName: "Jaiye",
  appleWebApp: {
    capable: true,
    title: "Jaiye",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable} ${caveat.variable} ${archivo.variable}`}>
      <body>
        {/* Scroll entrances start at opacity 0. If JS never runs, they have
            to be visible anyway. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        {children}
        <Tracker />
      </body>
    </html>
  );
}
