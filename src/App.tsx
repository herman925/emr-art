import { useState, useCallback } from 'react';
import { Settings, GraduationCap, Layers } from 'lucide-react';
import { useSettings } from './hooks/useSettings';
import SettingsModal from './components/SettingsModal';
import PhotoUploader from './components/PhotoUploader';
import VariationCard from './components/VariationCard';
import StudentModule from './components/StudentModule';
import BatchDownload from './components/BatchDownload';
import {
  startGeneration,
  pollResult,
  downloadImageAsBlob,
  toBase64,
} from './lib/bfl-client';
import { VARIATION_DEFINITIONS } from './lib/variations';
import { buildPrompt } from './lib/prompt-builder';
import { saveSession } from './lib/storage';
import PromptConfig from './components/PromptConfig';
import type { Session, GeneratedVariation, AppView, PromptParams } from './types';
import { MODEL_COST_USD } from './types';

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function App() {
  const { settings, updateSettings, loaded } = useSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [view, setView] = useState<AppView>('upload');
  const [session, setSession] = useState<Session | null>(null);
  const [promptParams, setPromptParams] = useState<PromptParams>({
    environment: 'generic',
    intensity: 'moderate',
    photoStyle: 'match-source',
  });

  const updateVariation = useCallback(
    (sessionId: string, variationId: string, updates: Partial<GeneratedVariation>) => {
      setSession((prev) => {
        if (!prev || prev.id !== sessionId) return prev;
        return {
          ...prev,
          variations: prev.variations.map((v) =>
            v.id === variationId ? { ...v, ...updates } : v
          ),
        };
      });
    },
    []
  );

  const generateVariation = useCallback(
    async (sess: Session, variation: GeneratedVariation, sourceBase64: string) => {
      const seed = Math.floor(Math.random() * 999999);
      updateVariation(sess.id, variation.id, { status: 'pending', seed });

      try {
        const { polling_url, cost } = await startGeneration(
          settings,
          sourceBase64,
          variation.config,
          seed
        );
        // cost is in credits (1 credit = $0.01 USD)
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
            const blobUrl = await downloadImageAsBlob(result.result.sample);
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
      }
    },
    [settings, updateVariation]
  );

  const handlePhotoSelected = useCallback(
    async (file: File, previewUrl: string) => {
      if (!settings.apiKey) {
        setShowSettings(true);
        return;
      }

      const variations: GeneratedVariation[] = VARIATION_DEFINITIONS.map((def) => ({
        id: generateId(),
        config: {
          category: def.category,
          label: def.label,
          prompt: buildPrompt(promptParams, def.category, settings.model),
        },
        status: 'idle',
      }));

      const sess: Session = {
        id: generateId(),
        createdAt: new Date().toISOString(),
        sourceImageName: file.name,
        sourceImageUrl: previewUrl,
        variations,
      };

      setSession(sess);
      setView('generating');

      const base64 = await toBase64(file);

      await Promise.all(variations.map((v) => generateVariation(sess, v, base64)));

      await saveSession(sess);
    },
    [settings.apiKey, generateVariation]
  );

  const handleRegenerate = useCallback(
    async (variationId: string) => {
      if (!session) return;
      const variation = session.variations.find((v) => v.id === variationId);
      if (!variation) return;

      const imgResponse = await fetch(session.sourceImageUrl);
      const blob = await imgResponse.blob();
      const base64 = await toBase64(new File([blob], 'source.jpg', { type: blob.type }));

      await generateVariation(session, variation, base64);
      await saveSession(session);
    },
    [session, generateVariation]
  );

  const allDone = session?.variations.every(
    (v) => v.status === 'done' || v.status === 'error'
  );

  if (!loaded) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Layers size={32} className="animate-pulse text-indigo-400" />
      </div>
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
            {session && view !== 'student' && allDone && (
              <button
                onClick={() => setView('student')}
                className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                <GraduationCap size={15} />
                Student View
              </button>
            )}
            {session && (
              <button
                onClick={() => {
                  setSession(null);
                  setView('upload');
                }}
                className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                New Session
              </button>
            )}
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
      <main className="max-w-5xl mx-auto px-6 py-10">
        {!settings.apiKey && (
          <div className="mb-8 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
            <div className="text-amber-400 mt-0.5 text-base">⚠</div>
            <div>
              <p className="text-amber-300 text-sm font-medium">API key required</p>
              <p className="text-amber-300/70 text-sm mt-0.5">
                Add your BFL API key in settings to start generating variations.{' '}
                <button
                  onClick={() => setShowSettings(true)}
                  className="underline hover:text-amber-200"
                >
                  Open Settings →
                </button>
              </p>
            </div>
          </div>
        )}

        {view === 'upload' && (
          <div>
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-white">Generate Training Set</h2>
              <p className="text-gray-400 mt-2 text-sm max-w-md mx-auto">
                Upload a Hub environment photo and AI will generate 3 photorealistic variations
                for spot-the-difference observational training.
              </p>
            </div>
            <PromptConfig
              params={promptParams}
              model={settings.model}
              onChange={setPromptParams}
            />
            <PhotoUploader onFileSelected={handlePhotoSelected} />
          </div>
        )}

        {(view === 'generating' || view === 'review') && session && (
          <div>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {allDone ? 'Generation Complete' : 'Generating Variations…'}
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  {allDone
                    ? 'Review the variations below. Download or regenerate as needed.'
                    : 'AI is generating 3 variations in parallel. Each takes up to 60 seconds.'}
                </p>
              </div>
              {/* Session cost estimate */}
              <div className="shrink-0 text-right">
                <p className="text-xs text-gray-500">Est. session cost</p>
                <p className="text-sm font-mono font-semibold text-amber-300">
                  ~${(MODEL_COST_USD[settings.model] * 3).toFixed(3)}
                </p>
                <p className="text-xs text-gray-600">{settings.model}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Source image */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                <div className="aspect-video bg-gray-900">
                  <img
                    src={session.sourceImageUrl}
                    alt="Source"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                    ORIGINAL
                  </span>
                  <p className="text-white text-sm font-medium mt-1 truncate">
                    {session.sourceImageName}
                  </p>
                </div>
              </div>

              {session.variations.map((v, i) => (
                <VariationCard
                  key={v.id}
                  variation={v}
                  index={i}
                  onRegenerate={allDone ? handleRegenerate : undefined}
                />
              ))}
            </div>

            {allDone && (
              <div className="mt-6">
                <BatchDownload session={session} />
              </div>
            )}
          </div>
        )}

        {view === 'student' && session && (
          <StudentModule session={session} onBack={() => setView('generating')} />
        )}
      </main>

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
