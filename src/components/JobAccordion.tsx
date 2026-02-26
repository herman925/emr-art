import { useState } from 'react';
import { ChevronDown, ChevronUp, GraduationCap, X, ScanSearch } from 'lucide-react';
import type { Session } from '../types';
import VariationCard from './VariationCard';
import BatchDownload from './BatchDownload';
import ImageCompareModal from './ImageCompareModal';

interface Props {
  session: Session;
  onRegenerate?: (variationId: string) => void;
  onStudentView?: () => void;
  onRemove?: () => void;
}

export default function JobAccordion({ session, onRegenerate, onStudentView, onRemove }: Props) {
  const total  = session.variations.length;
  const done   = session.variations.filter((v) => v.status === 'done').length;
  const errors = session.variations.filter((v) => v.status === 'error').length;
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
    <div className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden">
      {/* Accordion header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-3 hover:bg-gray-700/40 transition-colors text-left"
      >
        {/* Source thumbnail */}
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-700 shrink-0">
          <img src={session.sourceImageUrl} alt="" className="w-full h-full object-cover" />
        </div>

        {/* Meta */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{session.sourceImageName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
            <span className="text-xs text-gray-600">·</span>
            <span className="text-xs text-gray-600">{total} variation{total !== 1 ? 's' : ''}</span>
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

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {done > 0 && (
            <button
              onClick={() => { setCompareInitialIdx(0); setCompareOpen(true); }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              title="Compare variations"
            >
              <ScanSearch size={12} />
              Compare
            </button>
          )}
          {allDone && done > 0 && onStudentView && (
            <button
              onClick={onStudentView}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              <GraduationCap size={12} />
              Student
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-gray-700 transition-colors"
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {session.variations.map((v, i) => (
              <VariationCard
                key={v.id}
                variation={v}
                index={i}
                onRegenerate={allDone ? onRegenerate : undefined}
                onZoom={v.status === 'done' ? () => { setCompareInitialIdx(session.variations.filter((x, j) => x.status === 'done' && j <= i).length - 1); setCompareOpen(true); } : undefined}
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
