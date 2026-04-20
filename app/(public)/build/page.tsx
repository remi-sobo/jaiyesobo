import type { Metadata } from "next";
import ComingSoon from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Build · Jaiye Sobo",
  description: "Stuff I'm making. Code, projects, homeschool deep dives.",
};

export default function BuildPage() {
  return (
    <ComingSoon
      section="Build"
      number="02"
      tagline="Stuff I'm making. Code, projects, homeschool deep dives."
      description="When I make something, it lands here. Apps, art, school projects, experiments. The receipts of a kid who likes building things."
      coming={[
        "First coding projects I make with Dad",
        "Mark Rober experiments I've tried",
        "Homeschool deep dives — the stuff I went hard on",
        "Things I've drawn, written, or built with my hands",
      ]}
    />
  );
}
