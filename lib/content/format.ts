const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sept", "Oct", "Nov", "Dec",
] as const;

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** Split an ISO date without letting the local timezone move the day. */
function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split("-").map(Number);
  return [y, m, d];
}

/** "2026-09-11" to "Sept 11, 2026". */
export function formatDate(iso: string): string {
  const [y, m, d] = parts(iso);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** "2026-09-23" to "Sept 23". Used where the year is already obvious. */
export function formatShortDate(iso: string): string {
  const [, m, d] = parts(iso);
  return `${MONTHS[m - 1]} ${d}`;
}

/** "2027-06-30" to "June". The Vault opens on a month, not a day. */
export function formatMonth(iso: string): string {
  const [, m] = parts(iso);
  return MONTHS_LONG[m - 1];
}

/** "003" for the No. 00X kickers. */
export function pad(n: number): string {
  return String(n).padStart(3, "0");
}

/** "01" for the Game 0X kickers. */
export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
