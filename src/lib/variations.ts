import type { ChangeIntensity } from '../types';

export interface VariationDef {
  intensity: ChangeIntensity;
  indexWithinIntensity: number; // 0-based position among siblings of the same intensity
  totalForIntensity: number;    // total siblings of this intensity (for labelling)
}

/**
 * Expand a distribution map into an ordered list of variation definitions.
 * Intensities are emitted in the canonical order defined by INTENSITY_ORDER.
 */
const INTENSITY_ORDER: ChangeIntensity[] = [
  'minimal', 'subtle', 'moderate', 'vivid', 'obvious', 'sweeping', 'major',
];

export function makeVariations(dist: Partial<Record<ChangeIntensity, number>>): VariationDef[] {
  const result: VariationDef[] = [];
  for (const intensity of INTENSITY_ORDER) {
    const count = dist[intensity] ?? 0;
    if (count <= 0) continue;
    for (let i = 0; i < count; i++) {
      result.push({ intensity, indexWithinIntensity: i, totalForIntensity: count });
    }
  }
  return result;
}

export function totalVariations(dist: Partial<Record<ChangeIntensity, number>>): number {
  return Object.values(dist).reduce((sum, n) => sum + (n ?? 0), 0);
}
