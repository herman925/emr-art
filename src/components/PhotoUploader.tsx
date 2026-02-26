import { useCallback, useState } from 'react';
import { Upload, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface Props {
  onFileSelected: (file: File, previewUrl: string) => void;
}

const MAX_SIZE_MB = 20;
const ACCEPTED = ['image/jpeg', 'image/png'];

export default function PhotoUploader({ onFileSelected }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);

      if (!ACCEPTED.includes(file.type)) {
        setError('Only JPEG and PNG files are supported.');
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`File must be under ${MAX_SIZE_MB}MB.`);
        return;
      }

      const url = URL.createObjectURL(file);
      onFileSelected(file, url);
    },
    [onFileSelected]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`
          flex flex-col items-center justify-center gap-4 p-12
          border-2 border-dashed rounded-2xl cursor-pointer transition-all
          ${dragOver
            ? 'border-indigo-400 bg-indigo-500/10'
            : 'border-gray-600 hover:border-gray-500 bg-gray-800/50 hover:bg-gray-800'}
        `}
      >
        <input
          type="file"
          accept="image/jpeg,image/png"
          onChange={onInputChange}
          className="hidden"
        />
        <div className={`p-4 rounded-full transition-colors ${dragOver ? 'bg-indigo-500/20' : 'bg-gray-700'}`}>
          {dragOver ? (
            <ImageIcon className="text-indigo-400" size={32} />
          ) : (
            <Upload className="text-gray-400" size={32} />
          )}
        </div>
        <div className="text-center">
          <p className="text-white font-medium">Drop your Hub photo here</p>
          <p className="text-gray-400 text-sm mt-1">or click to browse</p>
          <p className="text-gray-500 text-xs mt-2">JPEG or PNG · max {MAX_SIZE_MB}MB · min 1024×1024px</p>
        </div>
      </label>

      {error && (
        <div className="flex items-center gap-2 mt-3 text-red-400 text-sm">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
