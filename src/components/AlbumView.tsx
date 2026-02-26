import { useState, useMemo } from 'react';
import { Check, ThumbsDown, Star, Images, SlidersHorizontal, X } from 'lucide-react';
import type { Session, VariationFlag, EnvironmentType, ChangeIntensity, PhotoStyle } from '../types';
import AlbumLightbox, { type AlbumItem } from './AlbumLightbox';
import { INTENSITY_META, ENV_DISPLAY } from '../lib/prompt-builder';

interface Props {
  sessions: Session[];
  onFlag: (sessionId: string, variationId: string, flag: VariationFlag | undefined) => void;
  onRate: (sessionId: string, variationId: string, rating: number | undefined) => void;
}

type FlagFilter   = 'all' | 'accepted' | 'rejected' | 'unreviewed';
type StarOperator = '>'  | '>=' | '=' | '<=' | '<';

interface Filters {
  flag:        FlagFilter;
  starOp:      StarOperator | null;   // null = no star filter
  starValue:   number;                // 1–5
  environment: EnvironmentType | 'all';
  intensity:   ChangeIntensity  | 'all';
  photoStyle:  PhotoStyle       | 'all';
}

const DEFAULT_FILTERS: Filters = {
  flag: 'all', starOp: null, starValue: 3,
  environment: 'all', intensity: 'all', photoStyle: 'all',
};

const PHOTO_STYLE_LABELS: Record<PhotoStyle, string> = {
  'match-source': 'Match Source', 'modern-digital': 'Modern Digital',
  'natural-light': 'Natural Light', 'indoor-fluorescent': 'Fluorescent',
  'warm-golden-hour': 'Golden Hour', 'overcast-soft': 'Overcast',
  'bright-airy': 'Bright & Airy', 'high-contrast': 'High Contrast',
};

function matchesStar(rating: number | undefined, op: StarOperator | null, value: number): boolean {
  if (!op) return true;
  if (!rating) return false;
  switch (op) {
    case '>':  return rating > value;
    case '>=': return rating >= value;
    case '=':  return rating === value;
    case '<=': return rating <= value;
    case '<':  return rating < value;
  }
}

function countActive(f: Filters): number {
  let n = 0;
  if (f.flag !== 'all') n++;
  if (f.starOp !== null) n++;
  if (f.environment !== 'all') n++;
  if (f.intensity !== 'all') n++;
  if (f.photoStyle !== 'all') n++;
  return n;
}

