'use client';

import { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  emptyLabel?: string;
}

export function SearchableSelect({ value, onChange, options, placeholder = 'Pilih…', emptyLabel = '— Tidak diketahui —' }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find(o => o.value === value);

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function select(v: string) {
    onChange(v);
    setOpen(false);
    setQuery('');
  }

  const btnStyle: React.CSSProperties = {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    color: value ? 'var(--text)' : 'var(--text-subtle)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 14,
    width: '100%',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    cursor: 'pointer',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    zIndex: 50,
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
    overflow: 'hidden',
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger button */}
      <button type="button" onClick={() => setOpen(o => !o)} style={btnStyle}>
        <span className="truncate text-sm">
          {selected ? selected.label : emptyLabel}
        </span>
        <svg
          width="12" height="12" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth={2.5}
          style={{ flexShrink: 0, color: 'var(--text-subtle)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={dropdownStyle}>
          {/* Search input */}
          <div style={{ padding: '8px 8px 4px', borderBottom: '1px solid var(--border)' }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cari nama…"
              onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setQuery(''); } }}
              style={{
                width: '100%',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 13,
                color: 'var(--text)',
                outline: 'none',
              }}
            />
          </div>

          {/* Options list */}
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {/* Empty option */}
            <button
              type="button"
              onClick={() => select('')}
              style={{
                width: '100%', textAlign: 'left', padding: '8px 12px',
                fontSize: 13, color: 'var(--text-subtle)',
                background: value === '' ? 'var(--accent-dim)' : 'transparent',
                cursor: 'pointer', border: 'none',
              }}
            >
              {emptyLabel}
            </button>

            {filtered.length === 0 && (
              <p style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-subtle)', fontStyle: 'italic' }}>
                Tidak ditemukan
              </p>
            )}

            {filtered.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => select(o.value)}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 12px',
                  fontSize: 13, color: o.value === value ? 'var(--accent)' : 'var(--text)',
                  background: o.value === value ? 'var(--accent-dim)' : 'transparent',
                  cursor: 'pointer', border: 'none',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
                onMouseEnter={e => { if (o.value !== value) (e.currentTarget as HTMLElement).style.background = 'var(--bg)'; }}
                onMouseLeave={e => { if (o.value !== value) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span className="truncate">{o.label}</span>
                {o.value === value && (
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} style={{ flexShrink: 0, color: 'var(--accent)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
