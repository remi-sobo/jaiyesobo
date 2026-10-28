import type { Metadata } from "next";
import Link from "next/link";
import PolicyPage from "@/components/sportsbook/public/policy-page";
import { CONTACT_EMAIL } from "@/lib/sportsbook/contact";

export const metadata: Metadata = { title: "Help · Run It Back Picks" };

export default function SupportPage() {
  return (
    <PolicyPage title="Help" updated="October 25, 2026" draft={false}>
      <h2>How it works</h2>
      <p>Every Monday a new slate of 10 to 12 NBA picks drops. Make your picks before each game tips off. Right picks earn their points, wrong ones lose them. Star one pick as your Lock of the Week: right doubles it, wrong costs double.</p>
      <h2>Playing on a new phone</h2>
      <p>Use your player code (like HOOP-7342). On the website tap &ldquo;Already playing? Use your code.&rdquo; In the app tap &ldquo;Have a player code?&rdquo;</p>
      <h2>Leagues</h2>
      <p>Join any league with its code or invite link, free. Starting your own league comes with the Season Pass, $1.99 for the season at jaiyesobo.com/runitback/pass.</p>
      <h2>Something wrong?</h2>
      <p>Email {CONTACT_EMAIL}. If someone&apos;s name or trash talk isn&apos;t okay, tap the ⋯ next to it and report it.</p>
      <p>
        <Link href="/runitback/privacy" className="underline underline-offset-4">Privacy</Link> ·{" "}
        <Link href="/runitback/terms" className="underline underline-offset-4">Terms</Link> ·{" "}
        <Link href="/runitback/parents" className="underline underline-offset-4">For parents</Link>
      </p>
    </PolicyPage>
  );
}
