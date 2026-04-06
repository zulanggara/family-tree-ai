'use client';

import { useState, useRef } from 'react';
import { useToast } from '@/components/admin/Toast';

export const dynamic = 'force-dynamic';

const EXPORT_FORMATS = [
  {
    format: 'json',
    label: 'JSON',
    desc: 'Format asli aplikasi, cocok untuk restore penuh',
    icon: '{ }',
    color: '#f59e0b',
  },
  {
    format: 'csv',
    label: 'CSV',
    desc: 'Spreadsheet universal, bisa dibuka di Excel/Sheets',
    icon: '⊞',
    color: '#22c55e',
  },
  {
    format: 'excel',
    label: 'Excel (.xlsx)',
    desc: 'Format Microsoft Excel dengan sheet Members & Marriages',
    icon: '⊟',
    color: '#16a34a',
  },
  {
    format: 'sql',
    label: 'PostgreSQL SQL',
    desc: 'Script SQL untuk PostgreSQL — restore langsung ke DB',
    icon: '▷',
    color: '#3b82f6',
  },
  {
    format: 'mysql',
    label: 'MySQL SQL',
    desc: 'Script SQL untuk MySQL/MariaDB',
    icon: '▷',
    color: '#06b6d4',
  },
];

const IMPORT_FORMATS = [
  { format: 'json', label: 'JSON', accept: '.json', desc: 'File JSON backup dari aplikasi ini' },
  { format: 'csv', label: 'CSV', accept: '.csv', desc: 'CSV dengan kolom standar (id, name, gender, …)' },
  { format: 'excel', label: 'Excel (.xlsx)', accept: '.xlsx,.xls', desc: 'File Excel dengan sheet Members' },
];

export default function BackupPage() {
  const toast = useToast();
  const [exporting, setExporting] = useState<string | null>(null);
  const [importFormat, setImportFormat] = useState('json');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number; failed: number; marriages: number; errors: string[];
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleExport(format: string) {
    setExporting(format);
    try {
      const res = await fetch(`/api/admin/backup?format=${format}`);
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? 'Ekspor gagal');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disp = res.headers.get('content-disposition') ?? '';
      const match = disp.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? `backup.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Ekspor ${format.toUpperCase()} berhasil diunduh`);
    } catch {
      toast.error('Gagal mengunduh file');
    } finally {
      setExporting(null);
    }
  }

  async function handleImport() {
    const file = fileRef.current?.files?.[0];
    if (!file) { toast.warning('Pilih file terlebih dahulu'); return; }

    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', importFormat);

      const res = await fetch('/api/admin/import', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Import gagal');
        return;
      }
      setImportResult(data);
      if (data.created > 0) {
        toast.success(`${data.created} anggota berhasil diimport`);
      } else {
        toast.warning('Tidak ada anggota baru yang diimport');
      }
      if (fileRef.current) fileRef.current.value = '';
    } catch {
      toast.error('Gagal mengupload file');
    } finally {
      setImporting(false);
    }
  }

  const selectedImport = IMPORT_FORMATS.find(f => f.format === importFormat);

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text)]">Backup & Import</h1>
        <p className="text-sm text-[var(--text-subtle)] mt-0.5">
          Ekspor data keluarga ke berbagai format atau import dari file
        </p>
      </div>

      {/* ── Export Section ── */}
      <section>
        <h2 className="text-base font-semibold text-[var(--text)] mb-4">Ekspor Data</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXPORT_FORMATS.map(f => (
            <div key={f.format}
              className="rounded-xl p-5 flex flex-col gap-3"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{ background: `${f.color}1a`, color: f.color, border: `1px solid ${f.color}33` }}>
                  {f.icon}
                </div>
                <div>
                  <p className="font-semibold text-[var(--text)] text-sm">{f.label}</p>
                  <p className="text-[11px] text-[var(--text-subtle)] leading-snug">{f.desc}</p>
                </div>
              </div>
              <button
                onClick={() => handleExport(f.format)}
                disabled={exporting === f.format}
                className="w-full py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-40 flex items-center justify-center gap-1.5"
                style={{ background: `${f.color}1a`, color: f.color, border: `1px solid ${f.color}33` }}
              >
                {exporting === f.format ? (
                  <>
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                    </svg>
                    Mengunduh…
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Unduh {f.label}
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Import Section ── */}
      <section>
        <h2 className="text-base font-semibold text-[var(--text)] mb-4">Import Data</h2>
        <div className="rounded-xl p-6 max-w-lg space-y-4"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>

          <div className="p-3 rounded-lg text-xs"
            style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#f59e0b' }}>
            ⚠️ Import akan menambah data baru. Anggota dengan ID yang sudah ada akan dilewati (tidak ditimpa).
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-subtle)] mb-1.5 uppercase tracking-wider">
              Format File
            </label>
            <div className="flex gap-2 flex-wrap">
              {IMPORT_FORMATS.map(f => (
                <button key={f.format}
                  type="button"
                  onClick={() => setImportFormat(f.format)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: importFormat === f.format ? 'var(--accent-dim)' : 'var(--bg)',
                    color: importFormat === f.format ? 'var(--accent)' : 'var(--text-muted)',
                    border: `1px solid ${importFormat === f.format ? 'var(--accent)' : 'var(--border)'}`,
                  }}>
                  {f.label}
                </button>
              ))}
            </div>
            {selectedImport && (
              <p className="text-[11px] text-[var(--text-subtle)] mt-1">{selectedImport.desc}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-subtle)] mb-1.5 uppercase tracking-wider">
              Pilih File
            </label>
            <input
              ref={fileRef}
              type="file"
              accept={selectedImport?.accept}
              className="w-full text-sm text-[var(--text-muted)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:cursor-pointer transition-all"
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                padding: '6px 8px',
                borderRadius: 8,
              }}
            />
          </div>

          <button
            onClick={handleImport}
            disabled={importing}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--blue))' }}
          >
            {importing ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                </svg>
                Mengimport…
              </>
            ) : 'Import Data'}
          </button>

          {importResult && (
            <div className="rounded-lg p-4 space-y-2 text-sm"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <p className="font-semibold text-[var(--text)]">Hasil Import</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg p-2" style={{ background: 'rgba(34,197,94,0.08)' }}>
                  <p className="text-lg font-bold text-green-400">{importResult.created}</p>
                  <p className="text-[10px] text-[var(--text-subtle)]">Ditambah</p>
                </div>
                <div className="rounded-lg p-2" style={{ background: 'rgba(59,130,246,0.08)' }}>
                  <p className="text-lg font-bold" style={{ color: 'var(--blue)' }}>{importResult.marriages}</p>
                  <p className="text-[10px] text-[var(--text-subtle)]">Pernikahan</p>
                </div>
                <div className="rounded-lg p-2" style={{ background: 'rgba(239,68,68,0.08)' }}>
                  <p className="text-lg font-bold text-red-400">{importResult.failed}</p>
                  <p className="text-[10px] text-[var(--text-subtle)]">Gagal</p>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="text-[10px] text-red-400 mt-2 space-y-0.5">
                  {importResult.errors.map((e, i) => <p key={i}>• {e}</p>)}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
