"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TALK_KEYS, TALK_LINES } from "@/lib/sportsbook/talk";

export type TalkView = { player_id: string; name: string; text: string };

async function post(body: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/sportsbook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = (await res.json().catch(() => ({}))) as { error?: string };
  return { ok: res.ok, ...j };
}

/**
 * Trash talk under a revealed pick. Players choose from the preset lines only.
 * Anyone can report a line; signed in players can mute someone.
 */
export function TalkBox({
  itemId,
  lines,
  meId,
  canTalk,
  myLine,
}: {
  itemId: string;
  lines: TalkView[];
  meId: string | null;
  /** Signed in, made this pick, 13 or older. */
  canTalk: boolean;
  myLine: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function act(body: Record<string, unknown>, done: string) {
    setBusy(true);
    const r = await post(body);
    setBusy(false);
    setMenu(null);
    setOpen(false);
    setNote(r.ok ? done : r.error ?? "Something went wrong.");
    if (r.ok) router.refresh();
  }

  if (lines.length === 0 && !canTalk) return null;

  return (
    <div className="border-t border-[var(--color-line)] pt-2">
      {lines.length ? (
        <ul className="flex flex-col gap-1">
          {lines.map((l) => (
            <li key={l.player_id} className="relative flex items-center gap-2 text-[0.82rem]">
              <span className="font-medium">{l.name}</span>
              <span className="min-w-0 flex-1 truncate italic text-[var(--color-mute)]">&ldquo;{l.text}&rdquo;</span>
              {l.player_id !== meId ? (
                <button
                  type="button"
                  aria-label={`Options for ${l.name}`}
                  onClick={() => setMenu(menu === l.player_id ? null : l.player_id)}
                  className="flex h-8 w-8 items-center justify-center text-[var(--color-mute)] hover:text-[var(--color-bone)]"
                >
                  ⋯
                </button>
              ) : null}
              {menu === l.player_id ? (
                <div className="absolute right-0 top-8 z-10 flex flex-col border border-[var(--color-line-strong)] bg-[var(--color-black)] text-[0.8rem]">
                  <button type="button" disabled={busy} className="px-3 py-2 text-left hover:bg-[var(--color-off-black)]" onClick={() => act({ action: "report", player_id: l.player_id, context: "talk", ref_id: itemId }, "Reported. Thanks for telling us.")}>
                    Report {l.name}
                  </button>
                  {meId ? (
                    <button type="button" disabled={busy} className="px-3 py-2 text-left hover:bg-[var(--color-off-black)]" onClick={() => act({ action: "mute", player_id: l.player_id, muted: true }, `${l.name} is muted for you.`)}>
                      Mute {l.name}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {canTalk ? (
        <div className="mt-1">
          {!open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="min-h-9 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.15em] text-[var(--color-mute)] hover:text-[var(--color-red)]"
            >
              {myLine ? "Change your line" : "Talk trash"}
            </button>
          ) : (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {TALK_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  disabled={busy}
                  onClick={() => act({ action: "talk", item_id: itemId, key: k }, "Posted.")}
                  className={`min-h-9 border px-2 text-[0.78rem] hover:border-[var(--color-red)] ${myLine === TALK_LINES[k] ? "border-[var(--color-red)]" : "border-[var(--color-line-strong)]"}`}
                >
                  {TALK_LINES[k]}
                </button>
              ))}
              {myLine ? (
                <button type="button" disabled={busy} onClick={() => act({ action: "talk", item_id: itemId, key: null }, "Removed.")} className="min-h-9 px-2 text-[0.78rem] text-[var(--color-mute)] underline-offset-4 hover:underline">
                  Remove mine
                </button>
              ) : null}
              <button type="button" onClick={() => setOpen(false)} className="min-h-9 px-2 text-[0.78rem] text-[var(--color-mute)]">
                Cancel
              </button>
            </div>
          )}
        </div>
      ) : null}
      {note ? <p className="mt-1 text-[0.75rem] text-[var(--color-mute)]" role="status">{note}</p> : null}
    </div>
  );
}