export default function AlbumView({ sessions, onFlag, onRate }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [thumbSize, setThumbSize] = useState(200); // px min-width per cell

  const set = <K extends keyof Filters>(key: K, val: Filters[K]) =>
    setFilters((f) => ({ ...f, [key]: val }));

  // Build unfiltered flat list
  const allItems = useMemo<AlbumItem[]>(() => {
    const items: AlbumItem[] = [];
    let idx = 0;
    for (const session of sessions) {
      for (const variation of session.variations) {
        if (variation.status === 'done' && variation.blobUrl) {
          items.push({ session, variation, globalIndex: idx++ });
        }
      }
    }
    return items;
  }, [sessions]);

  // Apply filters
  const albumItems = useMemo<AlbumItem[]>(() => {
    return allItems.filter(({ session, variation }) => {
      if (filters.flag === 'accepted'   && variation.flag !== 'accepted')  return false;
      if (filters.flag === 'rejected'   && variation.flag !== 'rejected')  return false;
      if (filters.flag === 'unreviewed' && variation.flag != null)          return false;
      if (!matchesStar(variation.rating, filters.starOp, filters.starValue)) return false;
      const p = session.promptParams;
      if (filters.environment !== 'all' && p?.environment !== filters.environment) return false;
      if (filters.intensity   !== 'all' && p?.intensity   !== filters.intensity)   return false;
      if (filters.photoStyle  !== 'all' && p?.photoStyle  !== filters.photoStyle)  return false;
      return true;
    });
  }, [allItems, filters]);

  const activeFilterCount = countActive(filters);

  if (allItems.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center gap-4 text-gray-600">
        <Images size={40} className="opacity-20" />
        <div>
          <p className="text-base font-medium text-gray-500">No photos yet</p>
          <p className="text-sm text-gray-600 mt-1">Generated photos will appear here once jobs complete.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="mb-4 space-y-3">

        {/* Top bar: filter toggle, count, thumb slider */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white'
            }`}
          >
            <SlidersHorizontal size={13} />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-indigo-500 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              <X size={11} /> Clear filters
            </button>
          )}

          <span className="text-sm text-gray-600 ml-auto">
            {albumItems.length} / {allItems.length} photos
          </span>

          {/* Thumbnail size slider */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-600">S</span>
            <input
              type="range" min={120} max={360} step={20} value={thumbSize}
              onChange={(e) => setThumbSize(parseInt(e.target.value))}
              className="w-24 accent-indigo-500"
              title="Thumbnail size"
            />
            <span className="text-xs text-gray-600">L</span>
          </div>
        </div>

        {/* Expanded filter panel */}
        {showFilters && (
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-4">

            {/* Flag */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Review Status</p>
              <div className="flex flex-wrap gap-1.5">
                {([
                  { v: 'all',        label: 'All'         },
                  { v: 'accepted',   label: '✓ Accepted'  },
                  { v: 'rejected',   label: '👎 Rejected'  },
                  { v: 'unreviewed', label: '— Unreviewed' },
                ] as { v: FlagFilter; label: string }[]).map((opt) => (
                  <button key={opt.v} onClick={() => set('flag', opt.v)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                      filters.flag === opt.v
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-gray-700/40 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-white'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Star rating */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Star Rating</p>
              <div className="flex flex-wrap items-center gap-2">
                {/* Operator buttons */}
                <div className="flex gap-1">
                  {([null, '>', '>=', '=', '<=', '<'] as (StarOperator | null)[]).map((op) => (
                    <button key={op ?? 'any'} onClick={() => set('starOp', op)}
                      className={`px-2.5 py-1.5 rounded-lg border text-sm font-mono transition-colors ${
                        filters.starOp === op
                          ? 'bg-indigo-600/20 border-indigo-500 text-white'
                          : 'bg-gray-700/40 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-white'
                      }`}>
                      {op ?? 'Any'}
                    </button>
                  ))}
                </div>
                {/* Value selector */}
                {filters.starOp !== null && (
                  <div className="flex gap-1 ml-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => set('starValue', n)}
                        className={`w-8 h-8 rounded-lg border text-sm font-semibold transition-colors flex items-center justify-center gap-0.5 ${
                          filters.starValue === n
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-gray-700/40 border-gray-600 text-gray-400 hover:border-gray-500'
                        }`}>
                        {n}
                      </button>
                    ))}
                    <Star size={14} className="self-center ml-1 fill-amber-400 text-amber-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Environment */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Environment</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => set('environment', 'all')}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                    filters.environment === 'all'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-gray-700/40 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-white'
                  }`}>All</button>
                {(Object.entries(ENV_DISPLAY) as [EnvironmentType, {label: string; emoji: string}][]).map(([val, meta]) => (
                  <button key={val} onClick={() => set('environment', val)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                      filters.environment === val
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-gray-700/40 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-white'
                    }`}>
                    {meta.emoji} {meta.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Intensity */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Intensity</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => set('intensity', 'all')}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                    filters.intensity === 'all'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-gray-700/40 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-white'
                  }`}>All</button>
                {(Object.entries(INTENSITY_META) as [ChangeIntensity, {label: string; icon: string; instruction: string}][]).map(([val, meta]) => (
                  <button key={val} onClick={() => set('intensity', val)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                      filters.intensity === val
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-gray-700/40 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-white'
                    }`}>
                    {meta.icon} {meta.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo Style */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Photo Style</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => set('photoStyle', 'all')}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                    filters.photoStyle === 'all'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-gray-700/40 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-white'
                  }`}>All</button>
                {(Object.keys(PHOTO_STYLE_LABELS) as PhotoStyle[]).map((val) => (
                  <button key={val} onClick={() => set('photoStyle', val)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                      filters.photoStyle === val
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-gray-700/40 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-white'
                    }`}>
                    {PHOTO_STYLE_LABELS[val]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Grid ── */}
      {albumItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center gap-3 py-16 text-gray-600">
          <p className="text-base font-medium text-gray-500">No photos match the current filters.</p>
          <button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            Clear all filters
          </button>
        </div>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${thumbSize}px, 1fr))` }}
        >
          {albumItems.map((item, i) => {
            const { variation, session } = item;
            return (
              <button
                key={variation.id}
                onClick={() => setLightboxIndex(i)}
                className="group relative aspect-video bg-gray-900 rounded-xl overflow-hidden border border-gray-700 hover:border-indigo-500/60 transition-all hover:shadow-lg hover:shadow-indigo-900/20"
              >
                <img
                  src={variation.blobUrl!}
                  alt={variation.config.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  draggable={false}
                />
                {/* Source thumbnail */}
                <div className="absolute bottom-2 left-2 w-9 h-9 rounded-lg overflow-hidden border-2 border-white/30 shadow-lg bg-gray-900">
                  <img src={session.sourceImageUrl} alt="" className="w-full h-full object-cover" draggable={false} />
                </div>
                {/* Flag badge */}
                {variation.flag && (
                  <div className={`absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center shadow ${
                    variation.flag === 'accepted' ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {variation.flag === 'accepted'
                      ? <Check size={10} className="text-white" />
                      : <ThumbsDown size={9} className="text-white" />
                    }
                  </div>
                )}
                {/* Star badge */}
                {variation.rating && (
                  <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                    <Star size={9} className="fill-amber-400 text-amber-400" />
                    <span className="text-[9px] text-amber-300 font-bold">{variation.rating}</span>
                  </div>
                )}
                {/* Hover label */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end p-2">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-left">
                    <p className="text-xs font-medium text-white drop-shadow">{variation.config.label}</p>
                    <p className="text-[10px] text-gray-300 truncate max-w-[140px] drop-shadow">{session.sourceImageName}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {lightboxIndex !== null && (
        <AlbumLightbox
          items={albumItems}
          currentIndex={lightboxIndex}
          onNavigate={setLightboxIndex}
          onFlag={onFlag}
          onRate={onRate}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
