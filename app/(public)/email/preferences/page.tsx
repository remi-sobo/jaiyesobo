import type { Metadata } from "next";
import Link from "next/link";
import { prefsForToken } from "@/lib/email/subscribers";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Email preferences · Run It Back Picks", robots: { index: false, follow: false }, referrer: "no-referrer" };

const mono = "font-[family-name:var(--font-jetbrains)]";
const serif = "font-[family-name:var(--font-fraunces)]";

export default async function PreferencesPage(props: { searchParams: Promise<{ t?: string; done?: string }> }) {
  const { t, done } = await props.searchParams;
  const prefs = await prefsForToken(t).catch(() => null);

  if (!prefs || !t) {
    return (
      <main className="px-5 py-[clamp(48px,8vw,110px)]">
        <div className="mx-auto max-w-[56ch]">
          <div className={`${mono} text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-red)]`}>Run It Back</div>
          <h1 className={`${serif} mt-3 text-[clamp(2rem,6vw,3.2rem)] font-black leading-tight`}>This link doesn&apos;t work.</h1>
          <p className="mt-5 text-[1.05rem] leading-relaxed text-[var(--color-mute)]">
            It looks like an invalid link. Open the link from one of our emails again, or write to the address at the bottom of the privacy page and we&apos;ll take you off by hand.
          </p>
        </div>
      </main>
    );
  }

  const off = prefs.status === "unsubscribed";
  const row = "flex min-h-12 items-center gap-3 border border-[var(--color-line-strong)] px-4 py-3";
  return (
    <main className="px-5 py-[clamp(48px,8vw,110px)]">
      <div className="mx-auto max-w-[56ch]">
        <div className={`${mono} text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-red)]`}>Run It Back</div>
        <h1 className={`${serif} mt-3 text-[clamp(2rem,6vw,3.2rem)] font-black leading-tight`}>What I get</h1>
        <p className="mt-3 text-[1rem] text-[var(--color-mute)]">For {prefs.hint}</p>

        {done === "saved" ? <p className="mt-5 border border-[var(--color-line-strong)] px-4 py-3">Saved.</p> : null}
        {done === "unsubscribed" || off ? (
          <p className="mt-5 border border-[var(--color-line-strong)] px-4 py-3">You&apos;re unsubscribed. We won&apos;t email this address again unless you sign up again.</p>
        ) : null}
        {done === "error" ? <p className="mt-5 text-[var(--color-red-soft)]">Something went wrong. Try again.</p> : null}
        {prefs.status === "pending" ? (
          <p className="mt-5 text-[0.95rem] text-[var(--color-mute)]">This address isn&apos;t confirmed yet, so nothing is being sent. Use the button in the confirm email.</p>
        ) : null}

        {off ? null : (
          <form method="post" action="/api/email/preferences" className="mt-6 flex flex-col gap-3">
            <input type="hidden" name="t" value={t} />
            <label className={row}>
              <input type="checkbox" name="results" defaultChecked={prefs.results} className="h-5 w-5 accent-[var(--color-red)]" />
              <span>
                <span className="block text-[1rem]">{prefs.relation === "parent" ? "My player's results every Monday" : "My results every Monday"}</span>
              </span>
            </label>
            <label className={row}>
              <input type="checkbox" name="newsletter" defaultChecked={prefs.newsletter} className="h-5 w-5 accent-[var(--color-red)]" />
              <span className="text-[1rem]">Jaiye&apos;s newsletter: new episodes and columns</span>
            </label>
            <button type="submit" className={`${mono} min-h-12 bg-[var(--color-red)] px-6 text-[0.72rem] uppercase tracking-[0.2em] text-[var(--color-black)] hover:bg-[var(--color-bone)]`}>
              Save
            </button>
            <button
              type="submit"
              name="intent"
              value="unsubscribe"
              className={`${mono} min-h-12 border border-[var(--color-line-strong)] px-6 text-[0.72rem] uppercase tracking-[0.2em] hover:border-[var(--color-red)]`}
            >
              Unsubscribe from everything
            </button>
          </form>
        )}
        <Link href="/runitback" className="mt-8 inline-block text-[0.9rem] text-[var(--color-mute)] underline underline-offset-4 hover:text-[var(--color-red)]">
          Back to Run It Back
        </Link>
      </div>
    </main>
  );
}
