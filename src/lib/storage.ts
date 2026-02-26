import localforage from 'localforage';
import type { AppSettings, Session } from '../types';

const SETTINGS_KEY = 'emr-art:settings';
const SESSIONS_KEY = 'emr-art:sessions';

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  model: 'flux-2-pro',
  imageStrength: 0.35,
  outputFormat: 'jpeg',
  safetyTolerance: 2,
};

export async function loadSettings(): Promise<AppSettings> {
  const saved = await localforage.getItem<AppSettings>(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...saved };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await localforage.setItem(SETTINGS_KEY, settings);
}

export async function loadSessions(): Promise<Session[]> {
  const sessions = await localforage.getItem<Session[]>(SESSIONS_KEY);
  return sessions ?? [];
}

export async function saveSession(session: Session): Promise<void> {
  const sessions = await loadSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.unshift(session);
  }
  await localforage.setItem(SESSIONS_KEY, sessions.slice(0, 50));
}

export async function deleteSession(id: string): Promise<void> {
  const sessions = await loadSessions();
  await localforage.setItem(
    SESSIONS_KEY,
    sessions.filter((s) => s.id !== id)
  );
}
