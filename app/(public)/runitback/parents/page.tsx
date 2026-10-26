import type { Metadata } from "next";
import PolicyPage from "@/components/sportsbook/public/policy-page";
import { CONTACT_EMAIL } from "@/lib/sportsbook/contact";

export const metadata: Metadata = { title: "For parents · Run It Back Picks" };

export default function ParentsPage() {
  return (
    <PolicyPage title="For parents" updated="October 25, 2026">
      <p>Run It Back Picks was built by a 9 year old and his dad. We made it something we&apos;d hand our own kids.</p>
      <ul>
        <li>No money, no prizes, no betting words. Points and bragging rights only.</li>
        <li>No open chat. Players can only post from a short list of preset lines, and anyone can report or mute.</li>
        <li>Names go through a filter, and we review every report.</li>
        <li>We don&apos;t collect email, phone, birthday or location.</li>
        <li>Under 13: nickname only, no trash talk, no starting leagues, no push alerts.</li>
        <li>Picks use real stats. It&apos;s a good way to practice percentages and averages.</li>
      </ul>
      <p>Questions? Email {CONTACT_EMAIL}. We&apos;ll answer.</p>
    </PolicyPage>
  );
}
