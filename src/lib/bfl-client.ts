import type { AppSettings, VariationConfig } from '../types';

const BFL_BASE = 'https://api.bfl.ai/v1';

interface BFLRequestBody {
  prompt: string;
  image_prompt?: string; // base64 image for image-to-image
  image_prompt_strength?: number;
  width?: number;
  height?: number;
  seed?: number;
  safety_tolerance?: number;
  output_format?: string;
}

interface BFLInitialResponse {
  id: string;
  polling_url: string;
  cost?: number; // actual credits charged (1 credit = $0.01 USD)
}

interface BFLPollingResponse {
  id: string;
  status: 'Ready' | 'Pending' | 'Request Moderated' | 'Content Moderated' | 'Error';
  result?: {
    sample: string;
  };
}

export async function startGeneration(
  settings: AppSettings,
  sourceBase64: string,
  variation: VariationConfig,
  seed: number
): Promise<BFLInitialResponse> {
  const endpoint = `${BFL_BASE}/${settings.model}`;

  const body: BFLRequestBody = {
    prompt: variation.prompt,
    image_prompt: sourceBase64,
    image_prompt_strength: settings.imageStrength,
    seed,
    safety_tolerance: settings.safetyTolerance,
    output_format: settings.outputFormat,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Key': settings.apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`BFL API error ${response.status}: ${error}`);
  }

  const data: BFLInitialResponse = await response.json();
  return data;
}

export async function pollResult(
  apiKey: string,
  pollingUrl: string
): Promise<BFLPollingResponse> {
  const response = await fetch(pollingUrl, {
    headers: { 'X-Key': apiKey },
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
  credits: number;
}

export async function fetchCredits(apiKey: string): Promise<BFLCreditsResponse> {
  const response = await fetch(`${BFL_BASE}/credits`, {
    headers: { 'X-Key': apiKey },
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
      // Strip the data URL prefix, BFL expects raw base64
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
