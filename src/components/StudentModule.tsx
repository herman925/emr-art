import { useState } from 'react';
import { CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import type { Session } from '../types';

interface Props {
  session: Session;
  onBack: () => void;
}

export default function StudentModule({ session, onBack }: Props) {
  const doneVariations = session.variations.filter((v) => v.status === 'done' && v.blobUrl);

  // Build shuffled image array: 1 real + up to 3 variations
  const [images] = useState(() => {
    const all = [
      { id: 'real', url: session.sourceImageUrl, isReal: true },
      ...doneVariations.slice(0, 3).map((v) => ({
        id: v.id,
        url: v.blobUrl!,
        isReal: false,
      })),
    ].sort(() => Math.random() - 0.5);
    return all;
  });

  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const handleSelect = (id: string) => {
    if (revealed) return;
    setSelected(id);
  };

  const handleReveal = () => {
    if (selected) setRevealed(true);
  };

  const handleReset = () => {
    setSelected(null);
    setRevealed(false);
  };

  const isCorrect = revealed && images.find((i) => i.id === selected)?.isReal === true;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Spot the Real Photo</h2>
        <p className="text-gray-400 text-sm mt-1">
          Which of these {images.length} photos is the real Hub photo? Click to select, then reveal.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {images.map((img) => {
          const isSelected = selected === img.id;
          const showResult = revealed;

          return (
            <button
              key={img.id}
              onClick={() => handleSelect(img.id)}
              className={`
                relative aspect-video rounded-xl overflow-hidden border-2 transition-all
                ${isSelected && !showResult ? 'border-indigo-500 ring-2 ring-indigo-500/30' : ''}
                ${!isSelected && !showResult ? 'border-transparent hover:border-gray-600' : ''}
                ${showResult && img.isReal ? 'border-green-500 ring-2 ring-green-500/30' : ''}
                ${showResult && !img.isReal && isSelected ? 'border-red-500 ring-2 ring-red-500/30' : ''}
                ${showResult && !img.isReal && !isSelected ? 'border-transparent opacity-50' : ''}
              `}
            >
              <img src={img.url} alt="" className="w-full h-full object-cover" />

              {showResult && (
                <div className={`absolute inset-0 flex items-center justify-center ${img.isReal ? 'bg-green-500/20' : 'bg-transparent'}`}>
                  {img.isReal && (
                    <div className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      REAL PHOTO
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="mt-6 flex items-center gap-4">
        {!revealed ? (
          <button
            onClick={handleReveal}
            disabled={!selected}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
          >
            Reveal Answer
          </button>
        ) : (
          <div className="flex-1 flex items-center gap-4">
            <div className={`flex items-center gap-2 font-medium ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
              {isCorrect ? <CheckCircle size={20} /> : <XCircle size={20} />}
              {isCorrect ? 'Correct! Good eye.' : 'Not quite — the green border shows the real photo.'}
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              <RotateCcw size={14} />
              Try Again
            </button>
          </div>
        )}
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-white transition-colors">
          ← Back
        </button>
      </div>
    </div>
  );
}
