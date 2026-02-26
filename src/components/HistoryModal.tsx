import { useEffect, useState } from 'react';
import { X, RotateCcw, Trash2, Clock, ImageIcon, HardDrive } from 'lucide-react';
import type { Session } from '../types';
import {
  loadSessions,
  deleteSession,
  loadImageBlobUrl,
  loadSourceBlobUrl,
  getStorageInfo,
} from '../lib/storage';

interface Props {
  onRestore: (session: Session) => void;
  onClose:   () => void;
}

const SESSION_CAP = 100;

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface SessionRow {
  session: Session;
  thumbUrl: string | null;
  sourceUrl: string | null;
}

export default function HistoryModal({ onRestore, onClose }: Props) {
  const [rows, setRows]       = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [storage, setStorage] = useState({ sessionCount: 0, usedBytes: 0, quotaBytes: 0 });

  useEffect(() => {
    (async () => {
      const [sessions, info] = await Promise.all([loadSessions(), getStorageInfo()]);
      setStorage(info);

      // Load thumbnails lazily — first completed variation per session
      const loaded = await Promise.all(
        sessions.map(async (s) => {
          const firstDone = s.variations.find((v) => v.status === 'done');
          const [thumbUrl, sourceUrl] = await Promise.all([
            firstDone ? loadImageBlobUrl(firstDone.id) : Promise.resolve(null),
            loadSourceBlobUrl(s.id),
          ]);
          return { session: s, thumbUrl, sourceUrl };
        })
      );
      setRows(loaded);
      setLoading(false);
    })();
  }, []);

  const handleDelete = async (id: string) => {
    await deleteSession(id);
    setRows((prev) => prev.filter((r) => r.session.id !== id));
    const info = await getStorageInfo();
    setStorage(info);
  };

  const doneCount = (s: Session) => s.variations.filter((v) => v.status === 'done').length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl shadow-2xl my-6">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-white">Generation History</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {storage.sessionCount} / {SESSION_CAP} sessions cached locally
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Storage bar */}
        {storage.quotaBytes > 0 && (
          <div className="px-6 pt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span className="flex items-center gap-1">
                <HardDrive size={11} />
                Browser storage used
              </span>
              <span>{formatBytes(storage.usedBytes)} / {formatBytes(storage.quotaBytes)}</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (storage.usedBytes / storage.quotaBytes) * 100).toFixed(1)}%` }}
              />
            </div>
          </div>
        )}

        {/* Session list */}
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="text-center text-gray-500 py-10 text-sm">Loading history…</div>
          )}
          {!loading && rows.length === 0 && (
            <div className="text-center text-gray-500 py-10 text-sm">No sessions saved yet.</div>
          )}
          {rows.map(({ session: s, thumbUrl, sourceUrl }) => (
            <div
              key={s.id}
              className="flex items-center gap-3 bg-gray-800/60 border border-gray-700 rounded-xl p-3 hover:border-gray-600 transition-colors"
            >
              {/* Source thumbnail */}
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-700 shrink-0">
                {sourceUrl ? (
                  <img src={sourceUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <ImageIcon size={18} />
                  </div>
                )}
              </div>

              {/* Variation strip */}
              <div className="flex gap-1 shrink-0">
                {s.variations.slice(0, 3).map((v, i) => (
                  <div key={v.id} className="w-10 h-10 rounded-md overflow-hidden bg-gray-700">
                    {v.status === 'done' && thumbUrl && i === 0 ? (
                      <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center text-[9px] font-mono ${
                        v.status === 'done' ? 'text-green-400' : v.status === 'error' ? 'text-red-400' : 'text-gray-600'
                      }`}>
                        {v.status === 'done' ? '✓' : v.status === 'error' ? '✗' : '…'}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Meta */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{s.sourceImageName}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Clock size={10} />
                  {formatDate(s.createdAt)}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {doneCount(s)} / {s.variations.length} variations ready
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={() => onRestore(s)}
                  className="flex items-center gap-1 text-xs text-indigo-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 transition-colors"
                >
                  <RotateCcw size={11} />
                  Restore
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 px-2.5 py-1.5 rounded-lg bg-gray-700/50 hover:bg-red-500/10 border border-gray-600/50 transition-colors"
                >
                  <Trash2 size={11} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 text-xs text-gray-600 text-center">
          Sessions auto-saved locally. Oldest sessions are removed when the 100-session limit is reached.
        </div>
      </div>
    </div>
  );
}
