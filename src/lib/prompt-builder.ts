/**
 * Dynamic prompt builder for EMR-ART
 *
 * Context: ECE (Early Childhood Education) Hubs — community centres for children
 * with themed corners/stations (e.g. transport corner, dramatic play, art, etc.)
 *
 * Target output: same room, same camera angle, same architectural features —
 * but the corner SETUP inside the room looks meaningfully different.
 * Think: a different educator re-dressed the same corner in the same room.
 *
 * Hard constraints on every prompt:
 *   - No human beings or children ever appear
 *   - Camera angle, focal length, framing — identical
 *   - Room geometry (walls, ceiling, floor, windows, fixed structures) — identical
 *   - Lighting direction and colour temperature — identical
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
  'indoor-fluorescent':  'indoor overhead fluorescent lighting, crisp detail, high-fidelity early childhood environment documentation',
  'warm-golden-hour':    'warm golden-hour light streaming through windows, rich amber tones, cosy and welcoming atmosphere',
  'overcast-soft':       'overcast daylight through large windows, even diffused light, no harsh shadows, calm and neutral tones',
  'bright-airy':         'very bright, airy and spacious feel, white-balanced, Scandinavian-inspired clean aesthetic, high key',
  'high-contrast':       'bold dramatic contrast, deep shadows and bright highlights, editorial documentary style photography',
};

/**
 * All five levels describe re-dressing the CORNER SETUP inside a fixed room.
 * The room itself never changes. The question is how different the setup looks.
 *
 * Reference examples observed in real Hub samples:
 *   - Original: rough DIY cardboard train covered in blue tarp
 *   - Variation: same room/angle but train is now fully decorated, new wall maps,
 *     floor markings added, different equipment beside it
 * That gap is the target for the upper end of this scale.
 */
const INTENSITY_CHANGE: Record<ChangeIntensity, { label: string; icon: string; instruction: string }> = {
  minimal: {
    label: 'Noticeable',
    icon: '🔵',
    instruction:
      'Keep the same corner setup and theme but change several visible details: alter the colours of key props, swap some decorations, add or remove a few items from shelves or surfaces. The overall setup looks recognisably similar but a careful observer notices clear differences.',
  },
  subtle: {
    label: 'Significant',
    icon: '🟢',
    instruction:
      'The corner setup is visibly re-dressed: the main prop or installation has a noticeably different appearance (different colour scheme, different decorations, more or less elaborately finished), background shelves and wall displays have different contents, and some additional or removed equipment changes the overall arrangement. Same theme, but set up differently.',
  },
  moderate: {
    label: 'Dramatic',
    icon: '🟡',
    instruction:
      'The corner looks like it was completely rebuilt or re-decorated by a different person. The main installation or props have a substantially different visual style, finish, and colour palette. Wall displays, floor markings, and surrounding equipment are all different. The corner theme may be the same broad category but everything about its physical presentation is new.',
  },
  vivid: {
    label: 'Striking',
    icon: '🟠',
    instruction:
      'The corner has undergone a bold transformation. The primary installation or focal piece is dramatically reimagined — different form, material, and colour story. Every surface (floor, walls, shelves, ceiling hangings) contributes to a fresh visual identity. The corner is clearly the same type of space but feels like a completely different setup done by a creative educator with a strong new vision.',
  },
  obvious: {
    label: 'Extreme',
    icon: '🔴',
    instruction:
      'The corner has been entirely reimagined. While the room structure and camera angle are identical, the corner setup inside looks completely different — different theme or sub-theme, different props, different colours, different layout of furniture and equipment within the space. Like a fully different corner activity station has been installed in the same room.',
  },
  sweeping: {
    label: 'Sweeping',
    icon: '🟣',
    instruction:
      'Transform the entire interior so aggressively that only an expert could identify it as the same physical room. Replace every item — main structures, all furniture pieces, all props, all wall coverings, all floor elements. Introduce a radically different colour palette, a different activity theme, and a different spatial organisation. The only connection to the source image should be the architectural shell and camera position.',
  },
  major: {
    label: 'Total',
    icon: '⚫',
    instruction:
      'Completely replace everything inside the room with a totally different activity corner setup. Different theme, different furniture, different props, different wall decorations, different floor use. Only the room shell (walls, ceiling, floor surface, windows) and exact camera angle remain. The interior should be unrecognisable compared to the reference — as if an entirely different Hub corner was built inside the same four walls.',
  },
};

const HARD_RULES = [
  'No human beings, children, or people of any kind appear anywhere in the image — the scene is empty of people',
  'Camera angle, focal length, perspective, and framing — absolutely identical to the reference image',
  'Room geometry: walls, ceiling, floor surface, windows, doors, fixed structural features — identical to the reference image',
  'Lighting direction, light sources, colour temperature, and shadows — identical to the reference image',
];

export function buildPrompt(params: PromptParams, model: BFLModel): string {
  const envLabel      = ENV_LABEL[params.environment];
  const { instruction } = INTENSITY_CHANGE[params.intensity];
  const styleDesc     = STYLE_DESCRIPTOR[params.photoStyle];
  const sceneNote     = params.sceneDescription.trim()
    ? `The reference image shows: ${params.sceneDescription.trim()}.`
    : '';

  if (isKleinModel(model)) {
    return [
      `Photorealistic photograph of a ${envLabel}. No people.`,
      sceneNote,
      `LOCKED — camera angle, lighting, room shell: identical to reference.`,
      `CHANGE the corner setup: ${instruction}`,
      `${styleDesc}. No humans in the image.`,
    ].filter(Boolean).join(' ');
  }

  return JSON.stringify({
    scene: `Photorealistic photograph of a ${envLabel}, based on the provided reference image${sceneNote ? '. ' + sceneNote : ''}`,
    hard_rules: HARD_RULES,
    change_the_corner_setup: instruction,
    style: `Professional early childhood environment photography — ${styleDesc}`,
    output_quality: 'Ultra-high fidelity photorealism, indistinguishable from a real photograph',
  });
}

export function buildPromptPreview(params: PromptParams, model: BFLModel): string {
  if (isKleinModel(model)) return buildPrompt(params, model);
  const envLabel      = ENV_LABEL[params.environment];
  const { instruction } = INTENSITY_CHANGE[params.intensity];
  const styleDesc     = STYLE_DESCRIPTOR[params.photoStyle];
  const sceneNote     = params.sceneDescription.trim()
    ? `The reference image shows: ${params.sceneDescription.trim()}.`
    : '';
  return JSON.stringify({
    scene: `Photorealistic photograph of a ${envLabel}, based on the provided reference image${sceneNote ? '. ' + sceneNote : ''}`,
    hard_rules: HARD_RULES,
    change_the_corner_setup: instruction,
    style: `Professional early childhood environment photography — ${styleDesc}`,
    output_quality: 'Ultra-high fidelity photorealism, indistinguishable from a real photograph',
  }, null, 2);
}

export const INTENSITY_META = INTENSITY_CHANGE;
