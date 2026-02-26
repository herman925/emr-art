/**
 * Dynamic prompt builder for EMR-ART
 *
 * Context: ECE (Early Childhood Education) Hubs — community centres for children
 * with themed corners/stations (art, reading, blocks, dramatic play, etc.)
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

// ── ECE Hub environment labels ─────────────────────────────────────────────

const ENV_LABEL: Record<EnvironmentType, string> = {
  'general':       'children\'s Hub community centre common area',
  'art':           'children\'s art & craft corner in a Hub community centre',
  'reading':       'children\'s reading and library corner in a Hub community centre',
  'blocks':        'children\'s blocks and construction corner in a Hub community centre',
  'dramatic-play': 'children\'s dramatic play / home corner in a Hub community centre',
  'science':       'children\'s science and discovery corner in a Hub community centre',
  'sensory':       'children\'s sensory play area (sand and water) in a Hub community centre',
  'music':         'children\'s music corner in a Hub community centre',
  'outdoor':       'outdoor play area of a children\'s Hub community centre',
};

// ── Photo style descriptors ────────────────────────────────────────────────

const STYLE_DESCRIPTOR: Record<PhotoStyle, string> = {
  'match-source':        'photographic style, exposure, and colour temperature matching the reference image exactly',
  'modern-digital':      'shot on Sony A7IV, 24-70mm at 35mm, clean sharp, high dynamic range, modern digital photography',
  'natural-light':       'soft natural window light, warm and inviting, early childhood setting documentary photography',
  'indoor-fluorescent':  'indoor overhead lighting, crisp detail, high-fidelity early childhood environment documentation',
};

// ── ECE-specific change descriptors: category × intensity ─────────────────
// Per the guide: "describe what you want, not what you don't want."
// All changes are plausible real-world alterations a child safety observer would need to spot.

const CHANGE_DESCRIPTOR: Record<VariationCategory, Record<ChangeIntensity, string>> = {
  safety: {
    subtle: [
      'A single child safety item has been subtly altered —',
      'for example a power socket cover is missing from one outlet,',
      'a corner cushion guard has been removed from a table edge,',
      'or a safety notice has been rotated or partially obscured',
    ].join(' '),
    moderate: [
      'Two child safety items have changed:',
      'one safety notice or allergy alert sign has been removed or replaced with an incorrect version,',
      'and one safety fixture (such as a cabinet child-lock, gate latch, or first-aid kit position)',
      'has been altered or is absent from its designated location',
    ].join(' '),
    obvious: [
      'Multiple child safety features are absent or incorrect:',
      'safety signage (allergy alerts, emergency procedures, supervision notices) is missing or wrong,',
      'visible child-proofing fixtures (socket covers, corner guards, door stoppers)',
      'have been removed from several locations throughout the space',
    ].join(' '),
  },
  equipment: {
    subtle: [
      'A single piece of activity equipment or learning material has been relocated',
      'from its correct, labelled storage position to a nearby incorrect location',
    ].join(' '),
    moderate: [
      'Two or three activity materials or equipment items have been misplaced:',
      'items from one corner are placed in the wrong area,',
      'or one piece of equipment is entirely absent from its designated shelf or station',
    ].join(' '),
    obvious: [
      'A major piece of activity equipment is entirely absent from its expected position,',
      'and two additional items have been placed in clearly incorrect locations —',
      'for example blocks in the art corner, or art supplies on the reading shelf',
    ].join(' '),
  },
  props: {
    subtle: [
      'One small prop or decorative item on an activity surface has been replaced',
      'with a slightly different object of similar size —',
      'for example a different coloured crayon pot, a different book cover facing out,',
      'or a different small figurine on a shelf',
    ].join(' '),
    moderate: [
      'Several surface items on the activity table or display shelf have been rearranged or substituted —',
      'some moved to incorrect positions, one replaced with an unrelated object',
      'that does not belong in this corner\'s theme',
    ].join(' '),
    obvious: [
      'The primary activity surface or display has been significantly altered:',
      'most themed props and materials have been removed or replaced',
      'with completely different, unrelated objects that do not belong in this corner',
    ].join(' '),
  },
  environment: {
    subtle: [
      'A minor environmental detail in the Hub space has changed —',
      'such as a blind or curtain in a different position,',
      'a display board item repositioned, or a small wall label altered',
    ].join(' '),
    moderate: [
      'A visible environmental element has changed state —',
      'a storage unit door open instead of closed,',
      'a child\'s artwork display board contents altered,',
      'or a themed wall decoration removed or replaced',
    ].join(' '),
    obvious: [
      'A prominent environmental feature of the corner has been significantly changed or removed —',
      'a large section of the themed display, a key piece of furniture arrangement,',
      'or a defining feature of the corner\'s setup is absent or replaced',
    ].join(' '),
  },
};

// ── Core builder ───────────────────────────────────────────────────────────

export function buildPrompt(
  params: PromptParams,
  category: VariationCategory,
  model: BFLModel
): string {
  const envLabel   = ENV_LABEL[params.environment];
  const changeDesc = CHANGE_DESCRIPTOR[category][params.intensity];
  const styleDesc  = STYLE_DESCRIPTOR[params.photoStyle];

  if (isKleinModel(model)) {
    // Klein — concise natural language, ~50 words, distilled 4-step model
    return [
      `Photorealistic photograph of a ${envLabel}.`,
      `Identical camera angle, composition, and spatial layout to the reference image.`,
      changeDesc + '.',
      `All other elements preserved exactly as in the reference.`,
      `${styleDesc}.`,
      `High fidelity, indistinguishable from a real photograph.`,
    ].join(' ');
  }

  // Pro / Max / Flex / Dev — JSON structured format
  const structured = {
    scene: `Photorealistic photograph of a ${envLabel}, based on the provided reference image`,
    primary_change: changeDesc,
    style: `Professional early childhood environment photography — ${styleDesc}`,
    preservation_rules: [
      'Camera angle, perspective, focal length, and framing identical to the reference',
      'All lighting conditions, colour temperature, shadows, and reflections preserved exactly',
      'All structural elements — walls, floors, ceiling, fixed furniture, shelving — unchanged',
      'All items NOT mentioned in primary_change remain in their exact positions and states',
      'Depth of field, exposure level, and image sharpness matching the reference',
    ],
    output_quality: 'Ultra-high fidelity photorealism, indistinguishable from a real early childhood Hub photograph',
  };

  return JSON.stringify(structured);
}

// Pretty-print version for UI preview
export function buildPromptPreview(
  params: PromptParams,
  category: VariationCategory,
  model: BFLModel
): string {
  if (isKleinModel(model)) {
    return buildPrompt(params, category, model);
  }
  const envLabel   = ENV_LABEL[params.environment];
  const changeDesc = CHANGE_DESCRIPTOR[category][params.intensity];
  const styleDesc  = STYLE_DESCRIPTOR[params.photoStyle];
  return JSON.stringify({
    scene: `Photorealistic photograph of a ${envLabel}, based on the provided reference image`,
    primary_change: changeDesc,
    style: `Professional early childhood environment photography — ${styleDesc}`,
    preservation_rules: [
      'Camera angle, perspective, focal length, and framing identical to the reference',
      'All lighting conditions, colour temperature, shadows, and reflections preserved exactly',
      'All structural elements — walls, floors, ceiling, fixed furniture, shelving — unchanged',
      'All items NOT mentioned in primary_change remain in their exact positions and states',
      'Depth of field, exposure level, and image sharpness matching the reference',
    ],
    output_quality: 'Ultra-high fidelity photorealism, indistinguishable from a real early childhood Hub photograph',
  }, null, 2);
}
