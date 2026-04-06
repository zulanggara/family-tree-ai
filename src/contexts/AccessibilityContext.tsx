'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
export type FontSize = 'small' | 'medium' | 'large' | 'xl';
export type NodeSize = 'small' | 'medium' | 'large';
export type LineThickness = 'thin' | 'medium' | 'thick';

export interface A11ySettings {
  fontSize: FontSize;
  fontWeight: 'normal' | 'bold';
  contrast: 'normal' | 'high';
  showImages: boolean;
  nodeSize: NodeSize;
  lineThickness: LineThickness;
  animations: boolean;
}

// ─── Derived value maps ───────────────────────────────────────────────────────
const FONT_SIZE_PX: Record<FontSize, number> = {
  small: 13, medium: 16, large: 18, xl: 21,
};

export const NODE_SIZES: Record<NodeSize, { w: number; av: number }> = {
  small:  { w: 74,  av: 56 },
  medium: { w: 90,  av: 72 },
  large:  { w: 110, av: 90 },
};

export const LINE_WIDTHS: Record<LineThickness, number> = {
  thin: 1, medium: 1.5, thick: 2.5,
};

// ─── Defaults ─────────────────────────────────────────────────────────────────
export const A11Y_DEFAULTS: A11ySettings = {
  fontSize: 'medium',
  fontWeight: 'normal',
  contrast: 'normal',
  showImages: true,
  nodeSize: 'medium',
  lineThickness: 'medium',
  animations: true,
};

const STORAGE_KEY = 'a11y_settings';

// ─── Apply settings to DOM ────────────────────────────────────────────────────
function applySettings(s: A11ySettings) {
  const html = document.documentElement;
  html.style.fontSize = `${FONT_SIZE_PX[s.fontSize]}px`;
  document.body.style.fontWeight = s.fontWeight === 'bold' ? '600' : '';
  html.classList.toggle('high-contrast', s.contrast === 'high');
  html.classList.toggle('hide-images', !s.showImages);
  html.classList.toggle('no-animations', !s.animations);
  html.classList.remove('a11y-node-small', 'a11y-node-medium', 'a11y-node-large');
  html.classList.add(`a11y-node-${s.nodeSize}`);
  html.classList.remove('a11y-line-thin', 'a11y-line-medium', 'a11y-line-thick');
  html.classList.add(`a11y-line-${s.lineThickness}`);
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface A11yContextValue {
  settings: A11ySettings;
  update: (partial: Partial<A11ySettings>) => void;
  reset: () => void;
}

const AccessibilityContext = createContext<A11yContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<A11ySettings>(A11Y_DEFAULTS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = { ...A11Y_DEFAULTS, ...JSON.parse(saved) } as A11ySettings;
        setSettings(parsed);
        applySettings(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  const update = useCallback((partial: Partial<A11ySettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      applySettings(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    applySettings(A11Y_DEFAULTS);
    setSettings(A11Y_DEFAULTS);
  }, []);

  return (
    <AccessibilityContext.Provider value={{ settings, update, reset }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility must be used inside AccessibilityProvider');
  return ctx;
}
