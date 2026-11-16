import type { Metadata } from "next";
import PolicyPage from "@/components/sportsbook/public/policy-page";
import TermsBody, { TERMS_UPDATED } from "@/components/legal/terms-body";

export const metadata: Metadata = { title: "Terms · Jaiye Sobo" };

/** Site-wide terms. Same text as /runitback/terms. */
export default function SiteTermsPage() {
  return (
    <PolicyPage title="Terms of use" updated={TERMS_UPDATED} eyebrow="jaiyesobo.com">
      <TermsBody />
    </PolicyPage>
  );
}
