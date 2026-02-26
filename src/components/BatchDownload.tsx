import { useState } from 'react';
import JSZip from 'jszip';
import { Download, Package, CheckSquare, Square } from 'lucide-react';
import type { Session } from '../types';

interface ImageEntry {
  id: string;
  label: string;
  blobUrl: string;
  filename: string;
}

interface Props {
  session: Session;
}

export default function BatchDownload({ session }: Props) {
  const allImages: ImageEntry[] = [
    {
      id: 'original',
      label: 'Original',
      blobUrl: session.sourceImageUrl,
      filename: `original-${session.sourceImageName}`,
    },
    ...session.variations
      .filter((v) => v.status === 'done' && v.blobUrl)
      .map((v, i) => ({
        id: v.id,
        label: `V${i + 1} · ${v.config.label}`,
        blobUrl: v.blobUrl!,
        filename: `variation-${i + 1}-${v.config.category}.jpg`,
      })),
  ];

  const [selected, setSelected] = useState<Set<string>>(
    new Set(allImages.map((img) => img.id))
  );
  const [downloading, setDownloading] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === allImages.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allImages.map((img) => img.id)));
    }
  };

  const handleBatchDownload = async () => {
    const toDownload = allImages.filter((img) => selected.has(img.id));
    if (toDownload.length === 0) return;

    if (toDownload.length === 1) {
      // Single file — direct download, no zip needed
      const img = toDownload[0];
      const a = document.createElement('a');
      a.href = img.blobUrl;
      a.download = img.filename;
      a.click();
      return;
    }

    setDownloading(true);
    try {
      const zip = new JSZip();
      const sessionDate = new Date(session.createdAt)
        .toISOString()
        .slice(0, 10);
      const folder = zip.folder(`emr-art-${sessionDate}`)!;

      await Promise.all(
        toDownload.map(async (img) => {
          const response = await fetch(img.blobUrl);
          const blob = await response.blob();
          folder.file(img.filename, blob);
        })
      );

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `emr-art-${sessionDate}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const allSelected = selected.size === allImages.length;
  const noneSelected = selected.size === 0;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package size={15} className="text-indigo-400" />
          <span className="text-sm font-medium text-white">Batch Download</span>
          <span className="text-xs text-gray-500">
            {selected.size} of {allImages.length} selected
          </span>
        </div>
        <button
          onClick={toggleAll}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      {/* Image checkboxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {allImages.map((img) => {
          const isChecked = selected.has(img.id);
          return (
            <button
              key={img.id}
              onClick={() => toggle(img.id)}
              className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all group ${
                isChecked
                  ? 'border-indigo-500 ring-1 ring-indigo-500/30'
                  : 'border-gray-700 opacity-60 hover:opacity-80'
              }`}
            >
              <img
                src={img.blobUrl}
                alt={img.label}
                className="w-full h-full object-cover"
              />
              {/* Overlay */}
              <div
                className={`absolute inset-0 transition-colors ${
                  isChecked ? 'bg-indigo-600/10' : 'bg-black/20'
                }`}
              />
              {/* Checkbox icon */}
              <div className="absolute top-1.5 left-1.5">
                {isChecked ? (
                  <CheckSquare size={15} className="text-indigo-400 drop-shadow" />
                ) : (
                  <Square size={15} className="text-gray-400 drop-shadow" />
                )}
              </div>
              {/* Label */}
              <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1.5 py-1">
                <p className="text-white text-[10px] truncate leading-tight">{img.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleBatchDownload}
        disabled={noneSelected || downloading}
        className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
      >
        <Download size={14} />
        {downloading
          ? 'Zipping…'
          : selected.size === 1
          ? 'Download 1 image'
          : `Download ${selected.size} images as ZIP`}
      </button>
    </div>
  );
}
