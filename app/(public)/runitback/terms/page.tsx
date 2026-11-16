import type { Metadata } from "next";
import PolicyPage from "@/components/sportsbook/public/policy-page";
import TermsBody, { TERMS_UPDATED } from "@/components/legal/terms-body";

export const metadata: Metadata = { title: "Terms · Run It Back Picks" };

/** Same terms as /terms. The iPhone app links here. */
export default function TermsPage() {
  return (
    <PolicyPage title="Terms of use" updated={TERMS_UPDATED}>
      <TermsBody />
    </PolicyPage>
  );
}
