# Event-Based Memory Test — AI Art Generation System

A browser-based tool for generating photorealistic AI variations of ECE Hub environment photos, designed for staff observational training. Upload a real Hub photo and the system produces N configurable variations at the click of a button — no backend, no installation.

## Live App

→ **[https://herman925.github.io/emr-art/](https://herman925.github.io/emr-art/)**

---

## What it does

1. **Upload** one or more Hub environment photos
2. **Configure** the generation parameters (environment type, change intensity, photo style, variation count)
3. **Generate** — the app calls the BFL FLUX.2 API and polls for results concurrently (up to 10 at once)
4. **Review** generated variations in the Album view — accept/reject flags, 1–5 star ratings, search, filter, group by
5. **Export** accepted variations as a ZIP for use in training materials

All data — session metadata, source photos, and generated images — is stored in your browser's IndexedDB and persists across page refreshes.

---

## Setup

No installation required. Open the live app and:

1. Click the **Settings** (gear) icon in the top-right
2. Enter your [BFL API key](https://dashboard.bfl.ai) — stored only in your browser, never sent anywhere except `api.bfl.ai`
3. Choose a FLUX.2 model and output scale
4. Upload photos and generate

### Local development

```bash
git clone https://github.com/herman925/emr-art.git
cd emr-art
npm install
npm run dev
```

For local development, API calls go directly to `api.bfl.ai` (no CORS issues in Node). For the GitHub Pages deployment, a Cloudflare Worker proxy is required — set `VITE_API_PROXY` in `.env.local` to your Worker URL.

---

## Features

### Generation
| Feature | Detail |
|---|---|
| Multi-upload | Queue multiple photos in a single session |
| Variation count | 1–50 variations per photo (configurable) |
| Concurrency | Up to 10 parallel API calls via semaphore |
| Output scale | 0.5×, 1×, 2×, 3×, 4× relative to source dimensions |
| Aspect ratio | Preserved exactly from source — each photo uses its own dimensions |
| Persistence | Sessions, source blobs, and generated images all survive page refresh |
| Interrupted jobs | Pending/polling variations are marked as errors on restore; blobs remain |

### Prompt Configuration
| Option | Values |
|---|---|
| Environment | General Hub, Art & Craft, Reading, Blocks, Dramatic Play, Science, Sensory, Music, Outdoor |
| Change Intensity | Minimal · Subtle · Moderate · Vivid · Obvious · Sweeping · Major |
| Photo Style | Match Source · Modern Digital · Natural Light · Fluorescent · Golden Hour · Overcast · Bright & Airy · High Contrast |
| Scene Description | Optional free-text to guide the AI (e.g. "ball pit, wide angle, foam mats") |
| Prompt Preview | Toggle to see the exact prompt sent to the API |

### Jobs View
- **Active Jobs** — uploads from the current session, shown as accordion cards
- **Previous Jobs** — restored from IndexedDB on page load, shown below active jobs
- Progress bar and status per job (generating → complete / partial errors)
- Preview button opens an image compare modal (curtain drag + side-by-side modes)
- Per-job remove; "Clear all" for active jobs

### Album View
- Flat grid of all completed variations across all sessions
- **Search** by source photo filename
- **Group By** — source photo, environment, intensity, review status, star rating
- **Filters** — review status (accepted / rejected / unreviewed), star rating with operators (> ≥ = ≤ <), environment, intensity, photo style
- Thumbnail size slider: 60 px → 600 px
- Each thumbnail shows a source photo overlay, flag badge, and star badge
- Click to open fullscreen **Lightbox** with keyboard navigation

### Lightbox
- Fullscreen view with right-side info panel
- Shows source photo, generation config (environment, intensity, scene, model), and pixel dimensions
- Accept (Y) / Reject (N) flags and 1–5 star rating
- Keyboard: `←` / `→` navigate, `Y` accept, `N` reject, `1–5` stars, `Esc` close

### Export
- Bulk ZIP download via the **Export** button in the header
- Filter by flag (accepted / rejected / unreviewed) and star rating before exporting
- Original source photo included alongside its variations in the ZIP

### UI
- Dark / light theme toggle (Sun/Moon icon in header) — preference saved to `localStorage`
- Responsive two-panel layout (config sidebar left, jobs/album panel right)

---

## Models

All models are FLUX.2 generation, routed through `api.bfl.ai`.

| Model | ID | Steps | Cost/image | Notes |
|---|---|---|---|---|
| FLUX.2 [pro] | `flux-2-pro` | — | $0.040 | Recommended — best quality/speed balance |
| FLUX.2 [max] | `flux-2-max` | — | $0.060 | Maximum quality |
| FLUX.2 [flex] | `flux-2-flex` | 1–50 | $0.050 | Configurable steps + guidance |
| FLUX.2 [dev] | `flux-2-dev` | — | $0.025 | Lower cost dev access |
| FLUX.2 [pro] v1.1 | `flux-pro-1.1` | — | $0.040 | Legacy alias → flux-2-pro |
| FLUX.2 [pro] Ultra v1.1 | `flux-pro-1.1-ultra` | — | $0.060 | Legacy alias → flux-2-max |
| FLUX.2 Klein 4B | `flux-2-klein-4b` | 4 | $0.014 | Distilled, real-time speed |
| FLUX.2 Klein 9B | `flux-2-klein-9b` | 4 | $0.020 | Distilled, 9B params |
| FLUX.2 Klein Base 4B | `flux-2-klein-base-4b` | 50 | $0.014 | Full quality, CFG |
| FLUX.2 Klein Base 9B | `flux-2-klein-base-9b` | 50 | $0.020 | Full quality, 9B params |

Klein models run 4 distilled steps at near real-time speed. Base Klein models run 50 full-quality steps. Flex/Max expose guidance (1.5–10) and steps (1–50) controls in Settings.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Storage | [localforage](https://github.com/localForage/localForage) (IndexedDB — sessions, image blobs, source blobs) |
| AI API | [BFL FLUX.2](https://docs.bfl.ml) via async polling |
| CORS proxy | Cloudflare Worker (production only) |
| Export | [JSZip](https://stuk.github.io/jszip/) |
| Icons | [lucide-react](https://lucide.dev) |
| Hosting | GitHub Pages |

---

## Architecture notes

### Browser-only storage
There is no backend. All state is stored in the browser:
- **Session metadata** (variation statuses, flags, ratings, config) → `localforage` default store (`emr-art`)
- **Generated image blobs** → `emr-art-images` IndexedDB store
- **Source photo blobs** → `emr-art-sources` IndexedDB store

Sessions are capped at 100 (oldest evicted with their blobs). `blobUrl` values are stripped before persisting and re-created from the stored blob on restore.

### Concurrent save race fix
Multiple variations completing simultaneously could previously overwrite each other's status in IndexedDB (read-modify-write race). The fix uses:
1. A **module-level update cache** (`variationUpdates: Map<sessId, Map<varId, updates>>`) that accumulates all terminal updates
2. A **per-session save queue** (`saveLocks: Map<sessId, Promise>`) that chains saves so IndexedDB writes are never concurrent for the same session
3. `buildSessionForSave()` is called *inside* each queued `.then()` so it always reads the latest cache state

### Output resolution
On upload, each file's natural pixel dimensions are read via a hidden `Image` element. The chosen output scale (0.5×–4×) is applied and the result is snapped to the nearest multiple of 32 (BFL requirement) before being sent as `width`/`height` in the API request. Each parallel job uses its own source photo's dimensions independently.

### Cloudflare Worker proxy
The BFL API does not emit CORS headers. In production (GitHub Pages), all API calls — including polling and image download — are routed through a Cloudflare Worker. The Worker forwards the original BFL host via `x-bfl-host` to handle regional subdomains.

---

## Docs

- [`docs/PRD.md`](docs/PRD.md) — Product Requirements Document
- [`docs/QUICK_REFERENCE.md`](docs/QUICK_REFERENCE.md) — BFL API Quick Reference

---

## License

Code: Apache 2.0 · Docs: CC BY 4.0
