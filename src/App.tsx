import { useState, useCallback, useEffect } from 'react';
import { Settings, Layers, History } from 'lucide-react';
import { useSettings } from './hooks/useSettings';
import SettingsModal from './components/SettingsModal';
import PhotoUploader from './components/PhotoUploader';
import JobAccordion from './components/JobAccordion';
import StudentModule from './components/StudentModule';
import HistoryModal from './components/HistoryModal';
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
} from './lib/storage';
import PromptConfig from './components/PromptConfig';
import type { Session, GeneratedVariation, PromptParams } from './types';

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

const semaphore = createSemaphore(10);

export default function App() {
  const { settings, updateSettings, loaded } = useSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory]   = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [studentSessionId, setStudentSessionId] = useState<string | null>(null);
  const [variationCount, setVariationCount] = useState(3);
  const [promptParams, setPromptParams] = useState<PromptParams>({
    environment: 'general',
    intensity: 'obvious',
    photoStyle: 'match-source',
    sceneDescription: '',
  });

  // ── Restore sessions on mount ────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    (async () => {
      const stored = await loadSessions();
      if (!stored.length) return;

      const restored = await Promise.all(
        stored.map(async (sess) => {
          const restoredVariations = await Promise.all(
            sess.variations.map(async (v) => {
              if (v.status === 'done' && !v.blobUrl) {
                const blobUrl = await loadImageBlobUrl(v.id);
                return blobUrl ? { ...v, blobUrl } : v;
              }
              if (v.status === 'pending' || v.status === 'polling') {
                return { ...v, status: 'error' as const, error: 'Interrupted — please regenerate' };
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

      setSessions(restored);
    })();
  }, [loaded]);

  const updateVariation = useCallback(
    (sessionId: string, variationId: string, updates: Partial<GeneratedVariation>) => {
      setSessions((prev) =>
        prev.map((sess) =>
          sess.id !== sessionId
            ? sess
            : {
                ...sess,
                variations: sess.variations.map((v) =>
                  v.id === variationId ? { ...v, ...updates } : v
                ),
              }
        )
      );
    },
    []
  );

  const generateVariation = useCallback(
    async (sess: Session, variation: GeneratedVariation, sourceBase64: string) => {
      const seed = Math.floor(Math.random() * 999999);
      updateVariation(sess.id, variation.id, { status: 'pending', seed });

      await semaphore.acquire();
      try {
        const { polling_url, cost } = await startGeneration(
          settings,
          sourceBase64,
          variation.config,
          seed
        );
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
            updateVariation(sess.id, variation.id, {
              status: 'done',
              imageUrl: result.result.sample,
              blobUrl,
            });
            return;
          }
          if (
            result.status === 'Error' ||
            result.status === 'Request Moderated' ||
            result.status === 'Content Moderated'
          ) {
            throw new Error(`Generation failed: ${result.status}`);
          }
          attempts++;
        }
        throw new Error('Timed out waiting for generation');
      } catch (err) {
        updateVariation(sess.id, variation.id, {
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        semaphore.release();
      }
    },
    [settings, updateVariation]
  );

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      if (!settings.apiKey) {
        setShowSettings(true);
        return;
      }

      const newSessions: Session[] = files.map((file) => {
        const variations: GeneratedVariation[] = makeVariations(variationCount).map((def) => ({
          id: generateId(),
          config: {
            label: def.label,
            prompt: buildPrompt(promptParams, settings.model),
          },
          status: 'idle' as const,
        }));

        return {
          id: generateId(),
          createdAt: new Date().toISOString(),
          sourceImageName: file.name,
          sourceImageUrl: URL.createObjectURL(file),
          variations,
        };
      });

      setSessions((prev) => [...newSessions, ...prev]);

      // Kick off generation for each session
      await Promise.all(
        newSessions.map(async (sess, i) => {
          const file = files[i];
          await saveSourceBlob(sess.id, file);
          await saveSession(sess);
          const base64 = await toBase64(file);
          await Promise.all(sess.variations.map((v) => generateVariation(sess, v, base64)));
          await saveSession(sess);
        })
      );
    },
    [settings, promptParams, variationCount, generateVariation]
  );

  const handleRegenerate = useCallback(
    async (variationId: string) => {
      const sess = sessions.find((s) => s.variations.some((v) => v.id === variationId));
      if (!sess) return;
      const variation = sess.variations.find((v) => v.id === variationId);
      if (!variation) return;

      const imgResponse = await fetch(sess.sourceImageUrl);
      const blob = await imgResponse.blob();
      const base64 = await toBase64(new File([blob], 'source.jpg', { type: blob.type }));
      await generateVariation(sess, variation, base64);
      await saveSession(sess);
    },
    [sessions, generateVariation]
  );

  const handleRestoreSession = useCallback(async (restored: Session) => {
    const withBlobs = await Promise.all(
      restored.variations.map(async (v) => {
        if (v.status === 'done' && !v.blobUrl) {
          const blobUrl = await loadImageBlobUrl(v.id);
          return blobUrl ? { ...v, blobUrl } : v;
        }
        return v;
      })
    );
    const sourceUrl = await loadSourceBlobUrl(restored.id);
    const restoredSession: Session = {
      ...restored,
      sourceImageUrl: sourceUrl ?? restored.sourceImageUrl,
      variations: withBlobs,
    };
    setSessions((prev) => {
      // Replace if already present, otherwise prepend
      const exists = prev.some((s) => s.id === restored.id);
      return exists
        ? prev.map((s) => (s.id === restored.id ? restoredSession : s))
        : [restoredSession, ...prev];
    });
    setShowHistory(false);
  }, []);

  const studentSession = studentSessionId
    ? sessions.find((s) => s.id === studentSessionId) ?? null
    : null;

  if (!loaded) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Layers size={32} className="animate-pulse text-indigo-400" />
      </div>
    );
  }

  if (studentSession) {
    return (
      <StudentModule
        session={studentSession}
        onBack={() => setStudentSessionId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Layers size={18} />
            </div>
            <div>
              <h1 className="text-base font-semibold text-white leading-none">EMR-ART</h1>
              <p className="text-xs text-gray-400 mt-0.5">AI Observational Training</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              title="Generation history"
            >
              <History size={15} />
              History
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

      {/* Main */}
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {!settings.apiKey && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
            <div className="text-amber-400 mt-0.5 text-base">⚠</div>
            <div>
              <p className="text-amber-300 text-sm font-medium">API key required</p>
              <p className="text-amber-300/70 text-sm mt-0.5">
                Add your BFL API key in settings to start generating variations.{' '}
                <button onClick={() => setShowSettings(true)} className="underline hover:text-amber-200">
                  Open Settings →
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Upload + config always visible */}
        <div>
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-white">Generate Training Set</h2>
            <p className="text-gray-400 mt-2 text-sm max-w-md mx-auto">
              Upload Hub environment photos and AI will generate variations for observational training.
            </p>
          </div>
          <PromptConfig
            params={promptParams}
            model={settings.model}
            onChange={setPromptParams}
            variationCount={variationCount}
            onVariationCountChange={setVariationCount}
          />
          <PhotoUploader onFilesSelected={handleFilesSelected} />
        </div>

        {/* Jobs */}
        {sessions.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Jobs — {sessions.length}
            </h3>
            {sessions.map((sess) => (
              <JobAccordion
                key={sess.id}
                session={sess}
                onRegenerate={handleRegenerate}
                onStudentView={() => setStudentSessionId(sess.id)}
              />
            ))}
          </div>
        )}
      </main>

      {showSettings && (
        <SettingsModal settings={settings} onSave={updateSettings} onClose={() => setShowSettings(false)} />
      )}
      {showHistory && (
        <HistoryModal onRestore={handleRestoreSession} onClose={() => setShowHistory(false)} />
      )}
    </div>
  );
}
