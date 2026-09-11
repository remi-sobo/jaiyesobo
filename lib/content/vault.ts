import type { VaultEntry, VaultStatus } from "./types";

/**
 * Season predictions, saved the day Jaiye said them.
 *
 * Every pick carries its own status so they can resolve one at a time in
 * June instead of the whole board flipping at once. They stay "in-vault"
 * until the season has actually decided them.
 */
export const vaultEntries: VaultEntry[] = [
  {
    id: "season-2026",
    saidOn: "2026-09-09",
    opensOn: "2027-06-01",
    picks: [
      { call: "Wemby wins MVP", tag: "Award", status: "in-vault" },
      { call: "Sixers win the East", tag: "Conference", status: "in-vault" },
      { call: "Spurs win the championship", tag: "Title", status: "in-vault" },
      {
        call: "Blazers make the second round",
        tag: "Rip City",
        status: "in-vault",
      },
    ],
  },
];

export const VAULT_STATUS: Record<
  VaultStatus,
  { label: string; color: string }
> = {
  "in-vault": { label: "In the vault", color: "var(--color-mute)" },
  correct: { label: "Correct", color: "var(--color-bone)" },
  almost: { label: "Almost", color: "var(--color-games-yellow)" },
  wrong: { label: "Wrong", color: "var(--color-red)" },
  explain: {
    label: "Jaiye would like to explain",
    color: "var(--color-games-yellow)",
  },
};

export function getVaultEntry(id: string): VaultEntry | undefined {
  return vaultEntries.find((v) => v.id === id);
}
