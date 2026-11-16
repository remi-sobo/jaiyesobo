import type { WhoIs } from "@/lib/sportsbook/players";

/**
 * Nickname to real name, for Jaiye's own login. Kept apart from the pod prep
 * on purpose: prep is read on air, and real names must never be.
 */
export function WhoIsWho({ people }: { people: WhoIs[] }) {
  const named = people.filter((p) => p.real_name);
  return (
    <section className="mt-12 border-t border-[var(--color-line)] pt-8">
      <div className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-red)]" />
        <span>Who&apos;s who · private, never on air</span>
      </div>
      {named.length === 0 ? (
        <p className="mt-4 text-[0.95rem] text-[var(--color-warm-mute)]">Nobody has added a real name yet.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
          {named.map((p) => (
            <li key={p.id} className="flex items-baseline justify-between gap-4 border-t border-[var(--color-line)] py-2.5">
              <span className="font-semibold">{p.display_name}</span>
              <span className="text-[var(--color-warm-mute)]">{p.real_name}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
