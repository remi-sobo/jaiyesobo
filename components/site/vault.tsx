import Image from "next/image";
import type { VaultEntry } from "@/lib/content/types";
import { VAULT_STATUS } from "@/lib/content/vault";
import { formatDate, formatMonth } from "@/lib/content/format";
import { Accent, HandNote, SectionLabel } from "./type";

function StatusText({ status }: { status: VaultEntry["picks"][number]["status"] }) {
  const s = VAULT_STATUS[status];
  return (
    <span
      className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em]"
      style={{ color: s.color }}
    >
      {s.label}
    </span>
  );
}

/**
 * The full Vault, with the Portland photo band and one card per pick.
 * Lives at the bottom of /pod.
 */
export function VaultSection({ entry }: { entry: VaultEntry }) {
  return (
    <section className="border-t border-[var(--color-line)] bg-[var(--color-off-black)] px-5 py-[clamp(52px,7vw,104px)] min-[760px]:px-10">
      <div className="mx-auto max-w-[1200px]">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <SectionLabel>The Vault</SectionLabel>
            <h2 className="mt-5 font-[family-name:var(--font-fraunces)] text-[clamp(2.2rem,4.6vw,3.4rem)] font-black leading-[0.95] tracking-[-0.03em]">
              <Accent text={`Locked until ${formatMonth(entry.opensOn)}.`} accent={`${formatMonth(entry.opensOn)}.`} />
            </h2>
          </div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase leading-relaxed tracking-[0.2em] text-[var(--color-mute)] md:text-right">
            <div>Jaiye said it {formatDate(entry.saidOn)}</div>
            <div>Opening at the end of the season</div>
          </div>
        </div>

        <div className="relative mt-10 aspect-[21/9] min-h-[220px] w-full overflow-hidden">
          <Image
            src="/jaiye-portland.jpg"
            alt="Jaiye on the waterfront in Portland, Oregon"
            fill
            sizes="(max-width: 1200px) 100vw, 1200px"
            className="object-cover object-[center_42%]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.25)_0%,transparent_40%,rgba(10,10,10,0.8)_100%)]" />
          <div className="absolute bottom-0 left-0 p-6 md:p-8">
            <p className="font-[family-name:var(--font-fraunces)] text-[clamp(1.2rem,2.6vw,1.8rem)] font-black leading-tight tracking-[-0.02em]">
              Rip City. I said it out loud, in{" "}
              <em className="font-normal italic text-[var(--color-red)]">Portland.</em>
            </p>
            <p className="mt-2 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[rgba(245,241,234,0.7)]">
              Waterfront · Portland, OR
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-px bg-[var(--color-line-strong)] [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
          {entry.picks.map((p) => (
            <div
              key={p.call}
              className="flex min-h-[170px] flex-col justify-between bg-[var(--color-black)] p-[26px]"
            >
              <p className="font-[family-name:var(--font-fraunces)] text-[1.4rem] font-black leading-tight tracking-[-0.02em]">
                {p.call}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
                  {p.tag}
                </span>
                <StatusText status={p.status} />
              </div>
            </div>
          ))}
        </div>

        <HandNote className="mt-8">No changing these later. Dad wrote them down.</HandNote>
      </div>
    </section>
  );
}

/** The compact Vault: no photo, stacked rows. Sits inside an episode page. */
export function VaultCompact({ entry }: { entry: VaultEntry }) {
  return (
    <section className="border border-[var(--color-line-strong)] bg-[var(--color-off-black)] p-6 md:p-8">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <SectionLabel>The Vault</SectionLabel>
          <h2 className="mt-4 font-[family-name:var(--font-fraunces)] text-[1.8rem] font-black leading-none tracking-[-0.03em]">
            <Accent text={`Locked until ${formatMonth(entry.opensOn)}.`} accent={`${formatMonth(entry.opensOn)}.`} />
          </h2>
        </div>
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase leading-relaxed tracking-[0.2em] text-[var(--color-mute)] sm:text-right">
          <div>Said it {formatDate(entry.saidOn)}</div>
          <div>Opening end of season</div>
        </div>
      </div>

      <ul className="mt-6 list-none">
        {entry.picks.map((p) => (
          <li
            key={p.call}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-[var(--color-line)] py-4"
          >
            <span className="font-[family-name:var(--font-fraunces)] text-[1.15rem] font-black tracking-[-0.02em]">
              {p.call}
            </span>
            <StatusText status={p.status} />
          </li>
        ))}
      </ul>
    </section>
  );
}
