'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Props {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export function GalleryLightbox({ images, initialIndex = 0, onClose }: Props) {
  const [current, setCurrent] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);

  const prev = useCallback(() => setCurrent(i => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setCurrent(i => (i + 1) % images.length), [images.length]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, prev, next]);

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
    touchStartX.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all z-10 text-white"
        style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
      >
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-xs text-white/60 z-10">
        {current + 1} / {images.length}
      </div>

      {/* Prev button */}
      {images.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); prev(); }}
          className="absolute left-3 w-10 h-10 rounded-full flex items-center justify-center transition-all z-10 text-white"
          style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Main image */}
      <div
        className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center"
        onClick={e => e.stopPropagation()}
      >
        <img
          key={current}
          src={images[current]}
          alt={`Foto ${current + 1}`}
          className="max-w-full max-h-[85vh] rounded-xl object-contain"
          style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.5)', animation: 'fadeIn 0.15s ease-out' }}
          onError={e => {
            (e.target as HTMLImageElement).src =
              `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23333' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' fill='%23888' text-anchor='middle' font-size='14'%3EGambar tidak ditemukan%3C/text%3E%3C/svg%3E`;
          }}
        />
      </div>

      {/* Next button */}
      {images.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); next(); }}
          className="absolute right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all z-10 text-white"
          style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto pb-1"
          onClick={e => e.stopPropagation()}
        >
          {images.map((url, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="shrink-0 rounded-lg overflow-hidden transition-all"
              style={{
                width: 48, height: 48,
                opacity: i === current ? 1 : 0.45,
                border: i === current ? '2px solid white' : '2px solid transparent',
              }}
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
