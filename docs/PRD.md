# Product Requirements Document
## Event-Based Memory Test — AI Art Generation System

**Version:** 3.0
**Date:** February 2026
**Status:** Current

---

## 1. Overview

### Problem

Creating observational training materials for ECE Hub staff requires photorealistic "spot the difference" image sets — an original Hub environment photo alongside several AI-generated variations that introduce controlled differences (altered equipment, changed props, different lighting). Manually editing photos takes 2–4 hours per set and produces inconsistent results.

### Solution

A browser-based tool that accepts Hub environment photos and automatically generates N photorealistic variations via the BFL FLUX.2 API. The coordinator configures generation parameters (environment type, change intensity, photo style), uploads photos, and reviews the results before exporting a ZIP for use in training.

### Scope

The system is a **single-page React application** running entirely in the browser. There is no backend server, no database, and no user accounts. All data is stored in the browser's IndexedDB via localforage.

---

## 2. Users

| Persona | Role | Usage |
|---|---|---|
| Hub Coordinator | Uploads photos, configures generation, reviews output | Primary — 2–5 uploads per week |
| Training Manager | Reviews accepted/rejected variations, downloads ZIP | Secondary — during training cycles |

---

## 3. Functional Requirements

### 3.1 Photo Upload

- Accept JPEG/PNG files via drag-and-drop or file picker
- Support multi-file upload (batch queue)
- Display upload progress and per-job status
- Store source photo blob in IndexedDB; recover it on page refresh

### 3.2 Generation Configuration

**Prompt parameters** (set once, applied to all uploads in that session):

| Parameter | Options |
|---|---|
| Environment Type | General Hub, Art & Craft, Reading, Blocks, Dramatic Play, Science, Sensory, Music, Outdoor |
| Change Intensity | Minimal · Subtle · Moderate · Vivid · Obvious · Sweeping · Major |
| Photo Style | Match Source · Modern Digital · Natural Light · Fluorescent Indoor · Golden Hour · Overcast Soft · Bright & Airy · High Contrast |
| Scene Description | Optional free-text hint for the AI |
| Variation Count | 1–50 per photo |

**Model settings** (persisted in localStorage):

| Setting | Options | Default |
|---|---|---|
| FLUX.2 Model | flux-2-pro, flux-2-max, flux-2-flex, flux-2-dev, flux-2-klein-* | flux-2-pro |
| Output Scale | 0.5×, 1×, 2×, 3×, 4× relative to source dimensions | 1× |
| Output Format | JPEG, PNG | JPEG |
| Safety Tolerance | 0–6 | 2 |

Output dimensions are derived per-photo: source dimensions × scale, snapped to the nearest 32px, clamped to [64, 2048].

### 3.3 Jobs View

- Two sections: **Active Jobs** (current session) and **Previous Jobs** (restored from IndexedDB on mount)
- Each job shows: source photo thumbnail, filename, progress bar, done/total count
- Variations pending/polling on page refresh are shown as errors with a retry option
- Per-job preview modal: curtain-drag and side-by-side comparison modes
- Per-job remove; "Clear all" for active jobs

### 3.4 Album View

Flat grid of all completed variations across all sessions.

**Search:** filter by source photo filename (case-insensitive substring).

**Group By:** source photo · environment · intensity · review status · star rating.

**Filters:**
- Review status: all / accepted / rejected / unreviewed
- Star rating: operator (any / > / ≥ / = / ≤ / <) + value (1–5)
- Environment, intensity, photo style (independent dropdowns)

**Thumbnail size:** slider from 60 px to 600 px min-width per cell.

Each thumbnail overlays: source photo (bottom-left), flag badge (top-left), star badge (top-right). Hover shows variation label and filename.

### 3.5 Lightbox

Fullscreen view opened by clicking any album thumbnail.

- Main image fills available viewport space (object-contain)
- Right panel: original photo, pixel dimensions (W × H), generation config (environment, intensity, scene description, model)
- Review controls: Accept / Reject toggle buttons, 1–5 star rating
- Keyboard: `←` / `→` navigate, `Y` accept, `N` reject, `1`–`5` stars, `Esc` close
- Counter: current / total

### 3.6 Review System

Per-variation (not per-session):

| Field | Values |
|---|---|
| Flag | `accepted` · `rejected` · unset |
| Rating | 1–5 stars · unrated |

Both are persisted immediately via `saveSession()`.

### 3.7 Bulk Export

ZIP download filtered by flag and/or star rating. Each session folder in the ZIP contains the source photo and all matching variation images.

### 3.8 Theme

Light and dark mode toggle in the header. Default is dark. Preference is stored in `localStorage` and applied before first paint (inline script in `index.html`) to prevent flash.

---

## 4. Non-Functional Requirements

### Performance

| Metric | Target |
|---|---|
| Concurrent API calls | Up to 10 (semaphore-limited) |
| Poll interval | 2 seconds |
| Max poll attempts | 60 (2-minute timeout) |
| Page load (cold) | < 2 seconds |
| IndexedDB session cap | 100 sessions (LRU eviction) |

### Reliability

- Interrupted generations (pending/polling at page close) are shown as errors on restore with a retry option
- Image blobs written by old buggy sessions (status=idle, blob exists) are automatically recovered as `done` on restore
- Session saves are serialised per-session to prevent concurrent IndexedDB read-modify-write races

### Storage

All data lives in the browser's IndexedDB. No cloud storage. Users are responsible for exporting and backing up generated images.

