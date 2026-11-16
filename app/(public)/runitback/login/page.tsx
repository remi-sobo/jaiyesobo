import type { Metadata } from "next";
import { BrandLockup } from "@/components/sportsbook/public/brand-lockup";
import { LinkSignIn } from "@/components/sportsbook/public/link-sign-in";

export const metadata: Metadata = {
  title: "Sign in · Run It Back Picks",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ t?: string }> };

/**
 * Where the "Sign me in" button in a login email lands. The token is used by a
 * button press (a POST), not by opening the page, so mail apps that open links
 * to scan them can't use it up first.
 */
export default async function LoginLinkPage({ searchParams }: Props) {
  const { t } = await searchParams;
  return (
    <main className="px-4 py-[clamp(40px,8vw,96px)]">
      <div className="mx-auto flex max-w-[420px] flex-col items-center gap-6 text-center">
        <BrandLockup variant="wordmark" h={44} className="mx-auto" />
        <h1 className="font-[family-name:var(--font-archivo)] text-[2rem] font-black italic uppercase leading-[1] tracking-[-0.02em]">Welcome back</h1>
        <LinkSignIn token={typeof t === "string" ? t : ""} />
      </div>
    </main>
  );
}
