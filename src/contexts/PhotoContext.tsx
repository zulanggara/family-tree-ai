'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getAllCustomPhotos, setCustomPhoto, removeCustomPhoto } from '@/lib/photoStore';

interface PhotoContextType {
  photoMap: Record<string, string>;
  uploadPhoto: (memberId: string, file: File) => void;
  removePhoto: (memberId: string) => void;
  getPhoto: (memberId: string, fallback: string) => string;
}

const PhotoContext = createContext<PhotoContextType>({
  photoMap: {},
  uploadPhoto: () => {},
  removePhoto: () => {},
  getPhoto: (_, fb) => fb,
});

export function PhotoProvider({ children }: { children: React.ReactNode }) {
  const [photoMap, setPhotoMap] = useState<Record<string, string>>({});

  useEffect(() => {
    setPhotoMap(getAllCustomPhotos());
  }, []);

  const uploadPhoto = useCallback((memberId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setCustomPhoto(memberId, dataUrl);
      setPhotoMap(prev => ({ ...prev, [memberId]: dataUrl }));
    };
    reader.readAsDataURL(file);
  }, []);

  const removePhoto = useCallback((memberId: string) => {
    removeCustomPhoto(memberId);
    setPhotoMap(prev => {
      const next = { ...prev };
      delete next[memberId];
      return next;
    });
  }, []);

  const getPhoto = useCallback((memberId: string, fallback: string) => {
    return photoMap[memberId] || fallback;
  }, [photoMap]);

  return (
    <PhotoContext.Provider value={{ photoMap, uploadPhoto, removePhoto, getPhoto }}>
      {children}
    </PhotoContext.Provider>
  );
}

export const usePhoto = () => useContext(PhotoContext);
