/**
 * Per-kid copy tweaks. The same DB row (e.g. dad_notes) renders different
 * labels depending on whose admin context it's being viewed in.
 *
 * Decision recorded 2026-05-02 (kemisobo arch doc, decision log): note
 * feature renamed to "Note from Mommy & Daddy" for Kemi; stays "Dad's Note"
 * for Jaiye.
 */

export function getNoteLabel(kidName: string | undefined | null): string {
  const n = (kidName ?? "").toLowerCase();
  if (n === "kemi") return "Note from Mommy & Daddy";
  return "Dad's Note";
}

/** Casual variant for kid-facing UI (a touch warmer than the admin label). */
export function getNoteLabelKidFacing(kidName: string | undefined | null): string {
  const n = (kidName ?? "").toLowerCase();
  if (n === "kemi") return "💌 Note from Mommy & Daddy";
  return "Dad's Note";
}
