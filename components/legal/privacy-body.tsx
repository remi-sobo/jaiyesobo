import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/sportsbook/contact";
import { MAILING_ADDRESS } from "@/lib/email/templates";
import { IP_LOG_DAYS, UNCONFIRMED_EMAIL_DAYS } from "@/lib/privacy/cleanup";

/** The date at the top of both privacy pages. Change it whenever the text below changes. */
export const PRIVACY_UPDATED = "November 15, 2026";

const a = "underline underline-offset-4";

/**
 * One privacy policy for all of jaiyesobo.com: the columns, the podcast, the
 * games, the newsletter, Run It Back Picks on the web, the web app and the
 * iPhone app, and the emails. Shown at /privacy and /runitback/privacy (the
 * address the iPhone app and the App Store link to). Keep it true to the code:
 * if the site starts collecting something new, it goes here first.
 */
export default function PrivacyBody() {
  return (
    <>
      <p>
        jaiyesobo.com is Jaiye&apos;s site: his columns, his podcast On The Court, his games, and Run It Back Picks, a free NBA pick&apos;em he runs with his dad Remi. It&apos;s run by SOBO Consulting LLC. This page covers all of it, including the Run It Back Picks app on iPhone and on the web, and the emails we send.
      </p>
      <p>We collect as little as we can, we use it only to run the site, and we never sell it.</p>

      <h2>The short version</h2>
      <ul>
        <li>Reading columns and watching episodes: we don&apos;t collect anything about you.</li>
        <li>Playing: we keep a nickname, your picks or scores, and a random id in a cookie so the site remembers you.</li>
        <li>Email is always optional. We email only addresses that were confirmed from a link we sent.</li>
        <li>Players under 13 use a nickname only. Their email can only be a parent&apos;s, and the parent says yes first.</li>
        <li>No ads, no ad tracking, no third party analytics. We don&apos;t sell or share your information.</li>
      </ul>

      <h2>What we collect, and why</h2>
      <p>
        <strong>Reading and watching.</strong> Columns and the home page collect nothing about you. Episodes play from YouTube in its privacy enhanced mode (youtube-nocookie.com). Once you press play, YouTube&apos;s own privacy policy applies to that video. Our short clips are files we host ourselves.
      </p>
      <p>
        <strong>The newsletter.</strong> Your email address, and whether you said you&apos;re 13 or older or a parent signing up a kid. We use it to send a note when Jaiye has a new episode or column.
      </p>
      <p>
        <strong>Jaiye&apos;s games.</strong> A random id in a cookie, so your games and streaks are remembered on this device. Your plays and scores. If you put your score on a leaderboard, the name you type there, which anyone can see. Please use a nickname, not a real name. In the games where Claude grades your draft or ranking, the picks you made and any names you typed are sent to Anthropic, the company that makes Claude, to write the result.
      </p>
      <p>
        <strong>Run It Back Picks.</strong> If you play, we keep:
      </p>
      <ul>
        <li>The nickname you choose. Everyone playing can see it.</li>
        <li>Whether you&apos;re 13 or older (yes or no). We don&apos;t ask your birthday.</li>
        <li>If you&apos;re 13 or older and choose to add it: your first and last name. Only Jaiye and Remi see it, so they know who&apos;s who. It&apos;s never shown to other players or on the site, in the app or on the podcast.</li>
        <li>Your player code, your picks, your leagues, your reactions, the preset trash talk lines you post, anyone you mute or report, and when you last played.</li>
        <li>In the app (iPhone or web): a sign in token kept on your device, and, for players 13 and up who turn alerts on, a push token so we can send them.</li>
        <li>Fans who aren&apos;t playing can react to picks and vote on who wins the week. We keep the reaction or vote and a random id in a cookie, nothing else.</li>
      </ul>
      <p>
        <strong>Email.</strong> If you add an email, we use it for your results every Monday, a note when Jaiye has a new episode or column, and, for players 13 and up, a login code when you ask for one. You choose which of these you get. We send nothing until the address is confirmed from a link in an email we send. If it isn&apos;t confirmed within {UNCONFIRMED_EMAIL_DAYS} days, we delete it. Every email except a login code has a link to change what you get or stop it.
      </p>
      <p>
        <strong>The Season Pass.</strong> Players 13 and up can buy a Season Pass on the website. Stripe handles the payment, so we never see your card. Stripe may ask for your email for a receipt. We keep that you have the pass, for which season, and Stripe&apos;s id for the payment.
      </p>
      <p>
        <strong>Stopping spam.</strong> When someone joins, signs in, makes a pick, posts, reports or signs up for email, we write down their IP address and the time, and use it only to slow down anyone trying too many times. We delete these after {IP_LOG_DAYS} days. Our host, Vercel, also keeps normal server logs (IP address and browser type) for a short time for security and fixing bugs.
      </p>

      <h2>Cookies and storage</h2>
      <p>We only use cookies the site needs to work. None of them are for ads or tracking you on other sites.</p>
      <ul>
        <li><strong>sb_player</strong>: keeps you signed in to Run It Back Picks on the website. One year.</li>
        <li><strong>sb_visitor</strong>: a random id so your reactions and votes count once. One year.</li>
        <li><strong>jaiye_games_session</strong>: a random id so the games remember your scores and streaks. One year.</li>
        <li>Family sign in cookies, used only by Jaiye&apos;s family to get into their own pages.</li>
        <li>The Run It Back Picks web app keeps your sign in token in your browser&apos;s storage. The iPhone app keeps it in the phone&apos;s keychain.</li>
      </ul>

      <h2>Who else handles it</h2>
      <p>We use a few companies to run the site. They only get what they need to do their job for us, and they can&apos;t use it for their own purposes.</p>
      <ul>
        <li>Supabase stores our database.</li>
        <li>Vercel hosts the site.</li>
        <li>Resend delivers our emails.</li>
        <li>Stripe takes Season Pass payments.</li>
        <li>Expo and Apple deliver push alerts to iPhones.</li>
        <li>Anthropic writes the results in the games where Claude grades your picks.</li>
        <li>YouTube plays our episodes when you press play.</li>
        <li>Some email apps load the fonts in our emails from Google.</li>
      </ul>
      <p>We get NBA schedules and box scores from ESPN. Nothing about you is sent to them. We&apos;d share information if the law required it, or to protect someone&apos;s safety.</p>

      <h2>What we don&apos;t do</h2>
      <ul>
        <li>We don&apos;t ask for a phone number, birthday, location, photos or contacts.</li>
        <li>No ads, no ad tracking and no third party analytics. We don&apos;t sell or share your information, and we don&apos;t share it with anyone for their marketing.</li>
        <li>No open chat. Trash talk is picked from a short list of preset lines.</li>
      </ul>

      <h2>Kids under 13</h2>
      <p>
        We built this with kids in mind. Jaiye is 9. Players under 13 can play Run It Back Picks with a nickname. We never ask them for a real name. They can&apos;t post trash talk or start leagues, they can&apos;t buy the Season Pass, and the app sends them no push alerts. From a player under 13 we keep only their nickname, their picks, reactions and leagues, their player code, the cookie or sign in token that keeps them signed in, and their IP address to stop spam, as described above. We use it only to run the game.
      </p>
      <p>
        A player under 13 can only get email at a parent&apos;s address. When an address is entered for a player under 13, we send the parent one email first that explains the game and asks if it&apos;s OK. Nothing else is sent until the parent taps the button. If the parent doesn&apos;t say yes within {UNCONFIRMED_EMAIL_DAYS} days, we delete their address. We never email the child.
      </p>
      <p>
        <strong>Parents</strong>, you can ask to see what we have about your child, ask us to delete it, or tell us to stop collecting anything more. Email {CONTACT_EMAIL} with your child&apos;s nickname or player code. We&apos;ll check that you&apos;re the parent before we act. You can also delete the account from the app&apos;s Settings. More for parents is on the <Link href="/runitback/parents" className={a}>For parents page</Link>.
      </p>
      <p>
        Jaiye&apos;s games don&apos;t ask anyone&apos;s age. If a child&apos;s real name ends up on a games leaderboard, email us and we&apos;ll take it off.
      </p>

      <h2>Keeping and deleting</h2>
      <ul>
        <li>We keep your information while you play. Delete your Run It Back account any time: in the app, Settings, then Delete account. On the website, email us. Your nickname, real name, player code, leagues, trash talk, push token, sign ins and every email address tied to the account (a parent&apos;s included) are removed. Old picks stay without a name so other players&apos; points don&apos;t change.</li>
        <li>Spam-log IP addresses are deleted after {IP_LOG_DAYS} days. Email addresses nobody confirms are deleted after {UNCONFIRMED_EMAIL_DAYS} days.</li>
        <li>When you unsubscribe, we keep the address marked as unsubscribed so we don&apos;t email it again. Email us if you want it gone completely.</li>
        <li>Stripe keeps payment records as the law requires.</li>
        <li>To remove a games score or name, email us.</li>
      </ul>

      <h2>Keeping it safe</h2>
      <p>
        Our database can only be reached from our own server. Sign in cookies are signed so they can&apos;t be faked. Only Remi and Jaiye can see the pages that show player details. No system is perfect, so we keep as little as we can. If something ever went wrong with your information, we&apos;d tell you.
      </p>

      <h2>Do Not Track</h2>
      <p>
        We don&apos;t track you across other websites, and we don&apos;t let anyone else track you on ours. So we treat everyone the same, whether or not your browser sends a Do Not Track or Global Privacy Control signal.
      </p>

      <h2>Changes to this page</h2>
      <p>
        When we change this page we update the date at the top. If a change matters, we&apos;ll also say so on the site and email anyone who gets our emails before it takes effect. We won&apos;t use a child&apos;s information in a new way without asking their parent again first.
      </p>

      <h2>Your choices</h2>
      <p>
        You can see and change your nickname, email and alerts in the app&apos;s Settings, and change what email you get from the link in any email. Email us to see, fix or delete anything else we have about you. If you live in California, you have the right to ask what we collect and to have it corrected, and we don&apos;t share personal information with anyone for their direct marketing.
      </p>

      <h2>Contact</h2>
      <p>
        SOBO Consulting LLC
        <br />
        {MAILING_ADDRESS}
        <br />
        {CONTACT_EMAIL}
      </p>
      <p>
        See also the <Link href="/terms" className={a}>Terms of use</Link>.
      </p>
    </>
  );
}
