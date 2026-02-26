import { useState, useEffect } from 'react';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../lib/storage';
import type { AppSettings } from '../types';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      setLoaded(true);
    });
  }, []);

  const updateSettings = async (updates: Partial<AppSettings>) => {
    const next = { ...settings, ...updates };
    setSettings(next);
    await saveSettings(next);
  };

  return { settings, updateSettings, loaded };
}
