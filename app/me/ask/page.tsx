import { requireKid } from "@/lib/session";
import AskDadForm from "@/components/me/ask-dad-form";

export const dynamic = "force-dynamic";

export default async function AskPage() {
  await requireKid();

  return (
    <main className="max-w-[640px] mx-auto px-6 py-16">
      <AskDadForm />
    </main>
  );
}
