import type { Metadata } from "next";
import PolicyPage from "@/components/sportsbook/public/policy-page";
import { CONTACT_EMAIL } from "@/lib/sportsbook/contact";

export const metadata: Metadata = { title: "Terms · Run It Back Picks" };

export default function TermsPage() {
  return (
    <PolicyPage title="Terms of use" updated="October 25, 2026">
      <p>Run It Back Picks is run by SOBO Consulting LLC. By playing you agree to these terms.</p>
      <h2>It&apos;s a game</h2>
      <ul>
        <li>No money is ever involved in a pick. There are no prizes of any kind. You play for points and bragging rights.</li>
        <li>The Season Pass ($1.99 in the iPhone app) adds features like starting leagues. It never changes points, picks or rank.</li>
        <li>Apple is not a sponsor of Run It Back Picks and isn&apos;t involved in it.</li>
        <li>Run It Back Picks isn&apos;t connected to the NBA or any team.</li>
      </ul>
      <h2>Play fair</h2>
      <ul>
        <li>One account per person. Pick a name that&apos;s fine for kids to see.</li>
        <li>Picks lock at tip-off. Results come from final box scores. Postponed games and players who sit out are void.</li>
        <li>We can hide, rename or remove any player or league that breaks these rules.</li>
      </ul>
      <h2>Changes</h2>
      <p>We may update these terms. We&apos;ll post the date at the top when we do.</p>
      <h2>Contact</h2>
      <p>Email {CONTACT_EMAIL}.</p>
    </PolicyPage>
  );
}
