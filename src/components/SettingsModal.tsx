import { useState } from 'react';
import { X, Eye, EyeOff, Save, RefreshCw, CheckCircle, AlertCircle, Coins } from 'lucide-react';
import type { AppSettings, BFLModel } from '../types';
import { MODEL_COST_USD } from '../types';
import { fetchCredits } from '../lib/bfl-client';

interface Props {
  settings: AppSettings;
  onSave: (s: Partial<AppSettings>) => void;
  onClose: () => void;
}

const MODELS: {
  value: BFLModel;
  generation: 'FLUX.2' | 'FLUX.1';
  label: string;
  note: string;
}[] = [
  {
    value: 'flux-pro-1.1',
    generation: 'FLUX.2',
    label: 'FLUX.2 [pro]',
    note: 'Recommended · fast, high quality',
  },
  {
    value: 'flux-pro-1.1-ultra',
    generation: 'FLUX.2',
    label: 'FLUX.2 [pro] Ultra',
    note: 'Max quality · slower',
  },
  {
    value: 'flux-pro',
    generation: 'FLUX.1',
    label: 'FLUX.1 [pro]',
    note: 'Previous gen · stable',
  },
  {
    value: 'flux-dev',
    generation: 'FLUX.1',
    label: 'FLUX.1 [dev]',
    note: 'Previous gen · cheapest',
  },
];

type BalanceState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; credits: number }
  | { status: 'error'; message: string };

export default function SettingsModal({ settings, onSave, onClose }: Props) {
  const [form, setForm] = useState({ ...settings });
  const [showKey, setShowKey] = useState(false);
  const [balance, setBalance] = useState<BalanceState>({ status: 'idle' });

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  const checkBalance = async () => {
    if (!form.apiKey.trim()) return;
    setBalance({ status: 'loading' });
    try {
      const { credits } = await fetchCredits(form.apiKey.trim());
      setBalance({ status: 'ok', credits });
    } catch (err) {
      setBalance({
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to fetch balance',
      });
    }
  };

  const costPerImage = MODEL_COST_USD[form.model];
  const costPerSession = costPerImage * 3; // 3 variations
  const sessionsRemaining =
    balance.status === 'ok'
      ? Math.floor(balance.credits / costPerSession)
      : null;

  const selectedModel = MODELS.find((m) => m.value === form.model)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl my-4">
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
                onChange={(e) => {
                  setForm({ ...form, apiKey: e.target.value });
                  setBalance({ status: 'idle' });
                }}
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

            {/* Balance check */}
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={checkBalance}
                disabled={!form.apiKey.trim() || balance.status === 'loading'}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 hover:text-white transition-colors"
              >
                <RefreshCw
                  size={12}
                  className={balance.status === 'loading' ? 'animate-spin' : ''}
                />
                {balance.status === 'loading' ? 'Checking…' : 'Check Balance'}
              </button>

              {balance.status === 'ok' && (
                <div className="flex items-center gap-1.5 text-xs text-green-300">
                  <CheckCircle size={13} />
                  <span className="font-mono font-medium">
                    ${balance.credits.toFixed(2)} remaining
                  </span>
                  {sessionsRemaining !== null && (
                    <span className="text-green-400/60">
                      (~{sessionsRemaining} sessions)
                    </span>
                  )}
                </div>
              )}
              {balance.status === 'error' && (
                <div className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle size={13} />
                  <span>Invalid key or API error</span>
                </div>
              )}
            </div>
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Model</label>
            <div className="space-y-1.5">
              {MODELS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setForm({ ...form, model: m.value })}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors text-left ${
                    form.model === m.value
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        m.generation === 'FLUX.2'
                          ? 'bg-indigo-500/20 text-indigo-300'
                          : 'bg-gray-600/50 text-gray-400'
                      }`}
                    >
                      {m.generation}
                    </span>
                    <span className="font-medium">{m.label}</span>
                    <span className="text-gray-400 text-xs">— {m.note}</span>
                  </div>
                  <span className="text-gray-400 font-mono text-xs ml-2 shrink-0">
                    ${MODEL_COST_USD[m.value].toFixed(3)}/img
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Cost estimation */}
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Coins size={14} className="text-amber-400" />
              <span className="text-sm font-medium text-gray-300">Cost Estimation</span>
              <span className="ml-auto text-xs text-gray-500">{selectedModel.label}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-mono font-semibold text-white">
                  ${costPerImage.toFixed(3)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">per image</p>
              </div>
              <div>
                <p className="text-lg font-mono font-semibold text-indigo-300">
                  ${costPerSession.toFixed(3)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">per session (3 variations)</p>
              </div>
              <div>
                <p className="text-lg font-mono font-semibold text-amber-300">
                  ${(costPerSession * 10).toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">for 10 sessions</p>
              </div>
            </div>
            {balance.status === 'ok' && (
              <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between text-xs">
                <span className="text-gray-400">Your balance</span>
                <span className="text-green-300 font-mono font-medium">
                  ${balance.credits.toFixed(2)} ≈ {sessionsRemaining} sessions remaining
                </span>
              </div>
            )}
          </div>

          {/* Image Strength */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Image Strength:{' '}
              <span className="text-indigo-400 font-mono">{form.imageStrength}</span>
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
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Output Format
            </label>
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
