import { useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, Wand2, Plus, Minus } from 'lucide-react';
import type { PromptParams, EnvironmentType, ChangeIntensity, PhotoStyle } from '../types';
import { buildPromptPreview, INTENSITY_META } from '../lib/prompt-builder';
import { MODEL_COST_USD } from '../types';
import type { BFLModel } from '../types';
import { totalVariations } from '../lib/variations';

interface Props {
  params: PromptParams;
  model: BFLModel;
  onChange: (p: PromptParams) => void;
  intensityDist: Partial<Record<ChangeIntensity, number>>;
  onIntensityDistChange: (d: Partial<Record<ChangeIntensity, number>>) => void;
}

const ENVIRONMENTS: { value: EnvironmentType; label: string; emoji: string }[] = [
  { value: 'general',       label: 'General Hub',     emoji: '🏠' },
  { value: 'art',           label: 'Art & Craft',     emoji: '🎨' },
  { value: 'reading',       label: 'Reading',         emoji: '📚' },
  { value: 'blocks',        label: 'Blocks',          emoji: '🧱' },
  { value: 'dramatic-play', label: 'Dramatic Play',   emoji: '🎭' },
  { value: 'science',       label: 'Science',         emoji: '🔬' },
  { value: 'sensory',       label: 'Sensory Play',    emoji: '💧' },
  { value: 'music',         label: 'Music',           emoji: '🎵' },
  { value: 'outdoor',       label: 'Outdoor',         emoji: '🌳' },
];

const PHOTO_STYLES: { value: PhotoStyle; label: string; desc: string }[] = [
  { value: 'match-source',       label: 'Match Source',        desc: 'Infer style from your photo' },
  { value: 'modern-digital',     label: 'Modern Digital',      desc: 'Sony A7IV · sharp · HDR' },
  { value: 'natural-light',      label: 'Natural Light',       desc: 'Soft window · organic tones' },
  { value: 'indoor-fluorescent', label: 'Fluorescent Indoor',  desc: 'Office lighting · crisp detail' },
  { value: 'warm-golden-hour',   label: 'Golden Hour',         desc: 'Warm amber · cosy windows' },
  { value: 'overcast-soft',      label: 'Overcast Soft',       desc: 'Even diffused · no harsh shadows' },
  { value: 'bright-airy',        label: 'Bright & Airy',       desc: 'High-key · Scandi clean' },
  { value: 'high-contrast',      label: 'High Contrast',       desc: 'Editorial · bold shadows' },
];

const MAX_TOTAL = 100;
const MAX_PER_INTENSITY = 50;

