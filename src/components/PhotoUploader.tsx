import { useCallback, useState } from 'react';
import { Upload, X, Play, AlertCircle } from 'lucide-react';

interface Props {
  onFilesSelected: (files: File[]) => void;
}

const MAX_SIZE_MB = 20;
const ACCEPTED    = ['image/jpeg', 'image/png'];

interface StagedFile {
  file: File;
  previewUrl: string;
}

export default function PhotoUploader({ onFilesSelected }: Props) {
  const [staged, setStaged]   = useState<StagedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    setError(null);
    const valid: StagedFile[] = [];
    const errors: string[]    = [];

    for (const f of Array.from(incoming)) {
      if (!ACCEPTED.includes(f.type)) {
        errors.push(`${f.name}: only JPEG/PNG supported`);
        continue;
      }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        errors.push(`${f.name}: exceeds ${MAX_SIZE_MB} MB`);
        continue;
      }
      valid.push({ file: f, previewUrl: URL.createObjectURL(f) });
    }

    if (errors.length) setError(errors[0]);
    if (valid.length)  setStaged((prev) => [...prev, ...valid]);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = '';
  };

  const removeStaged = (idx: number) => {
    setStaged((prev) => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleGenerate = () => {
    if (!staged.length) return;
    const files = staged.map((s) => s.file);
    setStaged([]);
    onFilesSelected(files);
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-3">
      {/* Drop zone */}
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`
          flex flex-col items-center justify-center gap-4 p-10
          border-2 border-dashed rounded-2xl cursor-pointer transition-all
          ${dragOver
            ? 'border-indigo-400 bg-indigo-500/10'
            : 'border-gray-600 hover:border-gray-500 bg-gray-800/50 hover:bg-gray-800'}
        `}
      >
        <input
          type="file"
          accept="image/jpeg,image/png"
          multiple
          onChange={onInputChange}
          className="hidden"
        />
        <div className={`p-4 rounded-full transition-colors ${dragOver ? 'bg-indigo-500/20' : 'bg-gray-700'}`}>
          <Upload className={dragOver ? 'text-indigo-400' : 'text-gray-400'} size={28} />
        </div>
        <div className="text-center">
          <p className="text-white font-medium">Drop Hub photos here</p>
          <p className="text-gray-400 text-sm mt-1">or click to browse — multiple files supported</p>
          <p className="text-gray-500 text-xs mt-1.5">JPEG or PNG · max {MAX_SIZE_MB} MB each</p>
        </div>
      </label>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Staged files */}
      {staged.length > 0 && (
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {staged.length} photo{staged.length > 1 ? 's' : ''} queued
          </p>

          <div className="flex flex-wrap gap-2">
            {staged.map((s, i) => (
              <div key={i} className="relative group w-16 h-16 rounded-lg overflow-hidden bg-gray-700 shrink-0">
                <img src={s.previewUrl} alt={s.file.name} className="w-full h-full object-cover" />
                <button
                  onClick={() => removeStaged(i)}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={16} className="text-white" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => { staged.forEach(s => URL.revokeObjectURL(s.previewUrl)); setStaged([]); }}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Clear all
            </button>
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Play size={13} />
              Generate {staged.length} photo{staged.length > 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
