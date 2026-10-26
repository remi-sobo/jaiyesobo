/** Standard competition ranking: ties share a rank (1, 1, 3). */
export function rankAt(points: number[], index: number): number {
  const mine = points[index];
  return points.filter((p) => p > mine).length + 1;
}
