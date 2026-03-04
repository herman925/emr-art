import { useState, useMemo } from 'react';
import { Check, ThumbsDown, Star, Images, SlidersHorizontal, X, Search, Group } from 'lucide-react';
import type { Session, VariationFlag, EnvironmentType, ChangeIntensity, PhotoStyle } from '../types';
import AlbumLightbox, { type AlbumItem } from './AlbumLightbox';
import { INTENSITY_META, ENV_DISPLAY } from '../lib/prompt-builder';

interface Props {
  sessions: Session[];
  onFlag: (sessionId: string, variationId: string, flag: VariationFlag | undefined) => void;
  onRate: (sessionId: string, variationId: string, rating: number | undefined) => void;
}

type FlagFilter   = 'all' | 'accepted' | 'rejected' | 'unreviewed' | 'not-downloaded';
type StarOperator = '>'  | '>=' | '=' | '<=' | '<';
type GroupBy      = 'none' | 'source' | 'environment' | 'intensity' | 'flag' | 'stars';

interface Filters {
  flag:        FlagFilter;
  starOp:      StarOperator | null;
  starValue:   number;
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

const GROUP_BY_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'none',        label: 'No Grouping'  },
  { value: 'source',      label: 'Source Photo'  },
  { value: 'environment', label: 'Environment'   },
  { value: 'intensity',   label: 'Intensity'     },
  { value: 'flag',        label: 'Review Status' },
  { value: 'stars',       label: 'Star Rating'   },
];

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

function groupItems(items: AlbumItem[], groupBy: GroupBy): { label: string; items: AlbumItem[] }[] {
  if (groupBy === 'none') return [{ label: '', items }];

  const buckets = new Map<string, AlbumItem[]>();

  for (const item of items) {
    let key: string;
    const p = item.session.promptParams;

    switch (groupBy) {
      case 'source':
        key = item.session.sourceImageName;
        break;
      case 'environment': {
        const env = p?.environment ?? 'general';
        const meta = ENV_DISPLAY[env as EnvironmentType];
        key = meta ? `${meta.emoji} ${meta.label}` : env;
        break;
      }
      case 'intensity': {
        const intens = p?.intensity ?? 'obvious';
        const meta = INTENSITY_META[intens as ChangeIntensity];
        key = meta ? `${meta.icon} ${meta.label}` : intens;
        break;
      }
      case 'flag':
        key = item.variation.flag === 'accepted'
          ? '✓ Accepted'
          : item.variation.flag === 'rejected'
          ? '👎 Rejected'
          : '— Unreviewed';
        break;
      case 'stars':
        key = item.variation.rating
          ? `${'★'.repeat(item.variation.rating)} ${item.variation.rating} star${item.variation.rating > 1 ? 's' : ''}`
          : '☆ Unrated';
        break;
      default:
        key = '';
    }

    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(item);
  }

  // Sort buckets sensibly
  const entries = [...buckets.entries()].map(([label, items]) => ({ label, items }));

  if (groupBy === 'stars') {
    entries.sort((a, b) => {
      if (a.label === '☆ Unrated') return 1;
      if (b.label === '☆ Unrated') return -1;
      return b.label.localeCompare(a.label);
    });
  } else if (groupBy === 'flag') {
    const order = ['✓ Accepted', '— Unreviewed', '👎 Rejected'];
    entries.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
  }

  return entries;
}

