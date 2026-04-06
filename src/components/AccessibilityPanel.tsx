'use client';

import { useAccessibility, A11ySettings, FontSize, NodeSize, LineThickness } from '@/contexts/AccessibilityContext';

interface Props {
  onClose: () => void;
}

// ─── Option helpers ───────────────────────────────────────────────────────────
function OptionGroup<T extends string>({
  label, options, value, onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-subtle)] mb-2">
        {label}
      </p>
      <div className="flex gap-1.5 flex-wrap">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={value === opt.value
              ? { background: 'var(--accent-dim)', border: '1px solid var(--accent)', color: 'var(--accent)' }
              : { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }
            }
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, description, value, onChange }: {
  label: string; description?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-[var(--text)]">{label}</p>
        {description && <p className="text-[11px] text-[var(--text-subtle)] mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className="relative w-10 h-5.5 rounded-full shrink-0 transition-colors duration-200 mt-0.5"
        style={{
          background: value ? 'var(--accent)' : 'var(--border)',
          width: 40, height: 22,
        }}
        aria-checked={value}
        role="switch"
      >
        <span
          className="absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-transform duration-200"
          style={{
            width: 18, height: 18, top: 2, left: 2,
            transform: value ? 'translateX(18px)' : 'translateX(0)',
            background: 'white',
            borderRadius: '50%',
          }}
        />
      </button>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────
export function AccessibilityPanel({ onClose }: Props) {
  const { settings, update, reset } = useAccessibility();

  const fontSizeOptions: { value: FontSize; label: string }[] = [
    { value: 'small', label: 'Kecil' },
    { value: 'medium', label: 'Sedang' },
    { value: 'large', label: 'Besar' },
    { value: 'xl', label: 'Sangat Besar' },
  ];

  const nodeSizeOptions: { value: NodeSize; label: string }[] = [
    { value: 'small', label: 'Kecil' },
    { value: 'medium', label: 'Sedang' },
    { value: 'large', label: 'Besar' },
  ];

  const lineOptions: { value: LineThickness; label: string }[] = [
    { value: 'thin', label: 'Tipis' },
    { value: 'medium', label: 'Sedang' },
    { value: 'thick', label: 'Tebal' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{
          width: 320,
          background: 'var(--card)',
          borderLeft: '1px solid var(--border)',
          animation: 'slideInRight 0.25s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="font-display text-base font-semibold text-[var(--text)]">Aksesibilitas</h2>
            <p className="text-[11px] text-[var(--text-subtle)] mt-0.5">Pengaturan tampilan</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Settings list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* Font size */}
          <OptionGroup
            label="Ukuran Teks"
            options={fontSizeOptions}
            value={settings.fontSize}
            onChange={v => update({ fontSize: v })}
          />

          {/* Font weight */}
          <OptionGroup
            label="Ketebalan Teks"
            options={[
              { value: 'normal' as A11ySettings['fontWeight'], label: 'Normal' },
              { value: 'bold' as A11ySettings['fontWeight'], label: 'Tebal' },
            ]}
            value={settings.fontWeight}
            onChange={v => update({ fontWeight: v })}
          />

          {/* Contrast */}
          <OptionGroup
            label="Mode Kontras"
            options={[
              { value: 'normal' as A11ySettings['contrast'], label: 'Normal' },
              { value: 'high' as A11ySettings['contrast'], label: 'Kontras Tinggi' },
            ]}
            value={settings.contrast}
            onChange={v => update({ contrast: v })}
          />

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* Node size */}
          <OptionGroup
            label="Ukuran Node Pohon"
            options={nodeSizeOptions}
            value={settings.nodeSize}
            onChange={v => update({ nodeSize: v })}
          />

          {/* Line thickness */}
          <OptionGroup
            label="Ketebalan Garis Penghubung"
            options={lineOptions}
            value={settings.lineThickness}
            onChange={v => update({ lineThickness: v })}
          />

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* Image visibility */}
          <Toggle
            label="Tampilkan Gambar"
            description="Matikan untuk fokus ke teks saja"
            value={settings.showImages}
            onChange={v => update({ showImages: v })}
          />

          {/* Animation */}
          <Toggle
            label="Animasi"
            description="Matikan untuk tampilan lebih ringan"
            value={settings.animations}
            onChange={v => update({ animations: v })}
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t shrink-0" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={reset}
            className="w-full py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            Reset ke Default
          </button>
        </div>
      </div>
    </>
  );
}
