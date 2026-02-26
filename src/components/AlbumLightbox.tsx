import { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Check, ThumbsDown, Star } from 'lucide-react';
import type { Session, GeneratedVariation, VariationFlag } from '../types';
import { INTENSITY_META, ENV_DISPLAY } from '../lib/prompt-builder';

export interface AlbumItem {
  session: Session;
  variation: GeneratedVariation;
  globalIndex: number; // position in the flat album list
}

interface Props {
  items: AlbumItem[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onFlag: (sessionId: string, variationId: string, flag: VariationFlag | undefined) => void;
  onRate: (sessionId: string, variationId: string, rating: number | undefined) => void;
  onClose: () => void;
}

function StarRow({
  value,
  onChange,
  size = 20,
}: {
  value?: number;
  onChange: (n: number | undefined) => void;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(value === n ? undefined : n)}
          className="transition-transform hover:scale-110"
          title={`${n} star${n > 1 ? 's' : ''} (press ${n})`}
        >
          <Star
            size={size}
            className={n <= (value || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-600 hover:text-gray-500'}
          />
        </button>
      ))}
    </div>
  );
}

export default function AlbumLightbox({ items, currentIndex, onNavigate, onFlag, onRate, onClose }: Props) {
  const item = items[currentIndex];
  if (!item) return null;

  const { session, variation } = item;
  const params = session.promptParams;
  const total = items.length;

  const goPrev = useCallback(() => {
    if (currentIndex > 0) onNavigate(currentIndex - 1);
  }, [currentIndex, onNavigate]);

  const goNext = useCallback(() => {
    if (currentIndex < total - 1) onNavigate(currentIndex + 1);
  }, [currentIndex, total, onNavigate]);

  const toggleFlag = useCallback((flag: VariationFlag) => {
    onFlag(session.id, variation.id, variation.flag === flag ? undefined : flag);
  }, [session.id, variation.id, variation.flag, onFlag]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case 'Escape':    onClose(); break;
        case 'ArrowLeft': goPrev();  break;
        case 'ArrowRight': goNext(); break;
        case 'y': case 'Y': toggleFlag('accepted'); break;
        case 'n': case 'N': toggleFlag('rejected'); break;
        case '1': onRate(session.id, variation.id, variation.rating === 1 ? undefined : 1); break;
        case '2': onRate(session.id, variation.id, variation.rating === 2 ? undefined : 2); break;
        case '3': onRate(session.id, variation.id, variation.rating === 3 ? undefined : 3); break;
        case '4': onRate(session.id, variation.id, variation.rating === 4 ? undefined : 4); break;
        case '5': onRate(session.id, variation.id, variation.rating === 5 ? undefined : 5); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goPrev, goNext, toggleFlag, onClose, onRate, session.id, variation.id, variation.rating]);

  const envInfo = params?.environment ? ENV_DISPLAY[params.environment] : null;
  const intensityInfo = params?.intensity ? INTENSITY_META[params.intensity] : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">

      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous (←)"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm text-gray-400 tabular-nums">
            {currentIndex + 1} / {total}
          </span>
          <button
            onClick={goNext}
            disabled={currentIndex === total - 1}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next (→)"
          >
            <ChevronRight size={18} />
          </button>
          <span className="text-sm font-medium text-white truncate max-w-xs ml-2">{variation.config.label}</span>
          <span className="text-sm text-gray-600 truncate max-w-xs">— {session.sourceImageName}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Keyboard hints */}
          <div className="hidden lg:flex items-center gap-3 text-xs text-gray-600">
            <span>[Y] Accept</span>
            <span>[N] Reject</span>
            <span>[1–5] Stars</span>
            <span>[←/→] Navigate</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main body */}
      <div className="flex-1 min-h-0 flex">

        {/* Image */}
        <div className="flex-1 flex items-center justify-center p-6 min-w-0">
          <img
            src={variation.blobUrl}
            alt={variation.config.label}
            className="max-w-full max-h-full object-contain rounded-xl"
            draggable={false}
          />
        </div>

        {/* Info panel */}
        <aside className="w-72 shrink-0 border-l border-gray-800 overflow-y-auto flex flex-col">
          <div className="p-5 space-y-5">

            {/* Source photo */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Original Photo</p>
              <div className="rounded-xl overflow-hidden bg-gray-900 border border-gray-800">
                <img
                  src={session.sourceImageUrl}
                  alt="Source"
                  className="w-full aspect-video object-cover"
                  draggable={false}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1.5 truncate">{session.sourceImageName}</p>
            </div>

            {/* Config context */}
            {params && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Generation Config</p>
                <div className="space-y-2">
                  {envInfo && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg">
                      <span className="text-base">{envInfo.emoji}</span>
                      <div>
                        <p className="text-xs text-gray-500">Environment</p>
                        <p className="text-sm font-medium text-white">{envInfo.label}</p>
                      </div>
                    </div>
                  )}
                  {intensityInfo && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg">
                      <span className="text-base">{intensityInfo.icon}</span>
                      <div>
                        <p className="text-xs text-gray-500">Intensity</p>
                        <p className="text-sm font-medium text-white">{intensityInfo.label}</p>
                      </div>
                    </div>
                  )}
                  {params.sceneDescription && (
                    <div className="px-3 py-2 bg-gray-800 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Scene Description</p>
                      <p className="text-sm text-gray-300 leading-snug">{params.sceneDescription}</p>
                    </div>
                  )}
                  {session.model && (
                    <div className="px-3 py-2 bg-gray-800 rounded-lg">
                      <p className="text-xs text-gray-500">Model</p>
                      <p className="text-sm font-medium text-white font-mono">{session.model}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Review */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Review</p>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => toggleFlag('accepted')}
                  title="Accept (Y)"
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                    variation.flag === 'accepted'
                      ? 'bg-green-500/20 border-green-600 text-green-400'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-green-700 hover:text-green-400'
                  }`}
                >
                  <Check size={15} />
                  Accept
                </button>
                <button
                  onClick={() => toggleFlag('rejected')}
                  title="Reject (N)"
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                    variation.flag === 'rejected'
                      ? 'bg-red-500/20 border-red-700 text-red-400'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-red-800 hover:text-red-400'
                  }`}
                >
                  <ThumbsDown size={15} />
                  Reject
                </button>
              </div>

              <div className="flex flex-col items-center gap-2">
                <StarRow
                  value={variation.rating}
                  onChange={(n) => onRate(session.id, variation.id, n)}
                  size={22}
                />
                {variation.rating ? (
                  <p className="text-xs text-amber-400">{variation.rating} star{variation.rating > 1 ? 's' : ''}</p>
                ) : (
                  <p className="text-xs text-gray-600">No rating</p>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
