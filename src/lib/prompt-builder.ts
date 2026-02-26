/**
 * Dynamic prompt builder for EMR-ART
 *
 * Context: ECE (Early Childhood Education) Hubs — community centres for children
 * with themed corners/stations.
 *
 * Core principle: camera angle + spatial layout = LOCKED.
 * Objects, colours, items within the scene = CHANGEABLE.
 */

import type { EnvironmentType, ChangeIntensity, PhotoStyle, PromptParams } from '../types';
import type { BFLModel } from '../types';
import { isKleinModel } from './bfl-client';

const ENV_LABEL: Record<EnvironmentType, string> = {
  'general':       "children's Hub community centre common area",
  'art':           "children's art & craft corner in a Hub community centre",
  'reading':       "children's reading and library corner in a Hub community centre",
  'blocks':        "children's blocks and construction corner in a Hub community centre",
  'dramatic-play': "children's dramatic play / home corner in a Hub community centre",
  'science':       "children's science and discovery corner in a Hub community centre",
  'sensory':       "children's sensory play area (sand and water) in a Hub community centre",
  'music':         "children's music corner in a Hub community centre",
  'outdoor':       "outdoor play area of a children's Hub community centre",
};

const STYLE_DESCRIPTOR: Record<PhotoStyle, string> = {
  'match-source':        'photographic style, exposure, and colour temperature matching the reference image exactly',
  'modern-digital':      'shot on Sony A7IV, 24-70mm at 35mm, clean sharp, high dynamic range, modern digital photography',
  'natural-light':       'soft natural window light, warm and inviting, early childhood setting documentary photography',
  'indoor-fluorescent':  'indoor overhead lighting, crisp detail, high-fidelity early childhood environment documentation',
};

// What changes — expressed as assertive instructions, not vague descriptions.
// The prompt explicitly separates LOCKED elements from CHANGEABLE elements.
const INTENSITY_CHANGE: Record<ChangeIntensity, { label: string; instruction: string }> = {
  minimal: {
    label: 'Minimal',
    instruction:
      'Change exactly ONE small detail anywhere in the scene — for example one object changes colour, one item is replaced with a slightly different version, or one small prop is missing. Everything else is pixel-perfect identical to the reference.',
  },
  subtle: {
    label: 'Subtle',
    instruction:
      'Change TWO or THREE small details in the scene — for example colours of specific objects shift, small props are swapped for different ones, or a minor item appears or disappears. Changes should require careful side-by-side comparison to notice.',
  },
  moderate: {
    label: 'Moderate',
    instruction:
      'Make FOUR to SIX visible changes throughout the scene — replace objects with different ones, change colours of prominent items, add or remove recognisable props, alter the appearance of a feature (e.g. the style or colour of a toy, a mat, or a storage unit). Changes should be clearly noticeable on inspection.',
  },
  obvious: {
    label: 'Obvious',
    instruction:
      'Make MANY prominent, immediately noticeable changes throughout the scene — objects are replaced with completely different ones, colours of large features change dramatically, items are added or removed, the appearance of key elements (furniture, toys, equipment, signage, wall displays) is clearly different. A viewer should spot several differences at a glance.',
  },
  major: {
    label: 'Major',
    instruction:
      'Transform the scene significantly — dramatically change the colours, contents, and appearance of most elements in the space. Replace, remove, or alter toys, furniture, wall displays, floor coverings, storage units, and props throughout. The scene should look like the same room photographed from the same angle but with a very different setup or theme applied to it.',
  },
};

export function buildPrompt(params: PromptParams, model: BFLModel): string {
  const envLabel   = ENV_LABEL[params.environment];
  const { instruction } = INTENSITY_CHANGE[params.intensity];
  const styleDesc  = STYLE_DESCRIPTOR[params.photoStyle];
  const sceneNote  = params.sceneDescription.trim()
    ? `The reference image shows: ${params.sceneDescription.trim()}.`
    : '';

  if (isKleinModel(model)) {
    return [
      `Photorealistic photograph of a ${envLabel}.`,
      sceneNote,
      `LOCKED — must be absolutely identical to the reference: camera angle, focal length, framing, perspective, spatial layout, room structure, walls, floor, ceiling, and all fixed architectural features.`,
      `CHANGEABLE — apply the following modifications: ${instruction}`,
      `${styleDesc}.`,
      `Output must be indistinguishable from a real photograph.`,
    ].filter(Boolean).join(' ');
  }

  return JSON.stringify({
    scene: `Photorealistic photograph of a ${envLabel}, based on the provided reference image${sceneNote ? '. ' + sceneNote : ''}`,
    LOCKED_must_be_identical: [
      'Camera angle, focal length, perspective, and framing — absolutely identical',
      'Spatial layout of the room — identical',
      'Walls, floor, ceiling, windows, doors, and all fixed architectural features — identical',
      'Lighting direction, colour temperature, and shadows — identical',
      'Depth of field and exposure — identical',
    ],
    CHANGEABLE_apply_these_modifications: instruction,
    style: `Professional early childhood environment photography — ${styleDesc}`,
    output_quality: 'Ultra-high fidelity photorealism, indistinguishable from a real photograph',
  });
}

export function buildPromptPreview(params: PromptParams, model: BFLModel): string {
  if (isKleinModel(model)) return buildPrompt(params, model);
  const envLabel   = ENV_LABEL[params.environment];
  const { instruction } = INTENSITY_CHANGE[params.intensity];
  const styleDesc  = STYLE_DESCRIPTOR[params.photoStyle];
  const sceneNote  = params.sceneDescription.trim()
    ? `The reference image shows: ${params.sceneDescription.trim()}.`
    : '';
  return JSON.stringify({
    scene: `Photorealistic photograph of a ${envLabel}, based on the provided reference image${sceneNote ? '. ' + sceneNote : ''}`,
    LOCKED_must_be_identical: [
      'Camera angle, focal length, perspective, and framing — absolutely identical',
      'Spatial layout of the room — identical',
      'Walls, floor, ceiling, windows, doors, and all fixed architectural features — identical',
      'Lighting direction, colour temperature, and shadows — identical',
      'Depth of field and exposure — identical',
    ],
    CHANGEABLE_apply_these_modifications: instruction,
    style: `Professional early childhood environment photography — ${styleDesc}`,
    output_quality: 'Ultra-high fidelity photorealism, indistinguishable from a real photograph',
  }, null, 2);
}

export const INTENSITY_META = INTENSITY_CHANGE;
