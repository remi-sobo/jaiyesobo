"use client";

import SlateEditor, { AddProp } from "./slate-editor";
import { useSbAction } from "./use-action";

export default SlateEditor;

/** Jaiye's Prop can still be added after the week opens. */
export function AddPropInline({ week }: { week: number }) {
  const { run, busy, error } = useSbAction();
  return (
    <div>
      <AddProp week={week} run={run} busy={busy} />
      {error ? <p className="mt-2 text-[0.85rem] text-[var(--color-red-soft)]">{error}</p> : null}
    </div>
  );
}
