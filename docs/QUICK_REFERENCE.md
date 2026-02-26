# BFL FLUX.2 API — Quick Reference

## Get Started

### 1. API Key
1. Go to [dashboard.bfl.ai](https://dashboard.bfl.ai)
2. Register and verify your email
3. Navigate to **API → Keys → Add Key**
4. Copy immediately — shown only once

### 2. Add Credits
- **API → Credits → Add Credits** (Stripe)
- **1 credit = $0.01 USD**

---

## Endpoints

```
Base URL:  https://api.bfl.ai/v1
Regional:  https://api.eu.bfl.ai/v1   (GDPR)
           https://api.us.bfl.ai/v1
```

All models follow the same two-step request/poll pattern:

```
POST  /v1/{model}           → { polling_url, cost, ... }
GET   {polling_url}         → { status, result: { sample } }
```

---

## Models

| Model ID | Family | Steps | Cost/image |
|---|---|---|---|
| `flux-2-pro` | Pro | — | $0.040 |
| `flux-2-max` | Pro | — | $0.060 |
| `flux-2-flex` | Pro | 1–50 | $0.050 |
| `flux-2-dev` | Pro | — | $0.025 |
| `flux-pro-1.1` | Pro (legacy) | — | $0.040 |
| `flux-pro-1.1-ultra` | Pro (legacy) | — | $0.060 |
| `flux-2-klein-4b` | Klein distilled | 4 | $0.014 |
| `flux-2-klein-9b` | Klein distilled | 4 | $0.020 |
| `flux-2-klein-base-4b` | Klein base | 50 | $0.014 |
| `flux-2-klein-base-9b` | Klein base | 50 | $0.020 |

**Klein models** are distilled (4-step, real-time speed) or base (50-step, CFG). Max 4 input images.
**Flex/Max** expose `guidance` (1.5–10), `steps` (1–50), and `prompt_upsampling`.
**Pro/Dev/legacy** take up to 8 input images; no guidance/steps controls.

---

## Request Bodies

### Pro / Dev / Legacy
```json
{
  "prompt": "string",
  "input_image": "base64_string",
  "seed": 42,
  "width": 1024,
  "height": 768,
  "safety_tolerance": 2,
  "output_format": "jpeg"
}
```

### Flex / Max (adds guidance + steps)
```json
{
  "prompt": "string",
  "input_image": "base64_string",
  "seed": 42,
  "width": 1024,
  "height": 768,
  "safety_tolerance": 2,
  "output_format": "jpeg",
  "prompt_upsampling": true,
  "guidance": 5,
  "steps": 50
}
```

### Klein (max 4 input images, no guidance/steps)
```json
{
  "prompt": "string",
  "input_image": "base64_string",
  "seed": 42,
  "width": 1024,
  "height": 768,
  "safety_tolerance": 2,
  "output_format": "jpeg"
}
```

> **Important:** Always send explicit `width` and `height`. Klein defaults to 336×256 if omitted. Dimensions must be multiples of 32.

---

## Response Format

### Initial response
```json
{
  "id": "...",
  "polling_url": "https://api.us2.bfl.ai/v1/get_result?id=...",
  "cost": 4,
  "input_mp": 0.79,
  "output_mp": 0.79
}
```
`cost` is in raw credits (divide by 100 for USD).

### Poll response
```json
{
  "id": "...",
  "status": "Ready",
  "result": {
    "sample": "https://delivery.bfl.ai/..."
  }
}
```

Possible statuses: `Pending` · `Ready` · `Error` · `Request Moderated` · `Content Moderated`

> **Image expiry:** Result URLs expire in ~10 minutes. Download and store the blob immediately.

---

## Polling Pattern (JavaScript)

```typescript
async function pollUntilReady(apiKey: string, pollingUrl: string, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const res = await fetch(pollingUrl, { headers: { 'x-key': apiKey } });
    const data = await res.json();

    if (data.status === 'Ready') return data.result.sample;
    if (['Error', 'Request Moderated', 'Content Moderated'].includes(data.status)) {
      throw new Error(`Generation failed: ${data.status}`);
    }
  }
  throw new Error('Timed out');
}
```

---

## CORS

The BFL API does not emit CORS headers. **Direct calls from a browser will fail.**

In production, proxy all requests (generation, polling, image download) through a server or Cloudflare Worker:
- Forward `x-key` for auth
- Forward `x-bfl-host` for regional polling subdomains (e.g. `api.us2.bfl.ai`)

For local development with Node/Vite proxy, CORS restrictions do not apply.

---

## Limits

| Limit | Value |
|---|---|
| Concurrent requests | 24 max |
| Image URL expiry | ~10 minutes |
| Dimension multiple | Must be divisible by 32 |
| Klein max input images | 4 |
| Pro/Flex/Dev max input images | 8 |

---

## Error Codes

| HTTP Status | Meaning | Fix |
|---|---|---|
| `402` | Insufficient credits | Add credits at dashboard.bfl.ai |
| `422` | Validation error | Check prompt, dimensions, param ranges |
| `429` | Rate limit | Back off and retry |
| `500–503` | Server error | Retry with exponential backoff |

---

## Useful Links

| Resource | URL |
|---|---|
| Documentation | https://docs.bfl.ml |
| API reference | https://api.bfl.ai/openapi.json |
| Dashboard | https://dashboard.bfl.ai |
| Pricing | https://bfl.ai/pricing |
| Playground | https://playground.bfl.ai |
| Support | flux@blackforestlabs.ai |

---

*Last updated: February 2026*
