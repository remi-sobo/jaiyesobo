"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Game } from "@/lib/games/data";
import type { GamesAudience, KidSlug } from "@/lib/games/audience";

type Props = {
  games: Game[];
  initialAudience: GamesAudience | null;
};

const KID_LABELS: Record<KidSlug, { label: string; color: string }> = {
  jaiye: { label: "Jaiye", color: "var(--color-red)" },
  kemi: { label: "Kemi", color: "#C83C78" },
};

export default function GameAudiencePanel({ games, initialAudience }: Props) {
  const router = useRouter();
  const [audience, setAudience] = useState<GamesAudience>(
    initialAudience ?? { jaiye: [], kemi: [] }
  );
  const [seeded, setSeeded] = useState<boolean>(initialAudience !== null);
  const [busy, setBusy] = useState<string | null>(null);
  const [seedBusy, setSeedBusy] = useState(false);
  const [seedResult, setSeedResult] = useState<unknown>(null);

  async function seed() {
    setSeedBusy(true);
    setSeedResult(null);
    try {
      const res = await fetch("/api/admin/games/audience/seed", { method: "POST" });
      const json = await res.json();
      setSeedResult(json);
      if (res.ok && json?.audience) {
        setAudience(json.audience as GamesAudience);
        setSeeded(true);
        router.refresh();
      }
    } catch (err) {
      setSeedResult({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      setSeedBusy(false);
    }
  }

  async function toggle(game_slug: string, kid: KidSlug, on: boolean) {
    const key = `${game_slug}:${kid}`;
    setBusy(key);
    try {
      const res = await fetch("/api/admin/games/audience/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_slug, kid, on }),
      });
      const json = await res.json();
      if (res.ok && json?.audience) {
        setAudience(json.audience as GamesAudience);
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  function isOn(game_slug: string, kid: KidSlug): boolean {
    return audience[kid].includes(game_slug);
  }

  return (
    <section className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-6 mt-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 pb-5 border-b border-[var(--color-line)]">
        <div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-1.5">
            Setup · Game audience
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] font-semibold text-2xl tracking-[-0.02em] leading-tight">
            Who plays <span className="italic font-normal text-[var(--color-red)]">what.</span>
          </h2>
          <p className="text-[var(--color-warm-mute)] text-sm mt-2 max-w-[60ch] leading-relaxed">
            Toggles which games appear on each kid&apos;s public /games hub.
            Jaiye&apos;s hub lives at jaiyesobo.com/games. Kemi&apos;s hub
            lives at kemisobo.com/games. Both sites read this same config row,
            so a flip here moves a game between them.
          </p>
        </div>
        {!seeded && (
          <button
            type="button"
            onClick={seed}
            disabled={seedBusy}
            className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-5 py-3 rounded-sm hover:bg-[var(--color-red-bright)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {seedBusy ? "Seeding…" : "Seed defaults →"}
          </button>
        )}
        {seeded && (
          <button
            type="button"
            onClick={seed}
            disabled={seedBusy}
            className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] px-4 py-2.5 rounded-sm border border-[var(--color-line)] text-[var(--color-bone)] hover:border-[var(--color-bone)] disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {seedBusy ? "Re-syncing…" : "Re-sync defaults"}
          </button>
        )}
      </header>

      {!seeded && (
        <div className="mb-6 px-4 py-3 rounded border border-dashed border-[var(--color-warm-mute)] text-sm text-[var(--color-warm-mute)] italic font-[family-name:var(--font-fraunces)]">
          No audience config yet. Tap &quot;Seed defaults&quot; to write the
          baseline — every current jaiyesobo game on Jaiye&apos;s hub plus
          Think Tank on Kemi&apos;s — then toggle individual games below.
        </div>
      )}

      {seedResult !== null && (
        <pre className="mb-6 text-[0.65rem] font-[family-name:var(--font-jetbrains)] text-[var(--color-warm-mute)] bg-[var(--color-warm-surface-3)] border border-[var(--color-line)] rounded p-2 overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(seedResult, null, 2)}
        </pre>
      )}

      {seeded && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--color-line)]">
                <th className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] py-3 pr-4">
                  Game
                </th>
                {(Object.keys(KID_LABELS) as KidSlug[]).map((kid) => (
                  <th
                    key={kid}
                    className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] py-3 px-3 text-center"
                    style={{ color: KID_LABELS[kid].color }}
                  >
                    {KID_LABELS[kid].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.slug} className="border-b border-[var(--color-line)]/50">
                  <td className="py-3 pr-4">
                    <div className="font-[family-name:var(--font-fraunces)] font-semibold text-[var(--color-bone)] leading-tight">
                      {g.title}
                    </div>
                    <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)]">
                      {g.slug} · {g.status}
                    </div>
                  </td>
                  {(Object.keys(KID_LABELS) as KidSlug[]).map((kid) => {
                    const on = isOn(g.slug, kid);
                    const key = `${g.slug}:${kid}`;
                    const isBusy = busy === key;
                    return (
                      <td key={kid} className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggle(g.slug, kid, !on)}
                          disabled={isBusy}
                          aria-pressed={on}
                          className="w-12 h-7 rounded-full transition-colors relative disabled:opacity-50"
                          style={{
                            backgroundColor: on
                              ? KID_LABELS[kid].color
                              : "var(--color-warm-surface-3)",
                            border: `1px solid ${
                              on ? KID_LABELS[kid].color : "var(--color-line)"
                            }`,
                          }}
                          title={
                            on
                              ? `Hide on ${KID_LABELS[kid].label}'s /games`
                              : `Show on ${KID_LABELS[kid].label}'s /games`
                          }
                        >
                          <span
                            className="absolute top-0.5 w-5 h-5 rounded-full bg-[var(--color-bone)] transition-all"
                            style={{ left: on ? "calc(100% - 1.4rem)" : "0.125rem" }}
                          />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
