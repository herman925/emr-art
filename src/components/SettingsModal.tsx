import { useState } from 'react';
import { X, Eye, EyeOff, Save, RefreshCw, CheckCircle, AlertCircle, Coins, Zap, Star, Cpu } from 'lucide-react';
import type { AppSettings, BFLModel } from '../types';
import { MODEL_COST_USD } from '../types';
import { fetchCredits } from '../lib/bfl-client';

interface Props {
  settings: AppSettings;
  onSave: (s: Partial<AppSettings>) => void;
  onClose: () => void;
}

interface ModelDef {
  value: BFLModel;
  label: string;
  sublabel: string;
  note: string;
  steps?: string;
  recommended?: boolean;
  icon: 'star' | 'zap' | 'cpu';
}

const MODEL_GROUPS: { group: string; description: string; models: ModelDef[] }[] = [
  {
    group: 'FLUX.2 Pro',
    description: 'Highest quality hosted models — best for production use',
    models: [
      {
        value: 'flux-2-pro',
        label: 'FLUX.2 [pro]',
        sublabel: 'flux-2-pro',
        note: 'Best quality-speed balance',
        recommended: true,
        icon: 'star',
      },
      {
        value: 'flux-2-max',
        label: 'FLUX.2 [max]',
        sublabel: 'flux-2-max',
        note: 'Maximum quality, slowest',
        icon: 'star',
      },
      {
        value: 'flux-2-flex',
        label: 'FLUX.2 [flex]',
        sublabel: 'flux-2-flex',
        note: 'Flexible/premium tier',
        icon: 'star',
      },
      {
        value: 'flux-2-dev',
        label: 'FLUX.2 [dev]',
        sublabel: 'flux-2-dev',
        note: 'Dev access, lower cost',
        icon: 'star',
      },
    ],
  },
  {
    group: 'FLUX.2 Pro (Legacy paths)',
    description: 'Older API paths — same models as above, kept for compatibility',
    models: [
      {
        value: 'flux-pro-1.1',
        label: 'FLUX.2 [pro] v1.1',
        sublabel: 'flux-pro-1.1',
        note: 'Alias → flux-2-pro',
        icon: 'star',
      },
      {
        value: 'flux-pro-1.1-ultra',
        label: 'FLUX.2 [pro] Ultra v1.1',
        sublabel: 'flux-pro-1.1-ultra',
        note: 'Alias → flux-2-max',
        icon: 'star',
      },
    ],
  },
  {
    group: 'FLUX.2 Klein — Distilled',
    description: '4-step distilled models — real-time speed, lower cost',
    models: [
      {
        value: 'flux-2-klein-4b',
        label: 'FLUX.2 Klein 4B',
        sublabel: 'flux-2-klein-4b',
        note: '4B params · 4 steps · fastest',
        steps: '4 steps',
        icon: 'zap',
      },
      {
        value: 'flux-2-klein-9b',
        label: 'FLUX.2 Klein 9B',
        sublabel: 'flux-2-klein-9b',
        note: '9B params · 4 steps · balanced',
        steps: '4 steps',
        icon: 'zap',
      },
    ],
  },
  {
    group: 'FLUX.2 Klein — Base (Non-distilled)',
    description: '50-step full-quality Klein models — no guidance distillation',
    models: [
      {
        value: 'flux-2-klein-base-4b',
        label: 'FLUX.2 Klein Base 4B',
        sublabel: 'flux-2-klein-base-4b',
        note: '4B params · 50 steps · CFG',
        steps: '50 steps',
        icon: 'cpu',
      },
      {
        value: 'flux-2-klein-base-9b',
        label: 'FLUX.2 Klein Base 9B',
        sublabel: 'flux-2-klein-base-9b',
        note: '9B params · 50 steps · CFG',
        steps: '50 steps',
        icon: 'cpu',
      },
    ],
  },
];

type BalanceState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; credits: number }
  | { status: 'error'; message: string };

const GroupIcon = ({ icon }: { icon: ModelDef['icon'] }) => {
  if (icon === 'star') return <Star size={13} className="text-indigo-400 shrink-0" />;
  if (icon === 'zap') return <Zap size={13} className="text-amber-400 shrink-0" />;
  return <Cpu size={13} className="text-gray-400 shrink-0" />;
};

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
  const costPerSession = costPerImage * 3;
  const sessionsRemaining =
    balance.status === 'ok' ? Math.floor(balance.credits / costPerSession) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-xl shadow-2xl my-6">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* ── API Key ───────────────────────────────── */}
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
                placeholder="Enter your api.bfl.ai key…"
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
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <button
                onClick={checkBalance}
                disabled={!form.apiKey.trim() || balance.status === 'loading'}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 hover:text-white transition-colors"
              >
                <RefreshCw size={12} className={balance.status === 'loading' ? 'animate-spin' : ''} />
                {balance.status === 'loading' ? 'Checking…' : 'Check Balance'}
              </button>
              {balance.status === 'ok' && (
                <div className="flex items-center gap-1.5 text-xs text-green-300">
                  <CheckCircle size={13} />
                  <span className="font-mono font-medium">${balance.credits.toFixed(2)} remaining</span>
                  {sessionsRemaining !== null && (
                    <span className="text-green-400/60">(~{sessionsRemaining} sessions)</span>
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

          {/* ── Model selector ───────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              FLUX.2 Model
              <span className="ml-2 text-xs text-gray-500 font-normal">
                — all models below are FLUX.2 generation
              </span>
            </label>

            <div className="space-y-4">
              {MODEL_GROUPS.map((grp) => (
                <div key={grp.group}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    {grp.group}
                  </p>
                  <p className="text-xs text-gray-600 mb-2">{grp.description}</p>
                  <div className="space-y-1">
                    {grp.models.map((m) => {
                      const isSelected = form.model === m.value;
                      return (
                        <button
                          key={m.value}
                          onClick={() => setForm({ ...form, model: m.value })}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all text-left ${
                            isSelected
                              ? 'bg-indigo-600/20 border-indigo-500 text-white'
                              : 'bg-gray-800/60 border-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <GroupIcon icon={m.icon} />
                            <div className="min-w-0">
                              <span className="font-medium">{m.label}</span>
                              {m.recommended && (
                                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                  recommended
                                </span>
                              )}
                              <span className="ml-2 text-gray-500 text-xs">{m.note}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-2 shrink-0">
                            {m.steps && (
                              <span className="text-xs text-gray-600 font-mono">{m.steps}</span>
                            )}
                            <span className="text-xs font-mono text-gray-400">
                              ${MODEL_COST_USD[m.value].toFixed(3)}/img
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Cost estimation ──────────────────────── */}
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Coins size={14} className="text-amber-400" />
              <span className="text-sm font-medium text-gray-300">Cost Estimation</span>
              <span className="ml-auto text-xs text-gray-500 font-mono">{form.model}</span>
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
                <p className="text-xs text-gray-500 mt-0.5">per session (×3)</p>
              </div>
              <div>
                <p className="text-lg font-mono font-semibold text-amber-300">
                  ${(costPerSession * 10).toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">10 sessions</p>
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

          {/* ── Image Strength ───────────────────────── */}
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

          {/* ── Output Format ────────────────────────── */}
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
