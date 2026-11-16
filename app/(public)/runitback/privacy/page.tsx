import type { Metadata } from "next";
import PolicyPage from "@/components/sportsbook/public/policy-page";
import PrivacyBody, { PRIVACY_UPDATED } from "@/components/legal/privacy-body";

export const metadata: Metadata = { title: "Privacy · Run It Back Picks" };

/** Same policy as /privacy. The iPhone app and the App Store link here. */
export default function PrivacyPage() {
  return (
    <PolicyPage title="Privacy" updated={PRIVACY_UPDATED}>
      <PrivacyBody />
    </PolicyPage>
  );
}
