import { useState } from 'react';
import { ChevronDown, ChevronUp, X, Eye, Check, ThumbsDown, Star } from 'lucide-react';
import type { Session, SessionFlag } from '../types';
import VariationCard from './VariationCard';
import BatchDownload from './BatchDownload';
import ImageCompareModal from './ImageCompareModal';

interface Props {
  session: Session;
  onRegenerate?: (variationId: string) => void;
  onRemove?: () => void;
  onFlag?: (flag: SessionFlag | undefined) => void;
  onRate?: (stars: number | undefined) => void;
}

function StarRating({
  value,
  onChange,
}: {
  value?: number;
  onChange: (stars: number | undefined) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(value === n ? undefined : n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5 transition-colors"
          title={`${n} star${n > 1 ? 's' : ''}`}
        >
          <Star
            size={14}
            className={
              n <= (hover || value || 0)
                ? 'fill-amber-400 text-amber-400'
                : 'text-gray-600 hover:text-gray-500'
            }
          />
        </button>
      ))}
    </div>
  );
}

export default function JobAccordion({ session, onRegenerate, onRemove, onFlag, onRate }: Props) {
  const total   = session.variations.length;
  const done    = session.variations.filter((v) => v.status === 'done').length;
  const errors  = session.variations.filter((v) => v.status === 'error').length;
  const allDone = done + errors === total;
  const progress = total > 0 ? (done + errors) / total : 0;

  const [expanded, setExpanded] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareInitialIdx, setCompareInitialIdx] = useState(0);

  const statusColor = allDone
    ? errors === total ? 'text-red-400' : errors > 0 ? 'text-amber-400' : 'text-green-400'
    : 'text-indigo-400';

  const statusLabel = allDone
    ? errors === total ? 'Failed' : errors > 0 ? `${done}/${total} done` : 'Complete'
    : `${done}/${total} generating…`;

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${
      session.flag === 'accepted' ? 'bg-green-900/10 border-green-800/50' :
      session.flag === 'rejected' ? 'bg-red-900/10 border-red-900/40 opacity-70' :
      'bg-gray-800/60 border-gray-700'
    }`}>
      {/* Accordion header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-700/30 transition-colors text-left"
      >
        {/* Source thumbnail */}
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-700 shrink-0">
          <img src={session.sourceImageUrl} alt="" className="w-full h-full object-cover" />
        </div>

        {/* Meta */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{session.sourceImageName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-sm font-medium ${statusColor}`}>{statusLabel}</span>
            <span className="text-sm text-gray-600">·</span>
            <span className="text-sm text-gray-500">{total} variation{total !== 1 ? 's' : ''}</span>
          </div>
          {/* Progress bar */}
          <div className="mt-1.5 h-1 bg-gray-700 rounded-full overflow-hidden w-full">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                allDone && errors === 0 ? 'bg-green-500' : allDone ? 'bg-amber-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${(progress * 100).toFixed(0)}%` }}
            />
          </div>
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Preview (compare) */}
          {done > 0 && (
            <button
              onClick={() => { setCompareInitialIdx(0); setCompareOpen(true); }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              title="Preview variations"
            >
              <Eye size={12} />
              Preview
            </button>
          )}

          {/* Accept / Reject */}
          {allDone && done > 0 && (
            <>
              <button
                onClick={() => onFlag?.(session.flag === 'accepted' ? undefined : 'accepted')}
                className={`p-1.5 rounded-lg border transition-colors ${
                  session.flag === 'accepted'
                    ? 'text-green-400 bg-green-500/20 border-green-600'
                    : 'text-gray-500 bg-gray-700/40 border-gray-600 hover:text-green-400 hover:border-green-700'
                }`}
                title="Accept"
              >
                <Check size={13} />
              </button>
              <button
                onClick={() => onFlag?.(session.flag === 'rejected' ? undefined : 'rejected')}
                className={`p-1.5 rounded-lg border transition-colors ${
                  session.flag === 'rejected'
                    ? 'text-red-400 bg-red-500/20 border-red-700'
                    : 'text-gray-500 bg-gray-700/40 border-gray-600 hover:text-red-400 hover:border-red-700'
                }`}
                title="Reject"
              >
                <ThumbsDown size={13} />
              </button>
            </>
          )}

          {/* Remove */}
          {onRemove && (
            <button
              onClick={onRemove}
              className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-gray-700 transition-colors border border-transparent hover:border-red-900"
              title="Remove job"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {expanded ? (
          <ChevronUp size={15} className="text-gray-500 shrink-0" />
        ) : (
          <ChevronDown size={15} className="text-gray-500 shrink-0" />
        )}
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-gray-700/60 p-3 space-y-3">
          {/* Star rating row */}
          {allDone && done > 0 && (
            <div className="flex items-center gap-3 px-1">
              <span className="text-xs text-gray-500">Rating</span>
              <StarRating
                value={session.rating}
                onChange={(stars) => onRate?.(stars)}
              />
              {session.rating && (
                <span className="text-xs text-gray-500">{session.rating} star{session.rating > 1 ? 's' : ''}</span>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {session.variations.map((v, i) => (
              <VariationCard
                key={v.id}
                variation={v}
                index={i}
                onRegenerate={allDone ? onRegenerate : undefined}
                onZoom={v.status === 'done' ? () => {
                  const doneIdx = session.variations
                    .filter((x) => x.status === 'done')
                    .findIndex((x) => x.id === v.id);
                  setCompareInitialIdx(Math.max(0, doneIdx));
                  setCompareOpen(true);
                } : undefined}
              />
            ))}
          </div>

          {allDone && done > 0 && (
            <BatchDownload session={session} />
          )}
        </div>
      )}

      {compareOpen && (
        <ImageCompareModal
          session={session}
          initialVariationIndex={compareInitialIdx}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </div>
  );
}
