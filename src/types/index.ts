export interface AppSettings {
  apiKey: string;
  model: BFLModel;
  outputFormat: 'jpeg' | 'png';
  safetyTolerance: number;
  // Flex/Max only params (ignored for Pro/Dev/Klein)
  promptUpsampling?: boolean; // default true — auto-enriches prompt
  guidance?: number;          // 1.5–10, default 5
  steps?: number;             // 1–50, default 50
}

// All confirmed FLUX.2 API endpoint IDs (422 response = valid endpoint)
// Verified against api.bfl.ai — FLUX.1 models removed entirely
export type BFLModel =
  // FLUX.2 Pro family (api.bfl.ai new naming)
  | 'flux-2-pro'
  | 'flux-2-max'
  | 'flux-2-flex'
  | 'flux-2-dev'
  // FLUX.2 Pro family (legacy api path aliases — same models)
  | 'flux-pro-1.1'
  | 'flux-pro-1.1-ultra'
  // FLUX.2 Klein family (distilled, 4-step, real-time)
  | 'flux-2-klein-4b'
  | 'flux-2-klein-9b'
  // FLUX.2 Klein Base (non-distilled, 50-step, CFG)
  | 'flux-2-klein-base-4b'
  | 'flux-2-klein-base-9b';

// Cost per image in USD (sourced from docs.bfl.ai/pricing)
export const MODEL_COST_USD: Record<BFLModel, number> = {
  // Pro family
  'flux-2-pro':        0.040,
  'flux-2-max':        0.060,
  'flux-2-flex':       0.050,
  'flux-2-dev':        0.025,
  // Legacy aliases (same price as their equivalents)
  'flux-pro-1.1':      0.040, // = flux-2-pro
  'flux-pro-1.1-ultra': 0.060, // = flux-2-max
  // Klein distilled (fast, 4 steps)
  'flux-2-klein-4b':   0.014,
  'flux-2-klein-9b':   0.020,
  // Klein base (full quality, 50 steps)
  'flux-2-klein-base-4b': 0.014,
  'flux-2-klein-base-9b': 0.020,
};

export interface VariationConfig {
  label: string;
  prompt: string;
}

// ── Dynamic prompt parameters ──────────────────────────────────────────────

// ECE Hub corner/station types
export type EnvironmentType =
  | 'general'        // General Hub common area
  | 'art'            // Art & craft corner
  | 'reading'        // Reading / library corner
  | 'blocks'         // Blocks / construction corner
  | 'dramatic-play'  // Dramatic play / home corner
  | 'science'        // Science & discovery corner
  | 'sensory'        // Sensory / sand & water play
  | 'music'          // Music corner
  | 'outdoor';       // Outdoor play area

export type ChangeIntensity =
  | 'minimal'    // Noticeable
  | 'subtle'     // Significant
  | 'moderate'   // Dramatic
  | 'vivid'      // Striking  (new — between Dramatic and Extreme)
  | 'obvious'    // Extreme
  | 'sweeping'   // Sweeping  (new — between Extreme and Total)
  | 'major';     // Total

export type PhotoStyle =
  | 'match-source'
  | 'modern-digital'
  | 'natural-light'
  | 'indoor-fluorescent'
  | 'warm-golden-hour'
  | 'overcast-soft'
  | 'bright-airy'
  | 'high-contrast';

export interface PromptParams {
  environment: EnvironmentType;
  intensity: ChangeIntensity;
  photoStyle: PhotoStyle;
  sceneDescription: string; // optional free-text describing what's in the photo
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
