/** Per-frame tally of nearby emissive posters — drives adaptive bloom. */

let nearEmissiveCount = 0;

export function resetNearEmissiveCount(): void {
  nearEmissiveCount = 0;
}

export function addNearEmissive(weight = 1): void {
  nearEmissiveCount += weight;
}

export function getNearEmissiveCount(): number {
  return nearEmissiveCount;
}

/** Scale bloom intensity down as more bright posters crowd the view. */
export function emissiveBloomScale(count: number): number {
  return Math.max(0.52, 1 / (1 + count * 0.13));
}
