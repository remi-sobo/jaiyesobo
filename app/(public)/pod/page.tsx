import type { Metadata } from "next";
import ComingSoon from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Pod · Jaiye Sobo",
  description: "The podcast. Dad and I talk ball, faith, and what we're into.",
};

export default function PodPage() {
  return (
    <ComingSoon
      section="Pod"
      number="03"
      tagline="The podcast. Dad and I talk ball, faith, and what we're into."
      description="We're starting a podcast. Real conversations between a dad and his son, recorded and shared. Episode one drops soon."
      coming={[
        "Episode 1: Why we're doing this",
        "Episodes on basketball, faith, school, and being 8",
        "Guest episodes with people we look up to",
        "Show notes and episode artwork for every drop",
      ]}
    />
  );
}
