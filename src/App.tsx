import { useState, useCallback, useEffect } from 'react';
import { Settings, Layers, Package, LayoutGrid, List, Sun, Moon } from 'lucide-react';
import { useSettings } from './hooks/useSettings';
import { useTheme } from './hooks/useTheme';
import SettingsModal from './components/SettingsModal';
import PhotoUploader from './components/PhotoUploader';
import JobAccordion from './components/JobAccordion';
import AlbumView from './components/AlbumView';
import BulkExportModal from './components/BulkExportModal';
import {
  startGeneration,
  pollResult,
  downloadImageAsBlob,
  toBase64,
} from './lib/bfl-client';
import { makeVariations } from './lib/variations';
import { buildPrompt } from './lib/prompt-builder';
import { createSemaphore } from './lib/semaphore';
import {
  saveSession,
  saveSourceBlob,
  saveImageBlob,
  loadImageBlobUrl,
  loadSourceBlobUrl,
  loadSessions,
  deleteSession,
} from './lib/storage';
import PromptConfig from './components/PromptConfig';
import type { Session, GeneratedVariation, PromptParams, VariationFlag } from './types';

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

/** Read the natural pixel dimensions of an image File. */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { resolve({ width: 1024, height: 768 }); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

/** Round n to the nearest multiple of 32, clamped to [64, 2048]. */
function snapTo32(n: number): number {
  return Math.min(2048, Math.max(64, Math.round(n / 32) * 32));
}

const semaphore = createSemaphore(10);

// Module-level cache: sessionId → Map<variationId, accumulated updates>
// Used to build correct session state for saving, since the `sess` object
// passed into generateVariation is stale (captured at creation time).
const variationUpdates = new Map<string, Map<string, Partial<GeneratedVariation>>>();

function applyUpdate(sessId: string, varId: string, updates: Partial<GeneratedVariation>) {
  if (!variationUpdates.has(sessId)) variationUpdates.set(sessId, new Map());
  const m = variationUpdates.get(sessId)!;
  m.set(varId, { ...m.get(varId), ...updates });
}

function buildSessionForSave(sess: Session): Session {
  const m = variationUpdates.get(sess.id);
  if (!m) return sess;
  return {
    ...sess,
    variations: sess.variations.map((v) => {
      const u = m.get(v.id);
      return u ? { ...v, ...u } : v;
    }),
  };
}

// Per-session save queue: each save chains off the previous so reads/writes to
// IndexedDB are serialised and never interleave with concurrent variation saves.
const saveLocks = new Map<string, Promise<void>>();

function enqueueSave(sess: Session): void {
  const prev = saveLocks.get(sess.id) ?? Promise.resolve();
  // buildSessionForSave is called inside .then() so it reads the cache AFTER
  // the previous save has finished — always reflects the latest completed updates.
  const next = prev.then(() => saveSession(buildSessionForSave(sess))).catch(() => {});
  saveLocks.set(sess.id, next);
}

type RightView = 'jobs' | 'album';

export default function App() {
  const { settings, updateSettings, loaded } = useSettings();
  const { theme, toggle: toggleTheme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport]     = useState(false);
  const [rightView, setRightView]       = useState<RightView>('jobs');

  // Active jobs (current session, lost on page refresh)
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  // Previous jobs (loaded from IndexedDB on mount)
  const [prevSessions, setPrevSessions]     = useState<Session[]>([]);

  const [variationCount, setVariationCount] = useState(3);
  const [promptParams, setPromptParams] = useState<PromptParams>({
    environment: 'general',
    intensity: 'obvious',
    photoStyle: 'match-source',
    sceneDescription: '',
  });

  // All sessions combined (active first, then previous) for album view
  const allSessions = [...activeSessions, ...prevSessions];

  // Load previous sessions from IndexedDB on mount
  useEffect(() => {
    if (!loaded) return;
    (async () => {
      const stored = await loadSessions();
      if (!stored.length) return;
      const restored = await Promise.all(
        stored.map(async (sess) => {
          const restoredVariations = await Promise.all(
            sess.variations.map(async (v) => {
              if (v.status === 'done' || v.status === 'idle') {
                // 'done': blobUrl stripped on save, restore it from imageStore
                // 'idle': leftover from old bug where session was saved with stale status
                const blobUrl = await loadImageBlobUrl(v.id);
                if (blobUrl) return { ...v, status: 'done' as const, blobUrl };
                // truly idle (no blob) — leave as error so user can see something went wrong
                if (v.status === 'idle') return { ...v, status: 'error' as const, error: 'Interrupted — regenerate to retry' };
                return v; // done but blob missing (e.g. storage cleared) — keep done, no image shown
              }
              if (v.status === 'pending' || v.status === 'polling') {
                return { ...v, status: 'error' as const, error: 'Interrupted — regenerate to retry' };
              }
              return v;
            })
          );
          const sourceUrl = await loadSourceBlobUrl(sess.id);
          return {
            ...sess,
            sourceImageUrl: sourceUrl ?? sess.sourceImageUrl,
            variations: restoredVariations,
          };
        })
      );
      setPrevSessions(restored);
    })();
  }, [loaded]);

  // ── Variation state updater (works across both lists) ────────────────────
  const updateVariation = useCallback(
    (sessionId: string, variationId: string, updates: Partial<GeneratedVariation>) => {
      const apply = (list: Session[]) =>
        list.map((sess) =>
          sess.id !== sessionId
            ? sess
            : { ...sess, variations: sess.variations.map((v) => v.id === variationId ? { ...v, ...updates } : v) }
        );
      setActiveSessions((prev) => apply(prev));
    },
    []
  );

  // ── Generation ───────────────────────────────────────────────────────────
  const generateVariation = useCallback(
    async (sess: Session, variation: GeneratedVariation, sourceBase64: string, width: number, height: number) => {
      const seed = Math.floor(Math.random() * 999999);
      updateVariation(sess.id, variation.id, { status: 'pending', seed });

      await semaphore.acquire();
      try {
        const { polling_url, cost } = await startGeneration(settings, sourceBase64, variation.config, seed, width, height);
        updateVariation(sess.id, variation.id, {
          status: 'polling',
          pollingUrl: polling_url,
          cost: cost != null ? cost / 100 : undefined,
        });

        let attempts = 0;
        while (attempts < 60) {
          await new Promise((r) => setTimeout(r, 2000));
          const result = await pollResult(settings.apiKey, polling_url);

          if (result.status === 'Ready' && result.result?.sample) {
            const { blobUrl, blob } = await downloadImageAsBlob(result.result.sample);
            await saveImageBlob(variation.id, blob);
            applyUpdate(sess.id, variation.id, { status: 'done', imageUrl: result.result.sample, seed });
            updateVariation(sess.id, variation.id, { status: 'done', imageUrl: result.result.sample, blobUrl });
            enqueueSave(sess);
            return;
          }
          if (['Error', 'Request Moderated', 'Content Moderated'].includes(result.status)) {
            throw new Error(`Generation failed: ${result.status}`);
          }
          attempts++;
        }
        throw new Error('Timed out waiting for generation');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        applyUpdate(sess.id, variation.id, { status: 'error', error: errorMsg });
        updateVariation(sess.id, variation.id, { status: 'error', error: errorMsg });
        enqueueSave(sess);
      } finally {
        semaphore.release();
      }
    },
    [settings, updateVariation]
  );

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      if (!settings.apiKey) { setShowSettings(true); return; }

      const newSessions: Session[] = files.map((file) => ({
        id: generateId(),
        createdAt: new Date().toISOString(),
        sourceImageName: file.name,
        sourceImageUrl: URL.createObjectURL(file),
        promptParams,
        model: settings.model,
        variations: makeVariations(variationCount).map((def) => ({
          id: generateId(),
          config: { label: def.label, prompt: buildPrompt(promptParams, settings.model) },
          status: 'idle' as const,
        })),
      }));

      setActiveSessions((prev) => [...newSessions, ...prev]);

      await Promise.all(
        newSessions.map(async (sess, i) => {
          const file = files[i];
          // Initialise the update cache for this session
          variationUpdates.set(sess.id, new Map());
          await saveSourceBlob(sess.id, file);
          await saveSession(sess); // saves initial idle state — will be overwritten as each variation completes
          const base64 = await toBase64(file);
          // Compute output dimensions from source image × scale factor, snapped to multiples of 32
          const scale = settings.outputScale ?? 1;
          const { width: srcW, height: srcH } = await getImageDimensions(file);
          const outW = snapTo32(srcW * scale);
          const outH = snapTo32(srcH * scale);
          await Promise.all(sess.variations.map((v) => generateVariation(sess, v, base64, outW, outH)));
          // No final saveSession(sess) here — each generateVariation saves its own terminal state
        })
      );
    },
    [settings, promptParams, variationCount, generateVariation]
  );

  const handleRegenerate = useCallback(
    async (variationId: string) => {
      const sess = allSessions.find((s) => s.variations.some((v) => v.id === variationId));
      if (!sess) return;
      const variation = sess.variations.find((v) => v.id === variationId);
      if (!variation) return;
      const imgResponse = await fetch(sess.sourceImageUrl);
      const blob = await imgResponse.blob();
      const file = new File([blob], 'source.jpg', { type: blob.type });
      const base64 = await toBase64(file);
      const scale = settings.outputScale ?? 1;
      const { width: srcW, height: srcH } = await getImageDimensions(file);
      const outW = snapTo32(srcW * scale);
      const outH = snapTo32(srcH * scale);
      await generateVariation(sess, variation, base64, outW, outH);
      await saveSession(sess);
    },
    [allSessions, generateVariation]
  );

  // ── Per-variation flag / rating ──────────────────────────────────────────
  const handleFlagVariation = useCallback((sessionId: string, variationId: string, flag: VariationFlag | undefined) => {
    const applyAndSave = (list: Session[], setter: React.Dispatch<React.SetStateAction<Session[]>>) => {
      const updated = list.map((sess) => {
        if (sess.id !== sessionId) return sess;
        const next = { ...sess, variations: sess.variations.map((v) => v.id === variationId ? { ...v, flag } : v) };
        saveSession(next);
        return next;
      });
      setter(updated);
      return updated;
    };
    applyAndSave(activeSessions, setActiveSessions);
    applyAndSave(prevSessions, setPrevSessions);
  }, [activeSessions, prevSessions]);

  const handleRateVariation = useCallback((sessionId: string, variationId: string, rating: number | undefined) => {
    const applyAndSave = (list: Session[], setter: React.Dispatch<React.SetStateAction<Session[]>>) => {
      const updated = list.map((sess) => {
        if (sess.id !== sessionId) return sess;
        const next = { ...sess, variations: sess.variations.map((v) => v.id === variationId ? { ...v, rating } : v) };
        saveSession(next);
        return next;
      });
      setter(updated);
    };
    applyAndSave(activeSessions, setActiveSessions);
    applyAndSave(prevSessions, setPrevSessions);
  }, [activeSessions, prevSessions]);

  // ── Remove job ───────────────────────────────────────────────────────────
  const handleRemoveActive = useCallback((sessionId: string) => {
    setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
    deleteSession(sessionId);
  }, []);

  const handleRemovePrev = useCallback((sessionId: string) => {
    setPrevSessions((prev) => prev.filter((s) => s.id !== sessionId));
    deleteSession(sessionId);
  }, []);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Layers size={32} className="animate-pulse text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">

      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 shrink-0">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Layers size={18} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-none">Event-Based Memory Test</h1>
              <p className="text-xs text-gray-400 mt-0.5">AI Art Generation System</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={() => setShowExport(true)}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <Package size={15} />
              Export
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className={`p-2 rounded-lg transition-colors ${
                settings.apiKey
                  ? 'text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700'
                  : 'text-white bg-indigo-600 hover:bg-indigo-500'
              }`}
              title="Settings"
            >
              <Settings size={17} />
            </button>
          </div>
        </div>
      </header>

      {/* Two-panel body */}
      <div className="flex-1 flex overflow-hidden max-w-screen-xl mx-auto w-full">

        {/* ── Left panel: upload + config ── */}
        <aside className="w-96 shrink-0 border-r border-gray-800 flex flex-col overflow-y-auto">
          <div className="p-6 space-y-5">
            <div>
              <h2 className="text-base font-bold text-white">Generate Training Set</h2>
              <p className="text-sm text-gray-500 mt-1">Upload photos, configure options, and queue jobs.</p>
            </div>

            {!settings.apiKey && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-2.5">
                <span className="text-amber-400 shrink-0">⚠</span>
                <p className="text-sm text-amber-300/80">
                  API key required.{' '}
                  <button onClick={() => setShowSettings(true)} className="underline hover:text-amber-200">Open Settings</button>
                </p>
              </div>
            )}

            <PhotoUploader onFilesSelected={handleFilesSelected} />
            <PromptConfig
              params={promptParams}
              model={settings.model}
              onChange={setPromptParams}
              variationCount={variationCount}
              onVariationCountChange={setVariationCount}
            />
          </div>
        </aside>

        {/* ── Right panel ── */}
        <main className="flex-1 overflow-y-auto flex flex-col min-h-0">

          {/* View toggle tabs */}
          <div className="shrink-0 flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-800/60">
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setRightView('jobs')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  rightView === 'jobs' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <List size={14} />
                Jobs
                {activeSessions.length > 0 && (
                  <span className="text-xs bg-indigo-600 text-white px-1.5 py-0.5 rounded-full leading-none">
                    {activeSessions.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setRightView('album')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  rightView === 'album' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <LayoutGrid size={14} />
                Album
                {allSessions.flatMap((s) => s.variations.filter((v) => v.status === 'done')).length > 0 && (
                  <span className="text-xs bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded-full leading-none">
                    {allSessions.flatMap((s) => s.variations.filter((v) => v.status === 'done')).length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">

            {/* ── Jobs view ── */}
            {rightView === 'jobs' && (
              <div className="space-y-6">

                {/* Active jobs */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                      Active Jobs
                      {activeSessions.length > 0 && <span className="ml-2 text-gray-600 font-normal">— {activeSessions.length}</span>}
                    </h3>
                    {activeSessions.length > 0 && (
                      <button
                        onClick={() => setActiveSessions([])}
                        className="text-sm text-gray-600 hover:text-red-400 transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  {activeSessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center gap-3 py-10 text-gray-600 border border-dashed border-gray-800 rounded-xl">
                      <Layers size={28} className="opacity-20" />
                      <p className="text-sm">Upload photos on the left to start generating.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {activeSessions.map((sess) => (
                        <JobAccordion
                          key={sess.id}
                          session={sess}
                          onRegenerate={handleRegenerate}
                          onRemove={() => handleRemoveActive(sess.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Previous jobs */}
                {prevSessions.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                        Previous Jobs <span className="ml-2 text-gray-600 font-normal">— {prevSessions.length}</span>
                      </h3>
                    </div>
                    <div className="space-y-2.5">
                      {prevSessions.map((sess) => (
                        <JobAccordion
                          key={sess.id}
                          session={sess}
                          onRegenerate={handleRegenerate}
                          onRemove={() => handleRemovePrev(sess.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Album view ── */}
            {rightView === 'album' && (
              <AlbumView
                sessions={allSessions}
                onFlag={handleFlagVariation}
                onRate={handleRateVariation}
              />
            )}
          </div>
        </main>
      </div>

      {showSettings && (
        <SettingsModal settings={settings} onSave={updateSettings} onClose={() => setShowSettings(false)} />
      )}
      {showExport && (
        <BulkExportModal onClose={() => setShowExport(false)} />
      )}
    </div>
  );
}
