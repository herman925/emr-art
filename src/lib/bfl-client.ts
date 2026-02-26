import type { AppSettings, VariationConfig, BFLModel } from '../types';

const BFL_BASE = 'https://api.bfl.ai/v1';

// FLUX.2 Pro/Max/Flex/Dev: input_image + input_image_2..8, no strength param
interface Flux2ProBody {
  prompt: string;
  input_image?: string;        // base64 — primary reference image
  input_image_2?: string;
  input_image_3?: string;
  input_image_4?: string;
  input_image_5?: string;
  input_image_6?: string;
  input_image_7?: string;
  input_image_8?: string;
  seed?: number;
  width?: number;
  height?: number;
  safety_tolerance?: number;
  output_format?: string;
}

// FLUX.2 Klein (distilled & base): same structure, but max 4 input images
interface Flux2KleinBody {
  prompt: string;
  input_image?: string;
  input_image_2?: string;
  input_image_3?: string;
  input_image_4?: string;
  seed?: number;
  width?: number;
  height?: number;
  safety_tolerance?: number;
  output_format?: string;
}

interface BFLInitialResponse {
  id: string;
  polling_url: string;
  cost?: number;       // credits charged (1 credit = $0.01 USD)
  input_mp?: number;
  output_mp?: number;
}

interface BFLPollingResponse {
  id: string;
  status: 'Ready' | 'Pending' | 'Request Moderated' | 'Content Moderated' | 'Error';
  result?: {
    sample: string;
  };
}

const KLEIN_MODELS: BFLModel[] = [
  'flux-2-klein-4b',
  'flux-2-klein-9b',
  'flux-2-klein-base-4b',
  'flux-2-klein-base-9b',
];

function isKleinModel(model: BFLModel): boolean {
  return KLEIN_MODELS.includes(model);
}

export async function startGeneration(
  settings: AppSettings,
  sourceBase64: string,
  variation: VariationConfig,
  seed: number
): Promise<BFLInitialResponse> {
  const endpoint = `${BFL_BASE}/${settings.model}`;

  // All FLUX.2 models use input_image (not image_prompt)
  // Klein supports up to 4 refs, Pro/Max/Flex/Dev up to 8
  // No image_prompt_strength — FLUX.2 conditions on reference images directly
  const body: Flux2ProBody | Flux2KleinBody = {
    prompt: variation.prompt,
    input_image: sourceBase64,
    seed,
    safety_tolerance: settings.safetyTolerance,
    output_format: settings.outputFormat,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-key': settings.apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`BFL API error ${response.status}: ${error}`);
  }

  return response.json();
}

export async function pollResult(
  apiKey: string,
  pollingUrl: string
): Promise<BFLPollingResponse> {
  const response = await fetch(pollingUrl, {
    headers: { 'x-key': apiKey },
  });

  if (!response.ok) {
    throw new Error(`Polling error ${response.status}`);
  }

  return response.json();
}

export async function downloadImageAsBlob(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to download image');
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export interface BFLCreditsResponse {
  credits: number; // raw credits, divide by 100 for USD
}

export async function fetchCredits(apiKey: string): Promise<BFLCreditsResponse> {
  const response = await fetch(`${BFL_BASE}/credits`, {
    headers: { 'x-key': apiKey },
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Credits check failed ${response.status}: ${err}`);
  }
  return response.json();
}

export function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data URL prefix — BFL expects raw base64
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export { isKleinModel };
