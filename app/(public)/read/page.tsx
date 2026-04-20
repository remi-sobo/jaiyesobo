import type { Metadata } from "next";
import ComingSoon from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Read · Jaiye Sobo",
  description: "Every book I finish. Big Nate, Dog Man, whatever's next.",
};

export default function ReadPage() {
  return (
    <ComingSoon
      section="Read"
      number="04"
      tagline="Every book I finish. Big Nate, Dog Man, whatever's next."
      description="A running log of every book I've read. With my rating, my favorite part, and what I learned. Building a kid-sized library log that compounds over years."
      coming={[
        "Every book I finish, with a one-line review",
        "My current read: Spy School by Stuart Gibbs",
        "Star ratings and favorite chapters",
        "End-of-year top 10 list",
      ]}
    />
  );
}
