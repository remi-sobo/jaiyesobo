import { CATEGORIES, categoryOf, type Category, type SbItem } from "./types";

/** True once a week is built in tiles. Week 1 isn't. */
export function hasTiles(items: SbItem[]) {
  return items.some((i) => i.category !== null);
}

/** Items grouped by tile, in tile order. Empty tiles are left out. */
export function groupTiles<T extends SbItem>(items: T[]): Array<{ category: Category; items: T[] }> {
  return CATEGORIES.map((category) => ({ category, items: items.filter((i) => categoryOf(i) === category) })).filter((g) => g.items.length > 0);
}
