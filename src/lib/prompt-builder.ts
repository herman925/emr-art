/**
 * Dynamic prompt builder for EMR-ART
 *
 * Follows the official FLUX.2 prompting guide (docs.bfl.ml):
 *   • Pro / Max / Flex / Dev  → JSON structured prompts for maximum scene control
 *   • Klein (distilled)       → concise natural language (shorter = better for 4-step models)
 *
 * Framework: Subject + Action + Style + Context (word order matters — most important first)
 */

import type {
  VariationCategory,
  EnvironmentType,
  ChangeIntensity,
  PhotoStyle,
  PromptParams,
} from '../types';
import type { BFLModel } from '../types';
import { isKleinModel } from './bfl-client';

// ── Environment labels ─────────────────────────────────────────────────────

const ENV_LABEL: Record<EnvironmentType, string> = {
  office:    'professional office',
  workshop:  'workshop / maintenance bay',
  warehouse: 'warehouse / storage facility',
  lab:       'laboratory / technical room',
  clinic:    'clinical / medical room',
  classroom: 'training classroom',
  generic:   'workplace interior',
};

// ── Photo style descriptors ────────────────────────────────────────────────
// Referenced directly from the FLUX.2 Style Reference Guide in the prompting guide.
// "match-source" deliberately avoids prescribing a camera so the model infers from
// the reference image's own style, which gives the best consistency.

const STYLE_DESCRIPTOR: Record<PhotoStyle, string> = {
  'match-source':        'photographic style, exposure, and colour temperature matching the reference image exactly',
  'modern-digital':      'shot on Sony A7IV, 24-70mm at 35mm, clean sharp, high dynamic range, modern digital photography',
  'natural-light':       'soft natural window light, organic colours, documentary workplace photography',
  'indoor-fluorescent':  'indoor fluorescent overhead lighting, crisp detail, high-fidelity workplace documentary style',
};

// ── Change descriptors: category × intensity ───────────────────────────────
// Per the guide: "describe what you want, not what you don't want."
// Each descriptor is a single, specific, assertive statement of what has changed.

const CHANGE_DESCRIPTOR: Record<VariationCategory, Record<ChangeIntensity, string>> = {
  safety: {
    subtle:   'A single safety sign has been subtly modified — either rotated, partially obscured, or swapped for an incorrect variant with similar visual appearance',
    moderate: 'Two safety-related items have changed: one wall-mounted hazard or exit sign has been replaced or repositioned, and one piece of safety equipment (fire extinguisher, first-aid kit, or defibrillator) is absent or relocated from its designated mount',
    obvious:  'All safety signage and safety equipment markings are absent or replaced with incorrect versions — fire exit signs, hazard warnings, PPE indicators, and emergency equipment placements are all wrong',
  },
  equipment: {
    subtle:   'A single tool or portable equipment item has been relocated from its correct, designated position to a nearby incorrect location on the same surface',
    moderate: 'Two or three equipment items have swapped positions with each other, or one item has been completely removed from its designated area leaving a visible gap',
    obvious:  'A major piece of equipment is entirely absent from its expected position, and two additional items have been placed in clearly incorrect locations',
  },
  props: {
    subtle:   'One small prop or desk item has been replaced with a slightly different object of similar size and shape',
    moderate: 'Several surface items have been rearranged — some moved to wrong positions, one substituted with an unrelated object',
    obvious:  'The primary work surface has been significantly altered: most items removed or replaced with completely different, unrelated objects',
  },
  environment: {
    subtle:   'A minor environmental detail has changed — such as a blind or curtain in a different position, a door slightly ajar instead of closed, or a ceiling panel displaced',
    moderate: 'A visible environmental element has changed state — a door open instead of closed, a wall-mounted notice board contents altered, or a window covering in a different configuration',
    obvious:  'A prominent environmental feature has been significantly changed or removed — a large section of wall, a door, or a ceiling-mounted fixture is absent or replaced',
  },
};

// ── Core builder ───────────────────────────────────────────────────────────

/**
 * Build the API prompt string for a given variation.
 *
 * Klein models (4-step distilled): concise natural language works best.
 * Pro / Max / Flex / Dev: JSON structured prompts give precise multi-element control.
 */
export function buildPrompt(
  params: PromptParams,
  category: VariationCategory,
  model: BFLModel
): string {
  const envLabel   = ENV_LABEL[params.environment];
  const changeDesc = CHANGE_DESCRIPTOR[category][params.intensity];
  const styleDesc  = STYLE_DESCRIPTOR[params.photoStyle];

  if (isKleinModel(model)) {
    // Klein — concise natural language, 30-60 words is ideal for distilled models
    // Priority order: subject → key change → style → preservation context
    return [
      `Photorealistic ${envLabel} interior photograph.`,
      `Identical camera angle, composition, and spatial layout to the reference image.`,
      changeDesc + '.',
      `All other elements preserved exactly as in the reference.`,
      `${styleDesc}.`,
      `High fidelity, indistinguishable from a real photograph.`,
    ].join(' ');
  }

  // Pro / Max / Flex / Dev — JSON structured format
  // Per guide: JSON gives precise control over complex scenes with multiple subjects.
  // Using a flat single-line JSON string (no whitespace) to keep token count low.
  const structured = {
    scene: `Photorealistic ${envLabel} interior photograph based on the provided reference image`,
    primary_change: changeDesc,
    style: `Professional workplace photography — ${styleDesc}`,
    preservation_rules: [
      'Camera angle, perspective, focal length, and framing identical to the reference',
      'All lighting conditions, colour temperature, shadows, and reflections preserved exactly',
      'All structural elements — walls, floors, ceiling, fixed furniture — unchanged',
      'All items NOT mentioned in primary_change remain in their exact positions and states',
      'Depth of field, exposure level, and image sharpness matching the reference',
    ],
    output_quality: 'Ultra-high fidelity photorealism, indistinguishable from a real workplace photograph',
  };

  return JSON.stringify(structured);
}

/**
 * Human-readable preview of the prompt (formatted JSON for Pro models,
 * plain text for Klein). Shown in the UI prompt-preview panel.
 */
export function buildPromptPreview(
  params: PromptParams,
  category: VariationCategory,
  model: BFLModel
): string {
  if (isKleinModel(model)) {
    return buildPrompt(params, category, model);
  }
  // Pretty-print the JSON for readability in the UI
  const envLabel   = ENV_LABEL[params.environment];
  const changeDesc = CHANGE_DESCRIPTOR[category][params.intensity];
  const styleDesc  = STYLE_DESCRIPTOR[params.photoStyle];
  return JSON.stringify({
    scene: `Photorealistic ${envLabel} interior photograph based on the provided reference image`,
    primary_change: changeDesc,
    style: `Professional workplace photography — ${styleDesc}`,
    preservation_rules: [
      'Camera angle, perspective, focal length, and framing identical to the reference',
      'All lighting conditions, colour temperature, shadows, and reflections preserved exactly',
      'All structural elements — walls, floors, ceiling, fixed furniture — unchanged',
      'All items NOT mentioned in primary_change remain in their exact positions and states',
      'Depth of field, exposure level, and image sharpness matching the reference',
    ],
    output_quality: 'Ultra-high fidelity photorealism, indistinguishable from a real workplace photograph',
  }, null, 2);
}
