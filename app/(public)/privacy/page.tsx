import type { Metadata } from "next";
import PolicyPage from "@/components/sportsbook/public/policy-page";
import PrivacyBody, { PRIVACY_UPDATED } from "@/components/legal/privacy-body";

export const metadata: Metadata = { title: "Privacy · Jaiye Sobo" };

/** Site-wide privacy policy. Same text as /runitback/privacy. */
export default function SitePrivacyPage() {
  return (
    <PolicyPage title="Privacy" updated={PRIVACY_UPDATED} eyebrow="jaiyesobo.com">
      <PrivacyBody />
    </PolicyPage>
  );
}
