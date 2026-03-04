import { useState, useEffect, useMemo, useCallback } from 'react';
import JSZip from 'jszip';
import { X, Download, Star, Check, ThumbsDown, Package, Filter, FileDown, ChevronDown, ChevronRight } from 'lucide-react';
// Star is used in the star-filter buttons below
import type { Session } from '../types';
import { loadSessions, loadImageBlobUrl, loadSourceBlobUrl } from '../lib/storage';

interface Props {
  onClose: () => void;
  onMarkDownloaded: (ids: { sessionId: string; variationId: string }[]) => void;
}

type FlagFilter = 'all' | 'accepted' | 'rejected' | 'unreviewed' | 'not-downloaded';

interface SessionWithBlobs extends Session {
  sourceImageUrl: string; // resolved blob URL
}

export default function BulkExportModal({ onClose, onMarkDownloaded }: Props) {
  const [sessions, setSessions] = useState<SessionWithBlobs[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [flagFilter, setFlagFilter] = useState<FlagFilter>('accepted');
  const [minStars, setMinStars] = useState<number>(0);
  const [includeOriginals, setIncludeOriginals] = useState(false);

  // Download state
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  // Load all sessions + resolve source blob URLs
  useEffect(() => {
    (async () => {
      setLoading(true);
      const stored = await loadSessions();
      const resolved = await Promise.all(
        stored.map(async (sess) => {
          const sourceUrl = await loadSourceBlobUrl(sess.id);
          return { ...sess, sourceImageUrl: sourceUrl ?? sess.sourceImageUrl };
        })
      );
      setSessions(resolved);
      setLoading(false);
    })();
  }, []);

  // Filter sessions (based on per-variation flags/ratings)
  const filtered = useMemo(() => {
    return sessions
      .map((sess) => {
        const matchingVariations = sess.variations.filter((v) => {
          if (v.status !== 'done') return false;
          if (flagFilter === 'accepted'      && v.flag !== 'accepted')  return false;
          if (flagFilter === 'rejected'      && v.flag !== 'rejected')  return false;
          if (flagFilter === 'unreviewed'    && v.flag != null)          return false;
          if (flagFilter === 'not-downloaded' && v.downloaded === true)  return false;
          if (minStars > 0 && (!v.rating || v.rating < minStars))    return false;
          return true;
        });
        return { ...sess, variations: matchingVariations };
      })
      .filter((sess) => sess.variations.length > 0);
  }, [sessions, flagFilter, minStars]);

  const totalVariations = filtered.reduce(
    (n, s) => n + s.variations.filter((v) => v.status === 'done').length,
    0
  );
  const totalPhotos = totalVariations + (includeOriginals ? filtered.length : 0);

  const toggleSession = useCallback((sessId: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessId)) next.delete(sessId); else next.add(sessId);
      return next;
    });
  }, []);

  const handleDownloadOne = useCallback(async (
    sessId: string,
    variationId: string,
    baseName: string,
    varIndex: number,
  ) => {
    if (downloadingId) return;
    setDownloadingId(variationId);
    try {
      const blobUrl = await loadImageBlobUrl(variationId);
      if (!blobUrl) return;
      const res = await fetch(blobUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}_v${varIndex + 1}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
      onMarkDownloaded([{ sessionId: sessId, variationId }]);
    } finally {
      setDownloadingId(null);
    }
  }, [downloadingId, onMarkDownloaded]);

  const handleDownload = async () => {
    if (filtered.length === 0) return;
    setDownloading(true);
    setProgress('Preparing…');

    try {
      const zip = new JSZip();

      for (let si = 0; si < filtered.length; si++) {
        const sess = filtered[si];
        const baseName = sess.sourceImageName.replace(/\.[^.]+$/, '');

        setProgress(`Fetching job ${si + 1} / ${filtered.length}…`);

        if (includeOriginals) {
          const srcUrl = sess.sourceImageUrl;
          if (srcUrl) {
            const ext = sess.sourceImageName.match(/\.[^.]+$/)?.[0] ?? '.jpg';
            const res = await fetch(srcUrl);
            const blob = await res.blob();
            zip.file(`${baseName}${ext}`, blob);
          }
        }

        for (let vi = 0; vi < sess.variations.length; vi++) {
          const v = sess.variations[vi];
          const blobUrl = await loadImageBlobUrl(v.id);
          if (!blobUrl) continue;
          const res = await fetch(blobUrl);
          const blob = await res.blob();
          zip.file(`${baseName}_v${vi + 1}.jpg`, blob);
        }
      }

      setProgress('Building ZIP…');
      const zipBlob = await zip.generateAsync({ type: 'blob' }, (meta) => {
        setProgress(`Compressing… ${Math.round(meta.percent)}%`);
      });

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `emr-art-export-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      // Mark all exported variations as downloaded in persistent state
      const downloadedIds = filtered.flatMap((sess) =>
        sess.variations.map((v) => ({ sessionId: sess.id, variationId: v.id }))
      );
      onMarkDownloaded(downloadedIds);
    } finally {
      setDownloading(false);
      setProgress('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <Package size={18} className="text-indigo-400" />
            <h2 className="text-base font-bold text-white">Bulk Export</h2>
          </div>
          <button type="button" onClick={onClose} title="Close" className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            <X size={17} />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-800 space-y-4 shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Filter size={14} />
            <span className="font-semibold text-gray-300">Filter criteria</span>
          </div>

          {/* Flag filter */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Review status</p>
            <div className="flex gap-2">
              {([
                { value: 'all',            label: 'All',           icon: null },
                { value: 'accepted',       label: 'Accepted',      icon: <Check size={12} className="text-green-400" /> },
                { value: 'rejected',       label: 'Rejected',      icon: <ThumbsDown size={12} className="text-red-400" /> },
                { value: 'unreviewed',     label: 'Unreviewed',    icon: null },
                { value: 'not-downloaded', label: 'Not exported',  icon: <FileDown size={12} className="text-amber-400" /> },
              ] as { value: FlagFilter; label: string; icon: React.ReactNode }[]).map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setFlagFilter(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                    flagFilter === opt.value
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Star filter */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Minimum star rating</p>
            <div className="flex gap-2">
              {[
                { value: 0, label: 'Any' },
                { value: 1, label: '1+' },
                { value: 2, label: '2+' },
                { value: 3, label: '3+' },
                { value: 4, label: '4+' },
                { value: 5, label: '5' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setMinStars(opt.value)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                    minStars === opt.value
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                  }`}
                >
                  {opt.value > 0 && <Star size={11} className="fill-amber-400 text-amber-400" />}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Include originals toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              onClick={() => setIncludeOriginals((v) => !v)}
              className={`w-9 h-5 rounded-full border transition-colors relative ${
                includeOriginals ? 'bg-indigo-600 border-indigo-500' : 'bg-gray-700 border-gray-600'
              }`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                includeOriginals ? 'left-4' : 'left-0.5'
              }`} />
            </div>
            <span className="text-sm text-gray-300">Include original photos</span>
          </label>
        </div>

        {/* Preview list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center text-gray-500 py-8 text-sm">Loading history…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm font-medium">No sessions match the current filters.</p>
              <p className="text-gray-600 text-xs mt-1">Try adjusting the review status or star filter above.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((sess) => {
                const doneCount = sess.variations.length;
                const baseName = sess.sourceImageName.replace(/\.[^.]+$/, '');
                const isExpanded = expandedSessions.has(sess.id);
                return (
                  <div key={sess.id} className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden">
                    {/* Session header row — click to expand */}
                    <button
                      type="button"
                      onClick={() => toggleSession(sess.id)}
                      className="w-full flex items-center gap-3 p-2.5 hover:bg-gray-700/40 transition-colors text-left"
                    >
                      {isExpanded
                        ? <ChevronDown size={14} className="text-gray-500 shrink-0" />
                        : <ChevronRight size={14} className="text-gray-500 shrink-0" />}
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-700 shrink-0">
                        <img src={sess.sourceImageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{sess.sourceImageName}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-500">{doneCount} variation{doneCount !== 1 ? 's' : ''}</span>
                          {sess.variations.some((v) => v.flag === 'accepted') && (
                            <span className="flex items-center gap-1 text-xs text-green-400">
                              <Check size={10} /> {sess.variations.filter((v) => v.flag === 'accepted').length} accepted
                            </span>
                          )}
                          {sess.variations.some((v) => v.flag === 'rejected') && (
                            <span className="flex items-center gap-1 text-xs text-red-400">
                              <ThumbsDown size={10} /> {sess.variations.filter((v) => v.flag === 'rejected').length} rejected
                            </span>
                          )}
                          {sess.variations.some((v) => v.downloaded) && (
                            <span className="flex items-center gap-1 text-xs text-amber-400">
                              <FileDown size={10} /> {sess.variations.filter((v) => v.downloaded).length} exported
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 shrink-0">
                        {doneCount + (includeOriginals ? 1 : 0)} file{(doneCount + (includeOriginals ? 1 : 0)) !== 1 ? 's' : ''}
                      </span>
                    </button>

                    {/* Expanded variation list */}
                    {isExpanded && (
                      <div className="border-t border-gray-700 divide-y divide-gray-700/60">
                        {sess.variations.map((v, vi) => {
                          const isLoading = downloadingId === v.id;
                          return (
                            <div key={v.id} className="flex items-center gap-2.5 px-3 py-2">
                              <div className="w-9 h-9 rounded-md overflow-hidden bg-gray-700 shrink-0">
                                {v.blobUrl && <img src={v.blobUrl} alt="" className="w-full h-full object-cover" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-300 truncate">
                                  {baseName}_v{vi + 1}.jpg
                                </p>
                                <p className="text-[10px] text-gray-500 truncate">{v.config.label}</p>
                              </div>
                              {v.downloaded && (
                                <span className="text-[10px] text-amber-400/80 shrink-0">exported</span>
                              )}
                              <button
                                type="button"
                                title={`Download ${baseName}_v${vi + 1}.jpg`}
                                disabled={!!downloadingId}
                                onClick={() => handleDownloadOne(sess.id, v.id, baseName, vi)}
                                className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                {isLoading
                                  ? <span className="block w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                  : <Download size={13} />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-gray-400">
              {filtered.length > 0 ? (
                <>
                  <span className="font-semibold text-white">{filtered.length}</span> job{filtered.length !== 1 ? 's' : ''} ·{' '}
                  <span className="font-semibold text-white">{totalPhotos}</span> file{totalPhotos !== 1 ? 's' : ''} total
                </>
              ) : (
                <span className="text-gray-600">No matching jobs</span>
              )}
            </div>
            <button
              type="button"
              onClick={handleDownload}
              disabled={filtered.length === 0 || downloading}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Download size={15} />
              {downloading ? progress || 'Working…' : `Download ZIP`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