---

## 5. System Architecture

```
Browser (React SPA)
│
├── UI Layer
│   ├── App.tsx               — layout, session state, generation orchestration
│   ├── PromptConfig          — generation parameter controls
│   ├── PhotoUploader         — drag-and-drop / file picker
│   ├── JobAccordion          — per-job status, preview modal
│   ├── AlbumView             — grid, search, filters, group-by
│   ├── AlbumLightbox         — fullscreen review, keyboard nav
│   ├── ImageCompareModal     — curtain + side-by-side compare
│   ├── BulkExportModal       — ZIP download with filter
│   └── SettingsModal         — API key, model, scale, format
│
├── Logic Layer
│   ├── lib/bfl-client.ts     — FLUX.2 API: startGeneration, pollResult, downloadImageAsBlob
│   ├── lib/prompt-builder.ts — buildPrompt(), INTENSITY_META, ENV_DISPLAY
│   ├── lib/variations.ts     — makeVariations()
│   ├── lib/semaphore.ts      — createSemaphore(10)
│   └── lib/storage.ts        — IndexedDB via localforage
│
├── State
│   ├── activeSessions[]      — jobs created this page load (React state)
│   └── prevSessions[]        — restored from IndexedDB on mount (React state)
│
└── Persistence (IndexedDB)
    ├── emr-art               — session metadata (status, flags, ratings, config)
    ├── emr-art-images        — generated variation blobs
    └── emr-art-sources       — source photo blobs
```

### API Flow

```
handleFilesSelected(files)
  │
  ├── getImageDimensions(file)   → natural W × H
  ├── computeOutputSize()        → scale × dims, snap to 32
  ├── saveSourceBlob()           → IndexedDB
  ├── saveSession()              → IndexedDB (initial idle state)
  └── for each variation:
        generateVariation(sess, variation, base64, w, h)
          │
          ├── semaphore.acquire()
          ├── startGeneration()  → POST /v1/{model}
          ├── pollResult()       → GET polling_url (every 2s, up to 60×)
          ├── downloadImageAsBlob()
          ├── saveImageBlob()    → IndexedDB
          ├── applyUpdate()      → module-level cache
          ├── updateVariation()  → React state (UI update)
          ├── enqueueSave()      → serialised IndexedDB write
          └── semaphore.release()
```

### Save Race Prevention

```
variationUpdates: Map<sessId, Map<varId, Partial<GeneratedVariation>>>
saveLocks:        Map<sessId, Promise<void>>

enqueueSave(sess):
  prev = saveLocks.get(sess.id) ?? resolved
  next = prev.then(() => saveSession(buildSessionForSave(sess)))
  saveLocks.set(sess.id, next)

buildSessionForSave(sess):
  merges variationUpdates cache onto sess.variations
  → always reflects all updates completed so far
```

---

## 6. Data Model

### Session (stored in IndexedDB, blobUrls stripped)

```typescript
interface Session {
  id: string;                    // random 8-char alphanumeric
  createdAt: string;             // ISO timestamp
  sourceImageName: string;       // original filename
  sourceImageUrl: string;        // object URL (transient; restored from blob on load)
  variations: GeneratedVariation[];
  promptParams?: PromptParams;   // config used for this session
  model?: string;                // BFL model ID used
}

interface GeneratedVariation {
  id: string;
  config: { label: string; prompt: string };
  status: 'idle' | 'pending' | 'polling' | 'done' | 'error';
  pollingUrl?: string;
  imageUrl?: string;             // CDN URL (expires in ~10 min; blob is the durable copy)
  blobUrl?: string;              // transient — re-created from IndexedDB blob on restore
  error?: string;
  seed?: number;
  cost?: number;                 // USD
  flag?: 'accepted' | 'rejected';
  rating?: number;               // 1–5
}
```

### AppSettings (stored in localStorage)

```typescript
interface AppSettings {
  apiKey: string;
  model: BFLModel;
  outputFormat: 'jpeg' | 'png';
  safetyTolerance: number;       // 0–6
  outputScale: number;           // 0.5 | 1 | 2 | 3 | 4
  promptUpsampling?: boolean;    // Flex/Max only
  guidance?: number;             // Flex/Max only, 1.5–10
  steps?: number;                // Flex/Max only, 1–50
}
```

---

## 7. Deployment

| Environment | URL | Notes |
|---|---|---|
| Production | https://herman925.github.io/emr-art/ | GitHub Pages, Cloudflare Worker proxy required |
| Local dev | http://localhost:5173 | Direct API calls, no proxy needed |

### Cloudflare Worker (production only)

BFL API does not emit CORS headers. All requests (generation, polling, image download) are routed through a Cloudflare Worker. The app sets `VITE_API_PROXY` to the Worker base URL. The Worker forwards the original BFL hostname via `x-bfl-host` to handle regional polling subdomains.

---

## 8. Out of Scope

The following were considered in earlier iterations and are explicitly excluded from the current product:

- Backend server, database, or cloud storage
- User accounts or authentication
- Student-facing "spot the difference" game view
- Jotform integration
- Push notifications or email
- Mobile app

---

## Document History

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-02-25 | Initial PRD (Jotform/Node/PostgreSQL architecture) |
| 2.0 | 2026-02-26 | Consolidated PRD — browser-only React SPA |
| 3.0 | 2026-02-26 | Full rewrite to match current implementation: album view, lightbox, group-by, search, theme toggle, output scale, save race fix |
