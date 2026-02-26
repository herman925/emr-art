import { useState, useRef, useCallback, useEffect } from 'react';
import { X, SlidersHorizontal, Columns2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Session } from '../types';

interface Props {
  session: Session;
  initialVariationIndex?: number;
  onClose: () => void;
}

type Mode = 'curtain' | 'sidebyside';

export default function ImageCompareModal({ session, initialVariationIndex = 0, onClose }: Props) {
  const doneVariations = session.variations.filter((v) => v.status === 'done' && v.blobUrl);
  const [mode, setMode] = useState<Mode>('curtain');
  const [selectedIdx, setSelectedIdx] = useState(
    Math.min(initialVariationIndex, Math.max(0, doneVariations.length - 1))
  );
  const [sliderPos, setSliderPos] = useState(50);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const selected = doneVariations[selectedIdx];

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const updateSlider = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = ((clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(0, Math.min(100, pos)));
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging.current) updateSlider(e.clientX);
  }, [updateSlider]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    updateSlider(e.touches[0].clientX);
  }, [updateSlider]);

  const stopDrag = useCallback(() => { dragging.current = false; }, []);

  if (doneVariations.length === 0 || !selected) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3 min-w-0">
          <p className="text-sm font-medium text-white truncate max-w-xs">{session.sourceImageName}</p>

          {/* Mode toggle */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1 shrink-0">
            <button
              onClick={() => setMode('curtain')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === 'curtain' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal size={12} />
              Curtain
            </button>
            <button
              onClick={() => setMode('sidebyside')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === 'sidebyside' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Columns2 size={12} />
              Side by Side
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      {/* Image area */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-4 select-none">

        {mode === 'curtain' ? (
          /* ── Curtain mode ── */
          <div
            ref={containerRef}
            className="relative w-full h-full cursor-col-resize"
            onMouseMove={onMouseMove}
            onMouseUp={stopDrag}
            onMouseLeave={stopDrag}
            onTouchMove={onTouchMove}
            onTouchEnd={stopDrag}
          >
            {/* Back layer: variation */}
            <img
              src={selected.blobUrl!}
              alt={selected.config.label}
              className="absolute inset-0 w-full h-full object-contain"
              draggable={false}
            />

            {/* Front layer: original, clipped from the right */}
            <img
              src={session.sourceImageUrl}
              alt="Original"
              className="absolute inset-0 w-full h-full object-contain"
              style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
              draggable={false}
            />

            {/* Divider line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow-[0_0_12px_rgba(255,255,255,0.6)]"
              style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
              onMouseDown={(e) => { e.preventDefault(); dragging.current = true; }}
              onTouchStart={() => { dragging.current = true; }}
            >
              {/* Drag handle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white shadow-xl flex items-center justify-center gap-0.5 cursor-col-resize">
                <ChevronLeft size={11} className="text-gray-600" />
                <ChevronRight size={11} className="text-gray-600" />
              </div>
            </div>

            {/* Labels */}
            <span className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs text-white font-medium pointer-events-none">
              Original
            </span>
            <span className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs text-indigo-300 font-medium pointer-events-none">
              {selected.config.label}
            </span>
          </div>
        ) : (
          /* ── Side-by-side mode ── */
          <div className="flex gap-3 w-full h-full">
            <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-0">
              <div className="flex-1 min-h-0 bg-gray-900/60 rounded-xl overflow-hidden flex items-center justify-center">
                <img
                  src={session.sourceImageUrl}
                  alt="Original"
                  className="max-w-full max-h-full object-contain"
                  draggable={false}
                />
              </div>
              <p className="text-center text-xs text-gray-400 font-medium shrink-0">Original</p>
            </div>
            <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-0">
              <div className="flex-1 min-h-0 bg-gray-900/60 rounded-xl overflow-hidden flex items-center justify-center">
                <img
                  src={selected.blobUrl!}
                  alt={selected.config.label}
                  className="max-w-full max-h-full object-contain"
                  draggable={false}
                />
              </div>
              <p className="text-center text-xs text-indigo-400 font-medium shrink-0">{selected.config.label}</p>
            </div>
          </div>
        )}
      </div>

      {/* Variation selector */}
      <div className="shrink-0 border-t border-gray-800 px-5 py-3">
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-semibold">Compare against</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {doneVariations.map((v, i) => (
            <button
              key={v.id}
              onClick={() => setSelectedIdx(i)}
              className={`relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                i === selectedIdx
                  ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                  : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              <img src={v.blobUrl!} alt={v.config.label} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-center py-0.5 text-gray-300 font-medium">
                V{i + 1}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
