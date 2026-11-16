import type { Metadata } from "next";
import Link from "next/link";
import PolicyPage from "@/components/sportsbook/public/policy-page";
import { CONTACT_EMAIL } from "@/lib/sportsbook/contact";

export const metadata: Metadata = { title: "For parents · Run It Back Picks" };

const a = "underline underline-offset-4";

export default function ParentsPage() {
  return (
    <PolicyPage title="For parents" updated="November 15, 2026">
      <p>Run It Back Picks was built by a 9 year old and his dad. We made it something we&apos;d hand our own kids.</p>
      <ul>
        <li>No money, no prizes, no betting words. Points and bragging rights only.</li>
        <li>No open chat. Players can only post from a short list of preset lines, and anyone can report or mute.</li>
        <li>Names go through a filter, and we review every report.</li>
        <li>We don&apos;t collect phone, birthday or location. Email is optional, and for players under 13 it has to be a parent&apos;s.</li>
        <li>Under 13: nickname only. We never ask for their real name. No trash talk, no starting leagues, no Season Pass, no push alerts.</li>
        <li>Picks use real stats. It&apos;s a good way to practice percentages and averages.</li>
      </ul>
      <h2>Email</h2>
      <p>If your child adds your email, we send you one message first asking if that&apos;s OK, and we send nothing else until you tap the button. After that you get a short results email every Monday and, if you choose, a note when Jaiye has a new episode or column. We never email your child, and every email has a link to stop them or change what you get.</p>
      <h2>Your rights as a parent</h2>
      <p>You can ask to see what we have about your child, ask us to delete it, or tell us to stop collecting anything more, any time. Email {CONTACT_EMAIL} with your child&apos;s nickname or player code. We&apos;ll check that you&apos;re the parent, then do it. You can also delete the account yourself in the app: Settings, then Delete account.</p>
      <h2>Jaiye&apos;s games</h2>
      <p>The other games on jaiyesobo.com don&apos;t ask for an email or an age. If your child puts a score on a leaderboard, the name they type there is public, so a nickname is best. If their real name ends up there, email us and we&apos;ll take it off.</p>
      <p>
        The full details are in our <Link href="/runitback/privacy" className={a}>Privacy policy</Link> and <Link href="/runitback/terms" className={a}>Terms</Link>. Questions? Email {CONTACT_EMAIL}. We&apos;ll answer.
      </p>
    </PolicyPage>
  );
}
