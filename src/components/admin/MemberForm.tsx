'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { FamilyMember, MarriageStatus } from '@/types';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from './Toast';
import { SearchableSelect } from './SearchableSelect';

interface Props {
  /** Existing member when editing; undefined when creating */
  member?: FamilyMember;
  /** All members for father/mother/spouse dropdowns */
  allMembers: FamilyMember[];
  mode: 'create' | 'edit';
}

interface PendingMarriage {
  spouseId: string;
  status: MarriageStatus;
  marriedDate: string | null;
  endDate: string | null;
}

const MARRIAGE_STATUS_OPTIONS: { value: MarriageStatus; label: string }[] = [
  { value: 'married', label: 'Menikah' },
  { value: 'widowed', label: 'Duda/Janda (Wafat)' },
  { value: 'divorced', label: 'Bercerai' },
  { value: 'separated', label: 'Pisah' },
  { value: 'annulled', label: 'Dibatalkan' },
];

export function MemberForm({ member, allMembers, mode }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Marriage removal confirmation
  const [removeMarriageDialog, setRemoveMarriageDialog] = useState(false);
  const [pendingRemoveSpouseId, setPendingRemoveSpouseId] = useState<string | null>(null);

  // Basic fields
  const [name, setName] = useState(member?.name ?? '');
  const [customId, setCustomId] = useState(member?.id ?? '');
  const [gender, setGender] = useState<'male' | 'female'>(member?.gender ?? 'male');
  const [nickname, setNickname] = useState(member?.nickname ?? '');
  const [birthDate, setBirthDate] = useState(member?.birthDate ?? '');
  const [birthPlace, setBirthPlace] = useState(member?.birthPlace ?? '');
  const [deathDate, setDeathDate] = useState(member?.deathDate ?? '');
  const [photo, setPhoto] = useState(member?.photo ?? '');

  // Family
  const [fatherId, setFatherId] = useState(member?.fatherId ?? '');
  const [motherId, setMotherId] = useState(member?.motherId ?? '');

  // Profile
  const [profession, setProfession] = useState(member?.profession ?? '');
  const [education, setEducation] = useState(member?.education ?? '');
  const [religion, setReligion] = useState(member?.religion ?? '');
  const [nationality, setNationality] = useState(member?.nationality ?? '');
  const [biography, setBiography] = useState(member?.biography ?? '');

  // Hobbies
  const [hobbies, setHobbies] = useState<string[]>(member?.hobbies ?? []);
  const [hobbyInput, setHobbyInput] = useState('');

  // Gallery
  const [gallery, setGallery] = useState<string[]>(member?.gallery ?? []);
  const [galleryInput, setGalleryInput] = useState('');

  // Edit-mode marriages (persisted immediately via API)
  const [marriages, setMarriages] = useState(member?.marriages ?? []);
  // Create-mode pending marriages (saved after member is created)
  const [pendingMarriages, setPendingMarriages] = useState<PendingMarriage[]>([]);

  // Add-marriage form state (shared between modes)
  const [newSpouseId, setNewSpouseId] = useState('');
  const [newSpouseStatus, setNewSpouseStatus] = useState<MarriageStatus>('married');
  const [newMarriedDate, setNewMarriedDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [addingMarriage, setAddingMarriage] = useState(false);

  function addHobby() {
    const h = hobbyInput.trim();
    if (h && !hobbies.includes(h)) setHobbies(prev => [...prev, h]);
    setHobbyInput('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    // Only send gallery in PUT body when it was explicitly changed from the original value.
    // This avoids touching the gallery column on DBs that haven't run the migration yet.
    const galleryChanged = JSON.stringify(gallery) !== JSON.stringify(member?.gallery ?? []);

    const body = {
      ...(mode === 'create' && customId ? { id: customId } : {}),
      name, gender, photo: photo || '',
      nickname: nickname || null, birthDate: birthDate || null,
      birthPlace: birthPlace || null, deathDate: deathDate || null,
      fatherId: fatherId || null, motherId: motherId || null,
      profession: profession || null, education: education || null,
      religion: religion || null, nationality: nationality || null,
      biography: biography || null, hobbies,
      ...(mode === 'create' || galleryChanged ? { gallery } : {}),
    };

    try {
      const url = mode === 'create' ? '/api/admin/members' : `/api/admin/members/${member!.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Gagal menyimpan');

      // In create mode, save pending marriages using the new member's ID
      if (mode === 'create' && pendingMarriages.length > 0) {
        const newMemberId: string = data.id;
        await Promise.all(
          pendingMarriages.map(m =>
            fetch('/api/admin/marriages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ memberId: newMemberId, ...m }),
            }),
          ),
        );
      }

      window.location.href = '/admin/members';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMarriage() {
    if (!newSpouseId) return;

    if (mode === 'create') {
      // Queue the marriage; it will be created after the member is saved
      setPendingMarriages(prev => [...prev, {
        spouseId: newSpouseId,
        status: newSpouseStatus,
        marriedDate: newMarriedDate || null,
        endDate: newEndDate || null,
      }]);
      setNewSpouseId('');
      setNewMarriedDate('');
      setNewEndDate('');
      toast.success('Pasangan ditambahkan — akan disimpan bersama data anggota');
      return;
    }

    // Edit mode: persist to API immediately
    setAddingMarriage(true);
    try {
      const res = await fetch('/api/admin/marriages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: member!.id, spouseId: newSpouseId,
          status: newSpouseStatus,
          marriedDate: newMarriedDate || null,
          endDate: newEndDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMarriages(prev => [...prev, {
        spouseId: newSpouseId, status: newSpouseStatus,
        marriedDate: newMarriedDate || null, endDate: newEndDate || null,
      }]);
      setNewSpouseId(''); setNewMarriedDate(''); setNewEndDate('');
      toast.success('Pernikahan berhasil ditambahkan');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menambah pernikahan');
    } finally {
      setAddingMarriage(false);
    }
  }

  function handleRemoveMarriageClick(spouseId: string) {
    setPendingRemoveSpouseId(spouseId);
    setRemoveMarriageDialog(true);
  }

  async function confirmRemoveMarriage() {
    if (!member || !pendingRemoveSpouseId) return;
    setRemoveMarriageDialog(false);
    const res = await fetch('/api/admin/marriages', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: member.id, spouseId: pendingRemoveSpouseId }),
    });
    if (res.ok) {
      setMarriages(prev => prev.filter(m => m.spouseId !== pendingRemoveSpouseId));
      toast.success('Data pernikahan dihapus');
    } else {
      toast.error('Gagal menghapus data pernikahan');
    }
    setPendingRemoveSpouseId(null);
  }

  function removePendingMarriage(spouseId: string) {
    setPendingMarriages(prev => prev.filter(m => m.spouseId !== spouseId));
  }

  // Exclude already-added spouses from candidate list
  const usedSpouseIds = mode === 'edit'
    ? marriages.map(m => m.spouseId)
    : pendingMarriages.map(m => m.spouseId);

  const fatherCandidates = allMembers.filter(m => m.gender === 'male' && m.id !== member?.id);
  const motherCandidates = allMembers.filter(m => m.gender === 'female' && m.id !== member?.id);
  const spouseCandidates = allMembers.filter(m =>
    m.id !== member?.id && !usedSpouseIds.includes(m.id),
  );

  const removeSpouseName = pendingRemoveSpouseId
    ? (allMembers.find(m => m.id === pendingRemoveSpouseId)?.name ?? pendingRemoveSpouseId)
    : '';

  return (
    <>
    <ConfirmDialog
      open={removeMarriageDialog}
      title="Hapus data pernikahan?"
      message={
        <p>Yakin ingin menghapus data pernikahan dengan <strong className="text-[var(--text)]">{removeSpouseName}</strong>?</p>
      }
      confirmLabel="Ya, hapus"
      danger
      onConfirm={confirmRemoveMarriage}
      onCancel={() => { setRemoveMarriageDialog(false); setPendingRemoveSpouseId(null); }}
    />
    <form onSubmit={handleSubmit} className="space-y-6 w-full">
      {/* ── Identitas ── */}
      <Section title="Identitas">
        {mode === 'create' && (
          <Field label="ID Kustom (opsional)" hint="Kosongkan untuk auto-generate (m001, m002, …)">
            <input value={customId} onChange={e => setCustomId(e.target.value)}
              className={inputCls} style={inputStyle} placeholder="Contoh: m100" />
          </Field>
        )}
        <Field label="Nama Lengkap" required>
          <input value={name} onChange={e => setName(e.target.value)}
            className={inputCls} style={inputStyle} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jenis Kelamin" required>
            <select value={gender} onChange={e => setGender(e.target.value as 'male' | 'female')}
              className={inputCls} style={inputStyle}>
              <option value="male">Laki-laki</option>
              <option value="female">Perempuan</option>
            </select>
          </Field>
          <Field label="Nama Panggilan">
            <input value={nickname} onChange={e => setNickname(e.target.value)}
              className={inputCls} style={inputStyle} placeholder="Opsional" />
          </Field>
        </div>
        <Field label="URL Foto">
          <input value={photo} onChange={e => setPhoto(e.target.value)}
            className={inputCls} style={inputStyle} placeholder="https://… (opsional)" />
        </Field>
      </Section>

      {/* ── Lahir & Wafat ── */}
      <Section title="Tanggal & Tempat">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tanggal Lahir">
            <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
              className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Tempat Lahir">
            <input value={birthPlace} onChange={e => setBirthPlace(e.target.value)}
              className={inputCls} style={inputStyle} placeholder="Kota, Provinsi" />
          </Field>
        </div>
        <Field label="Tanggal Wafat" hint="Kosongkan jika masih hidup">
          <input type="date" value={deathDate ?? ''} onChange={e => setDeathDate(e.target.value)}
            className={inputCls} style={inputStyle} />
        </Field>
      </Section>

      {/* ── Profil ── */}
      <Section title="Profil">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Profesi Terakhir">
            <input value={profession} onChange={e => setProfession(e.target.value)}
              className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Pendidikan Terakhir">
            <input value={education} onChange={e => setEducation(e.target.value)}
              className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Agama">
            <input value={religion} onChange={e => setReligion(e.target.value)}
              className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Kewarganegaraan">
            <input value={nationality} onChange={e => setNationality(e.target.value)}
              className={inputCls} style={inputStyle} />
          </Field>
        </div>
        <Field label="Hobi">
          <div className="flex gap-2">
            <input value={hobbyInput} onChange={e => setHobbyInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addHobby(); } }}
              className={inputCls} style={inputStyle} placeholder="Tulis hobi lalu Enter" />
            <button type="button" onClick={addHobby}
              className="px-3 py-2 rounded-lg text-xs font-medium shrink-0 transition-all hover:opacity-80"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
              Tambah
            </button>
          </div>
          {hobbies.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {hobbies.map(h => (
                <span key={h}
                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                  {h}
                  <button type="button" onClick={() => setHobbies(prev => prev.filter(x => x !== h))}
                    className="ml-0.5 opacity-60 hover:opacity-100">×</button>
                </span>
              ))}
            </div>
          )}
        </Field>
        <Field label="Galeri Foto" hint="URL gambar untuk galeri anggota ini">
          <div className="flex gap-2">
            <input value={galleryInput} onChange={e => setGalleryInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const url = galleryInput.trim();
                  if (url && !gallery.includes(url)) setGallery(prev => [...prev, url]);
                  setGalleryInput('');
                }
              }}
              className={inputCls} style={inputStyle} placeholder="https://… lalu Enter" />
            <button type="button"
              onClick={() => {
                const url = galleryInput.trim();
                if (url && !gallery.includes(url)) setGallery(prev => [...prev, url]);
                setGalleryInput('');
              }}
              className="px-3 py-2 rounded-lg text-xs font-medium shrink-0 transition-all hover:opacity-80"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
              Tambah
            </button>
          </div>
          {gallery.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {gallery.map((url, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden"
                  style={{ aspectRatio: '1', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <img src={url} alt={`galeri ${i + 1}`} className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <button type="button"
                    onClick={() => setGallery(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(239,68,68,0.85)', fontSize: 10 }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </Field>
        <Field label="Biografi">
          <textarea value={biography} onChange={e => setBiography(e.target.value)}
            rows={3} className={inputCls} style={inputStyle}
            placeholder="Cerita singkat tentang anggota ini…" />
        </Field>
      </Section>

      {/* ── Relasi Keluarga ── */}
      <Section title="Relasi Keluarga">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ayah">
            <SearchableSelect
              value={fatherId}
              onChange={setFatherId}
              options={fatherCandidates.map(m => ({ value: m.id, label: `${m.name} (${m.id})` }))}
            />
          </Field>
          <Field label="Ibu">
            <SearchableSelect
              value={motherId}
              onChange={setMotherId}
              options={motherCandidates.map(m => ({ value: m.id, label: `${m.name} (${m.id})` }))}
            />
          </Field>
        </div>
      </Section>

      {/* ── Riwayat Pernikahan ── */}
      <Section title="Riwayat Pernikahan">
        {mode === 'create' && (
          <p className="text-[11px] text-[var(--text-subtle)] -mt-1 mb-2">
            Pasangan yang ditambahkan di sini akan disimpan otomatis setelah anggota dibuat.
          </p>
        )}

        {/* Edit mode: persisted marriages */}
        {mode === 'edit' && marriages.length > 0 && (
          <div className="space-y-2 mb-3">
            {marriages.map(mar => {
              const spouse = allMembers.find(m => m.id === mar.spouseId);
              return (
                <div key={mar.spouseId}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div>
                    <p className="text-sm font-medium text-[var(--text)]">
                      {spouse?.name ?? mar.spouseId}
                    </p>
                    <p className="text-xs text-[var(--text-subtle)]">
                      {MARRIAGE_STATUS_OPTIONS.find(s => s.value === mar.status)?.label ?? mar.status}
                      {mar.marriedDate ? ` · ${mar.marriedDate}` : ''}
                    </p>
                  </div>
                  <button type="button" onClick={() => handleRemoveMarriageClick(mar.spouseId)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:opacity-80">
                    Hapus
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Create mode: pending (queued) marriages */}
        {mode === 'create' && pendingMarriages.length > 0 && (
          <div className="space-y-2 mb-3">
            {pendingMarriages.map(mar => {
              const spouse = allMembers.find(m => m.id === mar.spouseId);
              return (
                <div key={mar.spouseId}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div>
                    <p className="text-sm font-medium text-[var(--text)]">
                      {spouse?.name ?? mar.spouseId}
                    </p>
                    <p className="text-xs text-[var(--text-subtle)]">
                      {MARRIAGE_STATUS_OPTIONS.find(s => s.value === mar.status)?.label ?? mar.status}
                      {mar.marriedDate ? ` · ${mar.marriedDate}` : ''}
                      <span className="ml-2 text-amber-400">(belum disimpan)</span>
                    </p>
                  </div>
                  <button type="button" onClick={() => removePendingMarriage(mar.spouseId)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:opacity-80">
                    Batal
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add new marriage form */}
        <div className="p-3 rounded-lg space-y-2"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">
            {mode === 'create' ? 'Tambah Pasangan' : 'Tambah Pernikahan'}
          </p>
          <SearchableSelect
            value={newSpouseId}
            onChange={setNewSpouseId}
            options={spouseCandidates.map(m => ({ value: m.id, label: `${m.name} (${m.id})` }))}
            placeholder="Pilih pasangan…"
            emptyLabel="— Pilih pasangan —"
          />
          <select value={newSpouseStatus} onChange={e => setNewSpouseStatus(e.target.value as MarriageStatus)}
            className={inputCls} style={inputStyle}>
            {MARRIAGE_STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-[var(--text-subtle)] mb-1">Tanggal Menikah</p>
              <input type="date" value={newMarriedDate} onChange={e => setNewMarriedDate(e.target.value)}
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-subtle)] mb-1">Tanggal Berakhir</p>
              <input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)}
                className={inputCls} style={inputStyle} />
            </div>
          </div>
          <button type="button" onClick={handleAddMarriage} disabled={!newSpouseId || addingMarriage}
            className="w-full py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-40"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
            {addingMarriage ? 'Menyimpan…' : mode === 'create' ? '+ Tambah Pasangan' : '+ Tambah Pernikahan'}
          </button>
        </div>
      </Section>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--blue))' }}
        >
          {saving ? 'Menyimpan…' : mode === 'create' ? 'Tambah Anggota' : 'Simpan Perubahan'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/members')}
          className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          Batal
        </button>
      </div>
    </form>
    </>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl p-5 space-y-3"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--text-subtle)] mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-[var(--text-subtle)] mt-1">{hint}</p>}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none transition-all';
const inputStyle = {
  background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)',
};
