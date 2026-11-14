import type { Metadata } from "next";
import Link from "next/link";
import { confirmInfo } from "@/lib/email/subscribers";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Confirm your email · Run It Back Picks", robots: { index: false, follow: false }, referrer: "no-referrer" };

const mono = "font-[family-name:var(--font-jetbrains)]";
const serif = "font-[family-name:var(--font-fraunces)]";

export default async function ConfirmPage(props: { searchParams: Promise<{ t?: string; done?: string; failed?: string }> }) {
  const { t, failed } = await props.searchParams;
  const info = failed ? ({ ok: false } as const) : await confirmInfo(t);
  // Opening the link only shows the question. The address is confirmed by the button below (POST /api/email/confirm).
  const res = info.ok && info.status === "confirmed" ? info : ({ ok: false } as const);
  const ask = info.ok && info.status === "pending" ? info : null;

  return (
    <main className="px-5 py-[clamp(48px,8vw,110px)]">
      <div className="mx-auto max-w-[56ch]">
        <div className={`${mono} text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-red)]`}>Run It Back</div>
        {ask ? (
          <>
            <h1 className={`${serif} mt-3 text-[clamp(2.2rem,6vw,3.4rem)] font-black leading-[0.95] tracking-[-0.03em]`}>
              {ask.relation === "parent" && ask.playerName ? `Send ${ask.playerName}'s results to you?` : "One tap and you're in."}
            </h1>
            <p className="mt-5 text-[1.05rem] leading-relaxed text-[var(--color-mute)]">
              {ask.relation === "parent"
                ? "Run It Back Picks is a free NBA picks game with no money involved. You'll get the week's results every Monday. You can stop any time."
                : "You'll get your results every Monday, and a note when Jaiye has something new. You can stop any time."}
            </p>
            <form method="post" action="/api/email/confirm" className="mt-8">
              <input type="hidden" name="t" value={t ?? ""} />
              <button type="submit" className={`${mono} inline-flex min-h-12 items-center bg-[var(--color-red)] px-6 text-[0.72rem] uppercase tracking-[0.2em] text-[var(--color-black)] hover:bg-[var(--color-bone)]`}>
                {ask.relation === "parent" && ask.playerName ? `Yes, send ${ask.playerName}'s results to me` : "Yes, confirm my email"}
              </button>
            </form>
            <p className="mt-4 text-[0.9rem] text-[var(--color-mute)]">If this wasn&apos;t you, close this page. Nothing happens.</p>
          </>
        ) : res.ok ? (
          <>
            <h1 className={`${serif} mt-3 text-[clamp(2.4rem,7vw,4rem)] font-black leading-[0.95] tracking-[-0.03em]`}>
              You&apos;re <em className="font-normal italic text-[var(--color-red)]">in.</em>
            </h1>
            {res.relation === "parent" ? (
              <p className="mt-5 text-[1.05rem] leading-relaxed text-[var(--color-mute)]">
                {res.playerName ? `Thanks. You'll get ${res.playerName}'s results every Monday.` : "Thanks. You'll get the results every Monday."}
                {res.wantNewsletter ? " You'll also get a note when Jaiye has a new episode or column." : ""}
              </p>
            ) : (
              <p className="mt-5 text-[1.05rem] leading-relaxed text-[var(--color-mute)]">
                {res.wantResults ? "You'll get your results every Monday." : ""}
                {res.wantNewsletter ? " You'll get one email when Jaiye has a new episode or column." : ""}
              </p>
            )}
            <p className="mt-3 text-[0.95rem] text-[var(--color-mute)]">You can change this or stop any time from the link at the bottom of any email.</p>
            <Link href="/runitback" className={`${mono} mt-8 inline-flex min-h-12 items-center bg-[var(--color-red)] px-6 text-[0.72rem] uppercase tracking-[0.2em] text-[var(--color-black)] hover:bg-[var(--color-bone)]`}>
              Go to Run It Back
            </Link>
          </>
        ) : (
          <>
            <h1 className={`${serif} mt-3 text-[clamp(2rem,6vw,3.2rem)] font-black leading-tight`}>This link doesn&apos;t work.</h1>
            <p className="mt-5 text-[1.05rem] leading-relaxed text-[var(--color-mute)]">
              It may be too old (they last 7 days), or you may have unsubscribed since. Sign up again and we&apos;ll send a new one.
            </p>
            <Link href="/runitback" className={`${mono} mt-8 inline-flex min-h-12 items-center border border-[var(--color-line-strong)] px-6 text-[0.72rem] uppercase tracking-[0.2em] hover:border-[var(--color-red)]`}>
              Go to Run It Back
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
