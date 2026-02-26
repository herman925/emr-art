import type { VariationConfig } from '../types';

export const DEFAULT_VARIATIONS: VariationConfig[] = [
  {
    category: 'safety',
    label: 'Safety Sign Change',
    prompt:
      'Photorealistic Hub environment photograph, identical room layout, camera angle, furniture and structural elements preserved exactly. Change safety signs and notices: replace or remove hazard warning signs, alter fire exit signage, modify first-aid kit placement. Maintain all lighting conditions, wall textures, and spatial proportions. High fidelity, indistinguishable from real photograph.',
  },
  {
    category: 'equipment',
    label: 'Equipment Alteration',
    prompt:
      'Photorealistic Hub environment photograph, identical room layout, camera angle, furniture and structural elements preserved exactly. Alter equipment items: swap or relocate portable equipment, change tool positions on workbenches, add or remove equipment in designated areas. Maintain all lighting conditions, wall textures, and spatial proportions. High fidelity, indistinguishable from real photograph.',
  },
  {
    category: 'props',
    label: 'Prop Modification',
    prompt:
      'Photorealistic Hub environment photograph, identical room layout, camera angle, furniture and structural elements preserved exactly. Modify small props and consumables: change objects on desks or tables, alter decorative elements, swap stationery or supplies. Maintain all lighting conditions, wall textures, and spatial proportions. High fidelity, indistinguishable from real photograph.',
  },
];
