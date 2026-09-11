import type { Metadata, Viewport } from "next";
import { Caveat, Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", weight: ["400", "600", "900"], style: ["normal", "italic"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", weight: ["400", "500", "600"] });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", weight: ["400", "500"] });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", weight: ["400", "600"] });

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
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable} ${caveat.variable}`}>
      <body>
        {/* Scroll entrances start at opacity 0. If JS never runs, they have
            to be visible anyway. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
