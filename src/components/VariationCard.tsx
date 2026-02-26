import { useState } from 'react';
import { Loader2, CheckCircle, XCircle, RefreshCw, Download, Eye, EyeOff } from 'lucide-react';
import type { GeneratedVariation } from '../types';

interface Props {
  variation: GeneratedVariation;
  index: number;
  onRegenerate?: (id: string) => void;
  onZoom?: () => void;
}


export default function VariationCard({ variation, index, onRegenerate, onZoom }: Props) {
  const [showPrompt, setShowPrompt] = useState(false);

  const downloadImage = () => {
    if (!variation.blobUrl) return;
    const a = document.createElement('a');
    a.href = variation.blobUrl;
    a.download = `variation-${index + 1}.jpg`;
    a.click();
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      {/* Image area */}
      <div className="aspect-video bg-gray-900 relative flex items-center justify-center">
        {variation.status === 'done' && variation.blobUrl ? (
          <img
            src={variation.blobUrl}
            alt={variation.config.label}
            className={`w-full h-full object-cover ${onZoom ? 'cursor-zoom-in' : ''}`}
            onClick={onZoom}
          />
        ) : variation.status === 'error' ? (
          <div className="flex flex-col items-center gap-2 text-red-400 p-4 text-center">
            <XCircle size={32} />
            <p className="text-sm">{variation.error ?? 'Generation failed'}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-gray-500">
            <Loader2 size={32} className="animate-spin text-indigo-400" />
            <p className="text-sm text-gray-400 capitalize">{variation.status}…</p>
          </div>
        )}

        {/* Status badge */}
        {variation.status === 'done' && (
          <div className="absolute top-2 right-2 bg-green-500/20 border border-green-500/30 text-green-300 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle size={11} />
            Ready
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-white text-sm font-medium truncate">
            {variation.config.label}
          </span>
        </div>

        {/* Actions */}
        {variation.status === 'done' && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={downloadImage}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              <Download size={12} />
              Download
            </button>
            {onRegenerate && (
              <button
                onClick={() => onRegenerate(variation.id)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                <RefreshCw size={12} />
                Regenerate
              </button>
            )}
          </div>
        )}
        {variation.status === 'error' && onRegenerate && (
          <button
            onClick={() => onRegenerate(variation.id)}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-white mt-2 px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        )}

        {/* Prompt preview */}
        <div className="mt-2 pt-2 border-t border-gray-700/60">
          <button
            onClick={() => setShowPrompt((v) => !v)}
            className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
          >
            {showPrompt ? <EyeOff size={10} /> : <Eye size={10} />}
            {showPrompt ? 'Hide prompt' : 'View prompt'}
          </button>
          {showPrompt && (
            <pre className="mt-1.5 text-[9px] text-gray-400 bg-gray-900 border border-gray-700 rounded-lg p-2 whitespace-pre-wrap break-words leading-relaxed font-mono max-h-32 overflow-y-auto">
              {variation.config.prompt}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
