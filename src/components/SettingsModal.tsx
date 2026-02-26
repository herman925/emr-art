import { useState } from 'react';
import { X, Eye, EyeOff, Save } from 'lucide-react';
import type { AppSettings, BFLModel } from '../types';

interface Props {
  settings: AppSettings;
  onSave: (s: Partial<AppSettings>) => void;
  onClose: () => void;
}

const MODELS: { value: BFLModel; label: string; note: string }[] = [
  { value: 'flux-pro-1.1', label: 'FLUX.1.1 Pro', note: 'Recommended — fast, high quality' },
  { value: 'flux-pro', label: 'FLUX.1 Pro', note: 'Stable, well-tested' },
  { value: 'flux-dev', label: 'FLUX.1 Dev', note: 'Cheaper, lower quality' },
  { value: 'flux-pro-1.1-ultra', label: 'FLUX.1.1 Pro Ultra', note: 'Max quality, slowest' },
];

export default function SettingsModal({ settings, onSave, onClose }: Props) {
  const [form, setForm] = useState({ ...settings });
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              BFL API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                placeholder="Enter your api.bfl.ai key..."
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Stored only in your browser's local storage. Never sent anywhere except api.bfl.ai.
            </p>
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Model</label>
            <select
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value as BFLModel })}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm"
            >
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} — {m.note}
                </option>
              ))}
            </select>
          </div>

          {/* Image Strength */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Image Strength: <span className="text-indigo-400 font-mono">{form.imageStrength}</span>
            </label>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={form.imageStrength}
              onChange={(e) => setForm({ ...form, imageStrength: parseFloat(e.target.value) })}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-0.5">
              <span>More faithful to source</span>
              <span>More AI freedom</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              0.35 recommended — preserves room structure while allowing controlled changes.
            </p>
          </div>

          {/* Output Format */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Output Format</label>
            <div className="flex gap-3">
              {(['jpeg', 'png'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setForm({ ...form, outputFormat: fmt })}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    form.outputFormat === fmt
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!form.apiKey.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Save size={15} />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
