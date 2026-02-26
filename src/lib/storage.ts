import localforage from 'localforage';
import type { AppSettings, Session } from '../types';

const SETTINGS_KEY  = 'emr-art:settings';
const SESSIONS_KEY  = 'emr-art:sessions';
const SESSION_CAP   = 100; // max sessions stored (LRU eviction)

// Separate stores for binary image data so session metadata stays lean
const imageStore = localforage.createInstance({ name: 'emr-art-images' });
const srcStore   = localforage.createInstance({ name: 'emr-art-sources' });

// ── Settings ───────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  model: 'flux-2-pro',
  outputFormat: 'jpeg',
  safetyTolerance: 2,
  outputScale: 1,
  promptUpsampling: true,
  guidance: 5,
  steps: 50,
};

export async function loadSettings(): Promise<AppSettings> {
  const saved = await localforage.getItem<AppSettings>(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...saved };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await localforage.setItem(SETTINGS_KEY, settings);
}

// ── Session metadata ───────────────────────────────────────────────────────

export async function loadSessions(): Promise<Session[]> {
  const sessions = await localforage.getItem<Session[]>(SESSIONS_KEY);
  return sessions ?? [];
}

/**
 * Upsert a session. Sessions are stored without blobUrls (transient) —
 * only imageUrl (the CDN URL) and cost/seed metadata are persisted.
 * Cap enforced at SESSION_CAP; oldest sessions are evicted automatically.
 * When a session is evicted its stored blobs are cleaned up.
 */
export async function saveSession(session: Session): Promise<void> {
  const sessions = await loadSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);

  // Strip transient blobUrls before storing — they'll be re-created on restore
  const stripped: Session = {
    ...session,
    variations: session.variations.map((v) => ({ ...v, blobUrl: undefined })),
  };

  if (idx >= 0) {
    sessions[idx] = stripped;
  } else {
    sessions.unshift(stripped);
  }

  // Evict oldest sessions beyond the cap
  const evicted = sessions.splice(SESSION_CAP);
  for (const old of evicted) {
    await _deleteSessionBlobs(old);
  }

  await localforage.setItem(SESSIONS_KEY, sessions);
}


export async function deleteSession(id: string): Promise<void> {
  const sessions = await loadSessions();
  const target = sessions.find((s) => s.id === id);
  if (target) await _deleteSessionBlobs(target);
  await localforage.setItem(SESSIONS_KEY, sessions.filter((s) => s.id !== id));
}

async function _deleteSessionBlobs(session: Session): Promise<void> {
  await srcStore.removeItem(session.id);
  for (const v of session.variations) {
    await imageStore.removeItem(v.id);
  }
}

// ── Image blob persistence ─────────────────────────────────────────────────

/** Store the source photo blob for a session (survives page close). */
export async function saveSourceBlob(sessionId: string, blob: Blob): Promise<void> {
  await srcStore.setItem(sessionId, blob);
}

/** Restore a source photo blob URL. Returns null if not stored. */
export async function loadSourceBlobUrl(sessionId: string): Promise<string | null> {
  const blob = await srcStore.getItem<Blob>(sessionId);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

/** Store a generated variation image blob (survives page close). */
export async function saveImageBlob(variationId: string, blob: Blob): Promise<void> {
  await imageStore.setItem(variationId, blob);
}

/** Restore a variation image as a blob URL. Returns null if not stored. */
export async function loadImageBlobUrl(variationId: string): Promise<string | null> {
  const blob = await imageStore.getItem<Blob>(variationId);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

// ── Storage usage estimate ─────────────────────────────────────────────────

export interface StorageInfo {
  sessionCount: number;
  usedBytes: number;   // estimate via navigator.storage if available
  quotaBytes: number;
}

export async function getStorageInfo(): Promise<StorageInfo> {
  const sessions = await loadSessions();
  let usedBytes = 0;
  let quotaBytes = 0;

  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const est = await navigator.storage.estimate();
    usedBytes  = est.usage  ?? 0;
    quotaBytes = est.quota  ?? 0;
  }

  return { sessionCount: sessions.length, usedBytes, quotaBytes };
}
