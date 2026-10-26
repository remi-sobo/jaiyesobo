import type { Metadata } from "next";
import PolicyPage from "@/components/sportsbook/public/policy-page";
import { CONTACT_EMAIL } from "@/lib/sportsbook/contact";

export const metadata: Metadata = { title: "Privacy · Run It Back Picks" };

export default function PrivacyPage() {
  return (
    <PolicyPage title="Privacy" updated="October 25, 2026">
      <p>Run It Back Picks is a free NBA pick&apos;em made by Jaiye and his dad Remi, run by SOBO Consulting LLC. We collect as little as we can.</p>
      <h2>What we keep</h2>
      <ul>
        <li>The display name you choose. Everyone playing can see it.</li>
        <li>Whether you&apos;re 13 or older (yes or no). We don&apos;t ask your birthday.</li>
        <li>Your player code, your picks, your leagues, your reactions and the preset trash talk lines you post.</li>
        <li>In the iPhone app: a sign in token, and a push token if you turn alerts on.</li>
        <li>If you buy the Season Pass: that you have it. Apple handles payment. We never see your card.</li>
        <li>Your IP address for a short time, only to stop spam sign ups.</li>
      </ul>
      <h2>What we don&apos;t do</h2>
      <ul>
        <li>No email, phone number, birthday, location or contacts.</li>
        <li>No ads and no ad tracking. We don&apos;t sell or share your information.</li>
        <li>No open chat. Trash talk is picked from a short list of preset lines.</li>
      </ul>
      <h2>Under 13</h2>
      <p>Players under 13 can play with a nickname. They can&apos;t post trash talk or start leagues, and the app sends them no push alerts.</p>
      <h2>Deleting your account</h2>
      <p>In the app: Settings, then Delete account. On the website, email us. Your name, code, leagues and talk are removed. Old picks stay without a name so other players&apos; points don&apos;t change.</p>
      <h2>Contact</h2>
      <p>Email {CONTACT_EMAIL} with any question.</p>
    </PolicyPage>
  );
}