export default function PromptConfig({ params, model, onChange, intensityDist, onIntensityDistChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const total = totalVariations(intensityDist);
  const costPerVariation = MODEL_COST_USD[model];
  const costPerPhoto = costPerVariation * total;

  const selectedEnv   = ENVIRONMENTS.find((e) => e.value === params.environment)!;
  const selectedStyle = PHOTO_STYLES.find((s) => s.value === params.photoStyle)!;

  // How many intensity levels have a non-zero count
  const activeIntensities = Object.entries(intensityDist).filter(([, n]) => (n ?? 0) > 0);

  function setCount(intensity: ChangeIntensity, delta: number | 'set', rawValue?: number) {
    const current = intensityDist[intensity] ?? 0;
    let next: number;
    if (delta === 'set') {
      next = Math.max(0, Math.min(MAX_PER_INTENSITY, rawValue ?? 0));
    } else {
      next = Math.max(0, Math.min(MAX_PER_INTENSITY, current + delta));
    }
    // Enforce overall cap
    const newTotal = total - current + next;
    if (newTotal > MAX_TOTAL) next = current + (MAX_TOTAL - total);
    if (next < 0) next = 0;

    onIntensityDistChange({ ...intensityDist, [intensity]: next });
  }

  return (
    <div className="w-full mb-4">
      {/* Header toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-xl hover:border-gray-600 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Wand2 size={16} className="text-indigo-400 shrink-0" />
          <span className="text-sm font-semibold text-white">Prompt Configuration</span>
        </div>
        {expanded ? (
          <ChevronUp size={15} className="text-gray-400 shrink-0" />
        ) : (
          <ChevronDown size={15} className="text-gray-400 shrink-0" />
        )}
      </button>

      {/* Summary pills — shown when collapsed */}
      {!expanded && (
        <div className="flex flex-wrap gap-1.5 mt-2 px-1">
          <span className="text-xs px-2.5 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-300">
            {selectedEnv.emoji} {selectedEnv.label}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-300">
            {selectedStyle.label}
          </span>
          {/* ×N pill — solid indigo so contrast works in both light and dark mode */}
          <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-600 border border-indigo-500 text-white font-semibold">
            ×{total}
          </span>
          {activeIntensities.slice(0, 3).map(([intensity, n]) => {
            const meta = INTENSITY_META[intensity as ChangeIntensity];
            return (
              <span key={intensity} className="text-xs px-2.5 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-300">
                {meta.icon} {meta.label} ×{n}
              </span>
            );
          })}
          {activeIntensities.length > 3 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-500">
              +{activeIntensities.length - 3} more
            </span>
          )}
          {params.sceneDescription && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-400 max-w-[180px] truncate">
              "{params.sceneDescription}"
            </span>
          )}
        </div>
      )}

      {expanded && (
        <div className="mt-2 bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-5">

          {/* ── Variation Distribution ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Variation Distribution
              </label>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-mono font-bold ${total >= MAX_TOTAL ? 'text-amber-400' : 'text-indigo-300'}`}>
                  {total}
                </span>
                <span className="text-xs text-gray-500">/ {MAX_TOTAL} total</span>
              </div>
            </div>

            <div className="space-y-1.5">
              {(Object.entries(INTENSITY_META) as [ChangeIntensity, { label: string; icon: string; instruction: string }][]).map(([intensity, meta]) => {
                const count = intensityDist[intensity] ?? 0;
                const atCap = total >= MAX_TOTAL && count === 0;
                return (
                  <div key={intensity} className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    count > 0
                      ? 'bg-indigo-600/10 border-indigo-500/40'
                      : 'bg-gray-700/30 border-gray-700'
                  }`}>
                    <span className="text-base shrink-0 w-5 text-center">{meta.icon}</span>
                    <span className={`text-sm flex-1 font-medium ${count > 0 ? 'text-white' : 'text-gray-400'}`}>
                      {meta.label}
                    </span>
                    <p className="text-[10px] text-gray-600 hidden sm:block w-32 truncate">{meta.instruction}</p>
                    {/* Stepper */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setCount(intensity, -1)}
                        disabled={count === 0}
                        className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus size={11} />
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={MAX_PER_INTENSITY}
                        value={count}
                        onChange={(e) => setCount(intensity, 'set', parseInt(e.target.value) || 0)}
                        className="w-10 text-center text-sm font-mono font-semibold bg-gray-900 border border-gray-600 rounded text-white focus:outline-none focus:border-indigo-500 py-0.5"
                      />
                      <button
                        onClick={() => setCount(intensity, +1)}
                        disabled={atCap}
                        className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {total === 0 && (
              <p className="text-xs text-amber-400/80 mt-2">Set at least one variation to generate.</p>
            )}
            {total >= MAX_TOTAL && (
              <p className="text-xs text-amber-400/80 mt-2">
                Maximum {MAX_TOTAL} variations reached.
              </p>
            )}
            {total > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                ~${costPerPhoto.toFixed(3)} per uploaded photo
              </p>
            )}
          </div>

          {/* ── Environment ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Environment Type
            </label>
            <div className="relative">
              <select
                value={params.environment}
                onChange={(e) => onChange({ ...params, environment: e.target.value as EnvironmentType })}
                className="w-full appearance-none bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {ENVIRONMENTS.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.emoji}  {e.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {/* ── Scene description ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Scene Description
              <span className="ml-1.5 font-normal normal-case text-gray-600">— optional</span>
            </label>
            <textarea
              value={params.sceneDescription}
              onChange={(e) => onChange({ ...params, sceneDescription: e.target.value })}
              placeholder="e.g. ball pit, 45 degree wide angle, colourful foam mats, shelves on left wall"
              rows={2}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none"
            />
            <p className="text-xs text-gray-600 mt-1">Helps the AI understand your scene when generating variations.</p>
          </div>

          {/* ── Photo style ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Photo Style
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {PHOTO_STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => onChange({ ...params, photoStyle: s.value })}
                  className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    params.photoStyle === s.value
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-gray-700/40 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                  }`}
                >
                  <p className="text-sm font-semibold leading-none">{s.label}</p>
                  <p className="text-[11px] text-gray-500 mt-1 leading-snug">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* ── Prompt preview ── */}
          <div className="border-t border-gray-700 pt-4">
            <button
              onClick={() => setShowPreview((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
            >
              {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
              {showPreview ? 'Hide prompt preview' : 'Preview prompt sent to API'}
            </button>
            {showPreview && (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Sample prompts (one per intensity level, different seeds per copy)
                </p>
                {(Object.entries(INTENSITY_META) as [ChangeIntensity, { label: string; icon: string; instruction: string }][])
                  .filter(([intensity]) => (intensityDist[intensity] ?? 0) > 0)
                  .map(([intensity, meta]) => (
                    <div key={intensity}>
                      <p className="text-[10px] text-gray-500 mb-1">{meta.icon} {meta.label}</p>
                      <pre className="text-[11px] text-gray-300 bg-gray-900 border border-gray-700 rounded-lg p-3 whitespace-pre-wrap break-words leading-relaxed font-mono max-h-32 overflow-y-auto">
                        {buildPromptPreview({ ...params, intensity }, model)}
                      </pre>
                    </div>
                  ))}
                {totalVariations(intensityDist) === 0 && (
                  <p className="text-xs text-gray-600">Set at least one variation above to preview prompts.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
