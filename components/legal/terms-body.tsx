import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/sportsbook/contact";
import { MAILING_ADDRESS } from "@/lib/email/templates";
import { SEASON_PASS_CENTS } from "@/lib/sportsbook/pass";

/** The date at the top of both terms pages. Change it whenever the text below changes. */
export const TERMS_UPDATED = "November 15, 2026";

const a = "underline underline-offset-4";
const PRICE = `$${(SEASON_PASS_CENTS / 100).toFixed(2)}`;

/**
 * One set of terms for all of jaiyesobo.com and Run It Back Picks (web, web
 * app, iPhone app). Shown at /terms and /runitback/terms.
 */
export default function TermsBody() {
  return (
    <>
      <p>
        jaiyesobo.com and Run It Back Picks are run by SOBO Consulting LLC (&ldquo;we&rdquo;). By using the site, the games or the app, you agree to these terms. If you&apos;re under 18, read them with a parent.
      </p>

      <h2>Run It Back Picks is a game</h2>
      <ul>
        <li>It&apos;s free to play. No money is ever involved in a pick, and there are no prizes of any kind. You play for points and bragging rights. It is not gambling.</li>
        <li>Players 13 and up can buy a Season Pass on the website for {PRICE}. It lets you start your own leagues for that season. It never changes points, picks or rank. It&apos;s a one time payment that doesn&apos;t renew. If something&apos;s wrong with your pass, email us and we&apos;ll make it right.</li>
        <li>Picks lock at tip-off. Results come from final box scores. Postponed games and players who sit out are void. If a stat was wrong or a result was graded wrong, we fix it, and the board can change.</li>
        <li>Apple is not a sponsor of Run It Back Picks and isn&apos;t involved in it.</li>
      </ul>

      <h2>Play fair, play kind</h2>
      <ul>
        <li>One account per person. Keep your player code to yourself. It&apos;s how you get back in.</li>
        <li>Pick a nickname that&apos;s fine for kids to see, and don&apos;t pretend to be someone else, including Jaiye or Remi.</li>
        <li>Trash talk is picked from a short list of preset lines. Keep it fun.</li>
        <li>No bots, scripts or extra accounts, and no trying to break or overload the site.</li>
        <li>We can hide, rename or remove any player, name, league or score that breaks these rules. Report anything that isn&apos;t OK with the ⋯ next to it, or email us.</li>
      </ul>

      <h2>Jaiye&apos;s games</h2>
      <p>The games are for fun. In some games Claude, an AI, grades your picks. It can be wrong, and that&apos;s part of the fun. Use a nickname on the leaderboards, not a real name.</p>

      <h2>What&apos;s yours and what&apos;s ours</h2>
      <ul>
        <li>Your nickname, picks and scores show on the boards. You let us show them on the site, in the app and in Run It Back videos.</li>
        <li>Jaiye&apos;s columns, the On The Court episodes and clips, the games and the Run It Back Picks name and look belong to us. Share links all you want. Please ask before you copy or reuse them.</li>
        <li>NBA, team and player names are used only to say who&apos;s playing. Those names belong to their owners. Run It Back Picks and jaiyesobo.com aren&apos;t connected to, sponsored or endorsed by the NBA or any team.</li>
      </ul>

      <h2>No promises, within reason</h2>
      <p>
        We work hard to keep things running and right, but the site, the games and the app are provided as they are. Stats can be late or wrong, and the site can go down. To the extent the law allows, we aren&apos;t responsible for losses that come from using the site, and if we are ever responsible for something, the most we owe is what you paid us, or $10 if you paid nothing. Some places don&apos;t allow these limits, so they may not apply to you.
      </p>

      <h2>Leaving</h2>
      <p>You can stop any time and delete your account in the app&apos;s Settings, or by emailing us. We can end an account that breaks these terms. How we handle your information is on the <Link href="/privacy" className={a}>Privacy page</Link>.</p>

      <h2>Changes</h2>
      <p>We may update these terms. We&apos;ll post the date at the top when we do, and if a change matters we&apos;ll tell you on the site or by email. California law applies to these terms.</p>

      <h2>Contact</h2>
      <p>
        SOBO Consulting LLC
        <br />
        {MAILING_ADDRESS}
        <br />
        {CONTACT_EMAIL}
      </p>
    </>
  );
}
