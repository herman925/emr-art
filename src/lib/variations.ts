import type { VariationCategory } from '../types';

/**
 * Static category definitions — label + category only.
 * Prompts are generated dynamically at runtime via buildPrompt() in prompt-builder.ts.
 */
export const VARIATION_DEFINITIONS: { category: VariationCategory; label: string }[] = [
  { category: 'safety',    label: 'Safety Sign Change' },
  { category: 'equipment', label: 'Equipment Alteration' },
  { category: 'props',     label: 'Prop Modification' },
];
