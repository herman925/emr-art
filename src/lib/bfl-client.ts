import type { AppSettings, VariationConfig, BFLModel } from '../types';

// In production (GitHub Pages), VITE_API_PROXY must be set to your Cloudflare Worker URL
// e.g. https://emr-art-proxy.yourname.workers.dev/v1
// Locally, falls back to direct API (which works fine without CORS restrictions in tools/Node).
const BFL_BASE = (import.meta.env.VITE_API_PROXY as string | undefined)?.replace(/\/$/, '')
  ?? 'https://api.bfl.ai/v1';

// ── Per-model schemas (from official OpenAPI spec at docs.bfl.ml) ─────────────

// flux-2-pro, flux-2-dev, flux-pro-1.1, flux-pro-1.1-ultra
// Up to 8 reference images. No guidance/steps controls.
interface Flux2ProBody {
  prompt: string;
  input_image?: string;
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

// flux-2-flex, flux-2-max
// Up to 8 reference images + prompt_upsampling + guidance + steps
interface Flux2FlexBody extends Flux2ProBody {
  prompt_upsampling?: boolean; // default: true — auto-enriches prompt via Mistral
  guidance?: number;           // 1.5–10, default: 5
  steps?: number;              // 1–50, default: 50
}

// flux-2-klein-4b, flux-2-klein-9b, flux-2-klein-base-4b, flux-2-klein-base-9b
// Max 4 reference images. No image_prompt_strength.
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

type AnyFluxBody = Flux2ProBody | Flux2FlexBody | Flux2KleinBody;

export interface BFLInitialResponse {
  id: string;
  polling_url: string;
  cost?: number;      // credits charged (divide by 100 for USD)
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

const FLEX_MODELS: BFLModel[] = ['flux-2-flex', 'flux-2-max'];

export function isKleinModel(model: BFLModel): boolean {
  return KLEIN_MODELS.includes(model);
}

export function isFlexModel(model: BFLModel): boolean {
  return FLEX_MODELS.includes(model);
}

export async function startGeneration(
  settings: AppSettings,
  sourceBase64: string,
  variation: VariationConfig,
  seed: number,
  width: number,
  height: number,
): Promise<BFLInitialResponse> {
  const endpoint = `${BFL_BASE}/${settings.model}`;

  let body: AnyFluxBody;

  const w = width;
  const h = height;

  if (isKleinModel(settings.model)) {
    // Klein: max 4 input images, no guidance/steps/prompt_upsampling
    body = {
      prompt: variation.prompt,
      input_image: sourceBase64,
      seed,
      width: w,
      height: h,
      safety_tolerance: settings.safetyTolerance,
      output_format: settings.outputFormat,
    } satisfies Flux2KleinBody;
  } else if (isFlexModel(settings.model)) {
    // Flex/Max: up to 8 images + guidance + steps + prompt_upsampling
    body = {
      prompt: variation.prompt,
      input_image: sourceBase64,
      seed,
      width: w,
      height: h,
      safety_tolerance: settings.safetyTolerance,
      output_format: settings.outputFormat,
      prompt_upsampling: settings.promptUpsampling ?? true,
      guidance: settings.guidance,
      steps: settings.steps,
    } satisfies Flux2FlexBody;
  } else {
    // Pro / Dev / legacy aliases: up to 8 images, no extra params
    body = {
      prompt: variation.prompt,
      input_image: sourceBase64,
      seed,
      width: w,
      height: h,
      safety_tolerance: settings.safetyTolerance,
      output_format: settings.outputFormat,
    } satisfies Flux2ProBody;
  }

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
  // BFL returns polling URLs on regional subdomains (e.g. api.us2.bfl.ai).
  // Route them through our proxy, passing the original host in x-bfl-host.
  const target     = new URL(pollingUrl);
  const proxyBase  = BFL_BASE.replace(/\/v1\/?$/, '');
  const proxiedUrl = proxyBase + target.pathname + target.search;

  const response = await fetch(proxiedUrl, {
    headers: {
      'x-key':      apiKey,
      'x-bfl-host': target.hostname,
    },
  });

  if (!response.ok) {
    throw new Error(`Polling error ${response.status}`);
  }

  return response.json();
}

export async function downloadImageAsBlob(url: string): Promise<{ blobUrl: string; blob: Blob }> {
  // The result image is on Azure Blob Storage (bfldelivery*.blob.core.windows.net)
  // which also lacks CORS headers — route through our proxy the same way.
  const target     = new URL(url);
  const proxyBase  = BFL_BASE.replace(/\/v1\/?$/, '');
  const proxiedUrl = proxyBase + target.pathname + target.search;

  const response = await fetch(proxiedUrl, {
    headers: { 'x-bfl-host': target.hostname },
  });
  if (!response.ok) throw new Error('Failed to download image');
  const blob = await response.blob();
  return { blob, blobUrl: URL.createObjectURL(blob) };
}

export interface BFLCreditsResponse {
  credits: number; // raw credits — divide by 100 for USD
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
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
