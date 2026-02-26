/**
 * Dynamic prompt builder for EMR-ART
 *
 * Context: ECE (Early Childhood Education) Hubs — community centres for children
 * with themed corners/stations.
 *
 * Follows the official FLUX.2 prompting guide (docs.bfl.ml):
 *   • Pro / Max / Flex / Dev  → JSON structured prompts
 *   • Klein (distilled)       → concise natural language
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

const INTENSITY_DESCRIPTOR: Record<ChangeIntensity, string> = {
  subtle:   'Introduce one small, subtle change somewhere in the scene — something a careful observer would need to look closely to notice. The change should be plausible and realistic for this environment.',
  moderate: 'Introduce two or three realistic changes in the scene — a mix of relocated items, substituted objects, or altered details that an attentive observer would spot on a second look.',
  obvious:  'Introduce several clear, noticeable changes throughout the scene — missing items, wrongly placed objects, or altered features that stand out to any observer.',
};

export function buildPrompt(params: PromptParams, model: BFLModel): string {
  const envLabel      = ENV_LABEL[params.environment];
  const changeDesc    = INTENSITY_DESCRIPTOR[params.intensity];
  const styleDesc     = STYLE_DESCRIPTOR[params.photoStyle];

  if (isKleinModel(model)) {
    return [
      `Photorealistic photograph of a ${envLabel}.`,
      `Identical camera angle, composition, and spatial layout to the reference image.`,
      changeDesc,
      `All unchanged elements preserved exactly as in the reference.`,
      `${styleDesc}.`,
      `High fidelity, indistinguishable from a real photograph.`,
    ].join(' ');
  }

  return JSON.stringify({
    scene: `Photorealistic photograph of a ${envLabel}, based on the provided reference image`,
    changes: changeDesc,
    style: `Professional early childhood environment photography — ${styleDesc}`,
    preservation_rules: [
      'Camera angle, perspective, focal length, and framing identical to the reference',
      'All lighting conditions, colour temperature, shadows, and reflections preserved exactly',
      'All structural elements — walls, floors, ceiling, fixed furniture, shelving — unchanged',
      'Only items involved in the described changes should differ from the reference',
      'Depth of field, exposure level, and image sharpness matching the reference',
    ],
    output_quality: 'Ultra-high fidelity photorealism, indistinguishable from a real early childhood Hub photograph',
  });
}

export function buildPromptPreview(params: PromptParams, model: BFLModel): string {
  if (isKleinModel(model)) return buildPrompt(params, model);
  const envLabel   = ENV_LABEL[params.environment];
  const changeDesc = INTENSITY_DESCRIPTOR[params.intensity];
  const styleDesc  = STYLE_DESCRIPTOR[params.photoStyle];
  return JSON.stringify({
    scene: `Photorealistic photograph of a ${envLabel}, based on the provided reference image`,
    changes: changeDesc,
    style: `Professional early childhood environment photography — ${styleDesc}`,
    preservation_rules: [
      'Camera angle, perspective, focal length, and framing identical to the reference',
      'All lighting conditions, colour temperature, shadows, and reflections preserved exactly',
      'All structural elements — walls, floors, ceiling, fixed furniture, shelving — unchanged',
      'Only items involved in the described changes should differ from the reference',
      'Depth of field, exposure level, and image sharpness matching the reference',
    ],
    output_quality: 'Ultra-high fidelity photorealism, indistinguishable from a real early childhood Hub photograph',
  }, null, 2);
}
