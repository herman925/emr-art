export interface AppSettings {
  apiKey: string;
  model: BFLModel;
  imageStrength: number;
  outputFormat: 'jpeg' | 'png';
  safetyTolerance: number;
}

export type BFLModel =
  | 'flux-pro-1.1'
  | 'flux-pro-1.1-ultra'
  | 'flux-pro'
  | 'flux-dev';

// Cost per image in USD (from BFL pricing page)
export const MODEL_COST_USD: Record<BFLModel, number> = {
  'flux-pro-1.1': 0.04,
  'flux-pro-1.1-ultra': 0.06,
  'flux-pro': 0.05,
  'flux-dev': 0.025,
};

export type VariationCategory = 'safety' | 'equipment' | 'props' | 'environment';

export interface VariationConfig {
  category: VariationCategory;
  label: string;
  prompt: string;
}

export type VariationStatus = 'idle' | 'pending' | 'polling' | 'done' | 'error';

export interface GeneratedVariation {
  id: string;
  config: VariationConfig;
  status: VariationStatus;
  pollingUrl?: string;
  imageUrl?: string;
  blobUrl?: string;
  error?: string;
  seed?: number;
  cost?: number;
}

export interface Session {
  id: string;
  createdAt: string;
  sourceImageName: string;
  sourceImageUrl: string;
  variations: GeneratedVariation[];
}

export type AppView = 'upload' | 'generating' | 'review' | 'student';
