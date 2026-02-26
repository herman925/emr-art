import { useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, Wand2 } from 'lucide-react';
import type {
  PromptParams,
  EnvironmentType,
  ChangeIntensity,
  PhotoStyle,
} from '../types';
import { VARIATION_DEFINITIONS } from '../lib/variations';
import { buildPromptPreview } from '../lib/prompt-builder';
import type { BFLModel } from '../types';

interface Props {
  params: PromptParams;
  model: BFLModel;
  onChange: (p: PromptParams) => void;
}

const ENVIRONMENTS: { value: EnvironmentType; label: string }[] = [
  { value: 'generic',   label: 'Generic' },
  { value: 'office',    label: 'Office' },
  { value: 'workshop',  label: 'Workshop' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'lab',       label: 'Lab' },
  { value: 'clinic',    label: 'Clinic' },
  { value: 'classroom', label: 'Classroom' },
];

const INTENSITIES: { value: ChangeIntensity; label: string; desc: string }[] = [
  { value: 'subtle',   label: 'Subtle',   desc: '1 minor change — hardest to spot' },
  { value: 'moderate', label: 'Moderate', desc: '2–3 changes — balanced difficulty' },
  { value: 'obvious',  label: 'Obvious',  desc: 'Major changes — easy to spot' },
];

const PHOTO_STYLES: { value: PhotoStyle; label: string; desc: string }[] = [
  { value: 'match-source',       label: 'Match Source',       desc: 'Infer style from your photo' },
  { value: 'modern-digital',     label: 'Modern Digital',     desc: 'Sony A7IV · sharp · HDR' },
  { value: 'natural-light',      label: 'Natural Light',      desc: 'Soft window · organic tones' },
  { value: 'indoor-fluorescent', label: 'Fluorescent Indoor', desc: 'Office lighting · crisp detail' },
];

const INTENSITY_COLORS: Record<ChangeIntensity, string> = {
  subtle:   'bg-green-500/20 border-green-500 text-green-300',
  moderate: 'bg-amber-500/20 border-amber-500 text-amber-300',
  obvious:  'bg-red-500/20   border-red-500   text-red-300',
};

export default function PromptConfig({ params, model, onChange }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="w-full max-w-lg mx-auto mb-6">
      {/* Header toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-xl hover:border-gray-600 transition-colors group"
      >
        <div className="flex items-center gap-2">
          <Wand2 size={15} className="text-indigo-400" />
          <span className="text-sm font-medium text-white">Prompt Configuration</span>
          {/* Summary pills when collapsed */}
          {!expanded && (
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400 capitalize">
                {params.environment}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${INTENSITY_COLORS[params.intensity]} capitalize`}>
                {params.intensity}
              </span>
            </div>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={15} className="text-gray-400" />
        ) : (
          <ChevronDown size={15} className="text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-5">

          {/* Environment */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Environment Type
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ENVIRONMENTS.map((e) => (
                <button
                  key={e.value}
                  onClick={() => onChange({ ...params, environment: e.value })}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    params.environment === e.value
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                      : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* Change intensity */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Change Intensity
            </p>
            <div className="grid grid-cols-3 gap-2">
              {INTENSITIES.map((i) => (
                <button
                  key={i.value}
                  onClick={() => onChange({ ...params, intensity: i.value })}
                  className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    params.intensity === i.value
                      ? INTENSITY_COLORS[i.value]
                      : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <p className="text-sm font-medium capitalize">{i.label}</p>
                  <p className="text-[10px] mt-0.5 opacity-70 leading-tight">{i.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Photo style */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Photo Style
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {PHOTO_STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => onChange({ ...params, photoStyle: s.value })}
                  className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                    params.photoStyle === s.value
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <p className="text-xs font-medium">{s.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt preview toggle */}
          <div className="border-t border-gray-700 pt-4">
            <button
              onClick={() => setShowPreview((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
            >
              {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
              {showPreview ? 'Hide prompt preview' : 'Preview prompts sent to API'}
            </button>

            {showPreview && (
              <div className="mt-3 space-y-3">
                {VARIATION_DEFINITIONS.map((v) => (
                  <div key={v.category}>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      {v.label}
                    </p>
                    <pre className="text-[10px] text-gray-300 bg-gray-900 border border-gray-700 rounded-lg p-3 whitespace-pre-wrap break-words leading-relaxed font-mono">
                      {buildPromptPreview(params, v.category, model)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
