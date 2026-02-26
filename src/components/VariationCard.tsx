import { useState } from 'react';
import { Loader2, XCircle, RefreshCw, Download, Eye, EyeOff, Check, ThumbsDown, Star } from 'lucide-react';
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
    <div className={`border rounded-xl overflow-hidden transition-colors ${
      variation.flag === 'accepted' ? 'bg-green-900/10 border-green-800/50' :
      variation.flag === 'rejected' ? 'bg-red-900/10 border-red-900/40 opacity-70' :
      'bg-gray-800 border-gray-700'
    }`}>
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
            <XCircle size={28} />
            <p className="text-xs">{variation.error ?? 'Generation failed'}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-gray-500">
            <Loader2 size={28} className="animate-spin text-indigo-400" />
            <p className="text-xs text-gray-400 capitalize">{variation.status}…</p>
          </div>
        )}

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
          <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/60 px-1.5 py-0.5 rounded-full">
            <Star size={9} className="fill-amber-400 text-amber-400" />
            <span className="text-[9px] text-amber-300 font-bold">{variation.rating}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <span className="text-white text-sm font-medium truncate block">{variation.config.label}</span>

        {variation.status === 'done' && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={downloadImage}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              <Download size={12} />
              Save
            </button>
            {onRegenerate && (
              <button
                onClick={() => onRegenerate(variation.id)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                <RefreshCw size={12} />
                Retry
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
            <pre className="mt-1.5 text-[9px] text-gray-400 bg-gray-900 border border-gray-700 rounded-lg p-2 whitespace-pre-wrap break-words leading-relaxed font-mono max-h-24 overflow-y-auto">
              {variation.config.prompt}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