export default function AlbumView({ sessions, onFlag, onRate }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [thumbSize, setThumbSize] = useState(200);
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [showGroupMenu, setShowGroupMenu] = useState(false);

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

  // Apply filters + search
  const albumItems = useMemo<AlbumItem[]>(() => {
    return allItems.filter(({ session, variation }) => {
      // Search
      if (search && !session.sourceImageName.toLowerCase().includes(search.toLowerCase())) return false;
      // Flag
      if (filters.flag === 'accepted'      && variation.flag !== 'accepted')  return false;
      if (filters.flag === 'rejected'      && variation.flag !== 'rejected')  return false;
      if (filters.flag === 'unreviewed'    && variation.flag != null)          return false;
      if (filters.flag === 'not-downloaded' && variation.downloaded === true)  return false;
      if (!matchesStar(variation.rating, filters.starOp, filters.starValue)) return false;
      const p = session.promptParams;
      if (filters.environment !== 'all' && p?.environment !== filters.environment) return false;
      if (filters.intensity   !== 'all' && p?.intensity   !== filters.intensity)   return false;
      if (filters.photoStyle  !== 'all' && p?.photoStyle  !== filters.photoStyle)  return false;
      return true;
    });
  }, [allItems, filters, search]);

  const groups = useMemo(() => groupItems(albumItems, groupBy), [albumItems, groupBy]);

  const activeFilterCount = countActive(filters);
  const activeGroupBy = GROUP_BY_OPTIONS.find((o) => o.value === groupBy)!;

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

        {/* Search bar */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by photo name..."
            className="w-full pl-8 pr-8 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Top bar: filter toggle, group-by, count, thumb slider */}
        <div className="flex items-center gap-2 flex-wrap">
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

          {/* Group By */}
          <div className="relative">
            <button
              onClick={() => setShowGroupMenu((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                groupBy !== 'none'
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white'
              }`}
            >
              <Group size={13} />
              {groupBy !== 'none' ? activeGroupBy.label : 'Group By'}
            </button>
            {showGroupMenu && (
              <div className="absolute top-full mt-1 left-0 z-20 bg-gray-900 border border-gray-700 rounded-xl shadow-xl py-1 min-w-[160px]">
                {GROUP_BY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setGroupBy(opt.value); setShowGroupMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      groupBy === opt.value
                        ? 'text-indigo-300 bg-indigo-600/20'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {(activeFilterCount > 0 || search) && (
            <button
              onClick={() => { setFilters(DEFAULT_FILTERS); setSearch(''); }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              <X size={11} /> Clear all
            </button>
          )}

          <span className="text-sm text-gray-600 ml-auto">
            {albumItems.length} / {allItems.length} photos
          </span>

          {/* Thumbnail size slider */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-600">S</span>
            <input
              type="range" min={60} max={600} step={20} value={thumbSize}
              onChange={(e) => setThumbSize(parseInt(e.target.value))}
              className="w-28 accent-indigo-500"
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
                  { v: 'all',            label: 'All'             },
                  { v: 'accepted',       label: '✓ Accepted'      },
                  { v: 'rejected',       label: '👎 Rejected'      },
                  { v: 'unreviewed',     label: '— Unreviewed'    },
                  { v: 'not-downloaded', label: '⬇ Not exported'  },
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
                {filters.starOp !== null && (
                  <div className="flex gap-1 ml-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => set('starValue', n)}
                        className={`w-8 h-8 rounded-lg border text-sm font-semibold transition-colors flex items-center justify-center ${
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

      {/* ── Grid (with optional groups) ── */}
      {albumItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center gap-3 py-16 text-gray-600">
          <p className="text-base font-medium text-gray-500">No photos match the current filters.</p>
          <button onClick={() => { setFilters(DEFAULT_FILTERS); setSearch(''); }} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.label || '__all__'}>
              {/* Group header */}
              {groupBy !== 'none' && (
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-sm font-semibold text-gray-400">{group.label}</h3>
                  <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">{group.items.length}</span>
                  <div className="flex-1 h-px bg-gray-800" />
                </div>
              )}
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${thumbSize}px, 1fr))` }}
              >
                {group.items.map((item) => {
                  const { variation, session } = item;
                  // Find index in flat albumItems for lightbox navigation
                  const flatIdx = albumItems.indexOf(item);
                  return (
                    <button
                      key={variation.id}
                      onClick={() => setLightboxIndex(flatIdx)}
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
            </div>
          ))}
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

      {/* Close group-by menu on outside click */}
      {showGroupMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setShowGroupMenu(false)} />
      )}
    </>
  );
}
