import { useState, useMemo } from 'react';
import { Check, ThumbsDown, Star, Images } from 'lucide-react';
import type { Session, VariationFlag } from '../types';
import AlbumLightbox, { type AlbumItem } from './AlbumLightbox';

interface Props {
  sessions: Session[];
  onFlag: (sessionId: string, variationId: string, flag: VariationFlag | undefined) => void;
  onRate: (sessionId: string, variationId: string, rating: number | undefined) => void;
}

export default function AlbumView({ sessions, onFlag, onRate }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Flat list of all done variations across all sessions
  const albumItems = useMemo<AlbumItem[]>(() => {
    const items: AlbumItem[] = [];
    let idx = 0;
    for (const session of sessions) {
      for (const variation of session.variations) {
        if (variation.status === 'done' && variation.blobUrl) {
          items.push({ session, variation, globalIndex: idx++ });
        }
      }
    }
    return items;
  }, [sessions]);

  if (albumItems.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center gap-4 text-gray-600">
        <Images size={40} className="opacity-20" />
        <div>
          <p className="text-base font-medium text-gray-500">No photos yet</p>
          <p className="text-sm text-gray-600 mt-1">Generated photos will appear here once jobs complete.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {albumItems.map((item, i) => {
          const { variation, session } = item;
          return (
            <button
              key={variation.id}
              onClick={() => setLightboxIndex(i)}
              className="group relative aspect-video bg-gray-900 rounded-xl overflow-hidden border border-gray-700 hover:border-indigo-500/60 transition-all hover:shadow-lg hover:shadow-indigo-900/20"
            >
              {/* Main image */}
              <img
                src={variation.blobUrl!}
                alt={variation.config.label}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                draggable={false}
              />

              {/* Source thumbnail overlay (bottom-left) */}
              <div className="absolute bottom-2 left-2 w-10 h-10 rounded-lg overflow-hidden border-2 border-white/30 shadow-lg bg-gray-900">
                <img
                  src={session.sourceImageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>

              {/* Flag badge */}
              {variation.flag && (
                <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center shadow ${
                  variation.flag === 'accepted' ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {variation.flag === 'accepted'
                    ? <Check size={12} className="text-white" />
                    : <ThumbsDown size={11} className="text-white" />
                  }
                </div>
              )}

              {/* Star badge */}
              {variation.rating && (
                <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                  <Star size={10} className="fill-amber-400 text-amber-400" />
                  <span className="text-[10px] text-amber-300 font-semibold">{variation.rating}</span>
                </div>
              )}

              {/* Hover overlay with label */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-start p-2">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs font-medium text-white drop-shadow">{variation.config.label}</p>
                  <p className="text-[10px] text-gray-300 truncate max-w-[120px] drop-shadow">{session.sourceImageName}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {lightboxIndex !== null && (
        <AlbumLightbox
          items={albumItems}
          currentIndex={lightboxIndex}
          onNavigate={setLightboxIndex}
          onFlag={onFlag}
          onRate={onRate}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
