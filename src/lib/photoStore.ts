const PREFIX = 'family_photo_';

export function getCustomPhoto(memberId: string): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(PREFIX + memberId); }
  catch { return null; }
}

export function setCustomPhoto(memberId: string, dataUrl: string): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(PREFIX + memberId, dataUrl); }
  catch {}
}

export function removeCustomPhoto(memberId: string): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(PREFIX + memberId); }
  catch {}
}

export function getAllCustomPhotos(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const result: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PREFIX)) {
        const val = localStorage.getItem(key);
        if (val) result[key.slice(PREFIX.length)] = val;
      }
    }
  } catch {}
  return result;
}
