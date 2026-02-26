import { useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, Wand2 } from 'lucide-react';
import type { PromptParams, EnvironmentType, ChangeIntensity, PhotoStyle } from '../types';
import { buildPromptPreview, INTENSITY_META } from '../lib/prompt-builder';
import { MODEL_COST_USD } from '../types';
import type { BFLModel } from '../types';

interface Props {
  params: PromptParams;
  model: BFLModel;
  onChange: (p: PromptParams) => void;
  variationCount: number;
  onVariationCountChange: (n: number) => void;
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

export default function PromptConfig({ params, model, onChange, variationCount, onVariationCountChange }: Props) {
  const costPerVariation = MODEL_COST_USD[model];
  const costPerPhoto     = costPerVariation * variationCount;
  const [expanded, setExpanded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const selectedEnv = ENVIRONMENTS.find((e) => e.value === params.environment)!;

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
          {/* Summary pills when collapsed */}
          {!expanded && (
            <div className="flex items-center gap-1.5 ml-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                {selectedEnv.emoji} {selectedEnv.label}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                {INTENSITY_META[params.intensity].icon} {INTENSITY_META[params.intensity].label}
              </span>
            </div>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={15} className="text-gray-400 shrink-0" />
        ) : (
          <ChevronDown size={15} className="text-gray-400 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-5">

          {/* Environment — dropdown */}
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

          {/* Change intensity — icon buttons */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Change Intensity
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {(Object.entries(INTENSITY_META) as [ChangeIntensity, { label: string; icon: string; instruction: string }][]).map(([value, meta]) => (
                <button
                  key={value}
                  onClick={() => onChange({ ...params, intensity: value })}
                  className={`text-left px-3 py-2.5 rounded-lg border transition-colors flex items-start gap-2.5 ${
                    params.intensity === value
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-gray-700/40 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                  }`}
                >
                  <span className="text-base leading-none mt-0.5 shrink-0">{meta.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-none">{meta.label}</p>
                    <p className="text-[11px] mt-1 opacity-60 leading-snug line-clamp-2">{meta.instruction}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Scene description */}
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

          {/* Photo style */}
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

          {/* Variation count */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Variations per Photo
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xl font-mono font-bold text-indigo-300">{variationCount}</span>
                <span className="text-xs text-gray-500 font-mono">~${costPerPhoto.toFixed(3)}/photo</span>
              </div>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={variationCount}
              onChange={(e) => onVariationCountChange(parseInt(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-0.5">
              <span>1</span>
              <span>10</span>
              <span>25</span>
              <span>50</span>
            </div>
            {variationCount > 10 && (
              <p className="text-xs text-amber-400/80 mt-1.5">
                {variationCount} variations ≈ ${costPerPhoto.toFixed(3)} per uploaded photo
              </p>
            )}
          </div>

          {/* Prompt preview */}
          <div className="border-t border-gray-700 pt-4">
            <button
              onClick={() => setShowPreview((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
            >
              {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
              {showPreview ? 'Hide prompt preview' : 'Preview prompt sent to API'}
            </button>
            {showPreview && (
              <div className="mt-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Prompt sent to API (same for all variations, different seeds)
                </p>
                <pre className="text-[11px] text-gray-300 bg-gray-900 border border-gray-700 rounded-lg p-3 whitespace-pre-wrap break-words leading-relaxed font-mono max-h-48 overflow-y-auto">
                  {buildPromptPreview(params, model)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
