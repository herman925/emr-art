# EMR-ART

**AI-Enhanced Observational Training** — Generate photorealistic "spot the difference" training sets for Hub environments using the BFL Flux API.

## What it does

1. Upload a real Hub environment photo
2. AI generates 3 photorealistic variations (safety sign changes, equipment alterations, prop modifications)
3. Review and download the set
4. Switch to **Student View** — a 4-image grid where students identify the real photo

## Live App

→ **[https://hkkchan.github.io/emr-art/](https://hkkchan.github.io/emr-art/)**

## Setup

No installation needed. The app runs entirely in your browser.

1. Open the live app
2. Click **Settings** (gear icon)
3. Enter your [BFL API key](https://dashboard.bfl.ai) — stored only in your browser's local storage
4. Upload a photo and generate

## Local development

```bash
npm install
npm run dev
```

## Tech stack

- React 18 + TypeScript + Vite
- Tailwind CSS v4
- [localforage](https://github.com/localForage/localForage) for browser storage
- [BFL Flux API](https://api.bfl.ai) — `flux-pro-1.1` by default

## Key parameters

| Parameter | Default | Notes |
|---|---|---|
| `image_prompt_strength` | `0.35` | Preserves room structure while allowing controlled changes |
| Model | `flux-pro-1.1` | Configurable in settings |
| Variations | 3 per session | Safety, Equipment, Props |

## Docs

- [`docs/PRD.md`](docs/PRD.md) — Product Requirements Document v2.0
- [`docs/QUICK_REFERENCE.md`](docs/QUICK_REFERENCE.md) — BFL API Quick Reference
- [`docs/agents/`](docs/agents/) — Agent SOUL files (Morpheus, Trinity, Neo, Niobe)

## License

Code: Apache 2.0 · Docs: CC BY 4.0
