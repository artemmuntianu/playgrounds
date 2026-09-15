/**
 * Reduces sun-light strength as cloud cover rises. 0 clear -> 1, heavy overcast -> ~0.3.
 *
 * The former `skyOverlayColor()` full-frame tint lived here; it was only used by the removed
 * `renderSkyTint()` pass, and the live sky / overcast handling is `renderSkyInto()` in
 * `lightPasses.ts` (cloud cover is passed straight through as a percentage).
 */
export function cloudDimFactor(cloudCoverPct: number): number {
  const c = Math.min(100, Math.max(0, cloudCoverPct));
  return 1 - (c / 100) * 0.7;
}
