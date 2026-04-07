# The Living Archive — Family Tree

A beautiful, interactive family tree web application built with Next.js 14, TypeScript, Tailwind CSS, and PostgreSQL.

---

## Features

### Public
- **Interactive Family Tree** — Visual SVG tree with connector lines
- **Smart Search** — Search by name with Descendants or Ancestors mode
- **Visual Highlighting** — Green for descendants, blue for ancestors
- **Spouse Support** — Multiple spouses with dashed connectors
- **Responsive** — Mobile-optimized with horizontal scroll
- **Detail Modal** — Full profile: biografi, relasi keluarga, hobi, profesi, dll
- **Dark / Light Mode** — Toggle tema gelap/terang
- **Mini Map** — Preview navigasi pohon keluarga
- **Birthday Panel** — Daftar anggota yang ulang tahun dalam waktu dekat
- **Stats Panel** — Statistik ringkas di halaman publik
- **Timeline View** — Tampilan timeline berdasarkan tahun

### Admin Panel (`/admin`)
- **Login dengan Username & Password** — Autentikasi aman, session cookie HMAC-signed
- **Dua Peran (Role)**:
  - **Super Admin** — Akses penuh: kelola semua anggota, manajemen akun admin, tambah root family
  - **Family Admin** — Akses terbatas ke satu subtree keluarga berdasarkan root family yang ditentukan
- **Dark / Light Mode** di sidebar admin
- **Manajemen Anggota** — Tambah, edit, hapus dengan konfirmasi cascade
- **Cascade Delete Warning** — Saat menghapus anggota, sistem memeriksa keturunan dan menampilkan peringatan + daftar anggota yang akan ikut terhapus (modal kustom, bukan `alert` browser)
- **Custom Dialog & Toast** — Semua notifikasi dan konfirmasi menggunakan komponen kustom
- **Manajemen Admin** _(Super Admin only)_ — Tambah/hapus akun admin, atur role dan root family
- **Statistik dengan Grafik** — Halaman statistik dengan recharts:
  - Kelahiran & kematian per tahun
  - Distribusi jenis kelamin (Pie chart)
  - Distribusi jumlah anak
  - Distribusi pendidikan
  - Distribusi profesi (Top 10)
  - Distribusi usia wafat
  - Distribusi generasi
- **Backup & Export Data** — Ekspor ke 5 format:
  - JSON (format asli aplikasi, cocok untuk restore)
  - CSV (kompatibel Excel/Sheets)
  - Excel (.xlsx) — sheet Members + Marriages
  - PostgreSQL SQL script
  - MySQL SQL script
- **Import Data** — Import dari JSON, CSV, atau Excel (.xlsx)
- **Password Terenkripsi** — Semua password admin di-hash dengan bcrypt (cost 12)
- **Audit Logs** _(Super Admin only)_ — Riwayat lengkap semua perubahan data: tambah/ubah/hapus anggota, pernikahan, akun admin, dan login/logout. Dilengkapi filter (aksi, tipe data, username) dan pagination yang efisien untuk 1 juta+ entri

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL |
| DB Client | `postgres` (node-postgres) |
| Auth | Session cookie + HMAC-SHA256 (Web Crypto) |
| Password | bcryptjs |
| Charts | Recharts |
| Excel | xlsx |
| Fonts | Playfair Display + DM Sans |
| Deploy | Vercel / self-hosted |

---

## Persyaratan Sistem

- Node.js 18+
- PostgreSQL 14+
- npm atau yarn

---

## Instalasi & Setup Lokal

### 1. Clone & install dependencies

```bash
git clone <repo-url>
cd family-tree
npm install
```

### 2. Konfigurasi environment

Salin file sample:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://postgres:password@localhost:5432/family_tree"

# Admin panel password session secret (ganti dengan string acak yang aman)
SESSION_SECRET="ganti-dengan-string-acak-panjang"

# Data source: "local" = dari file JSON | "api" = dari PostgreSQL
NEXT_PUBLIC_DATA_SOURCE="api"

# Aktifkan fitur Audit Logs (hanya tampil untuk super_admin)
# "true" = aktif | nilai lain / tidak diset = nonaktif
NEXT_PUBLIC_AUDIT_LOGS_ENABLED="true"
```

> ⚠️ **Jangan commit `.env.local`** — sudah ada di `.gitignore`

### 3. Setup database

Script ini akan:
- Membuat database jika belum ada
- Membuat tabel `family_members`, `marriages`, dan `admin_users`
- Seed data dari `data/family.json`
- Membuat akun **super admin** default: `admin` / `admin123`

```bash
npm run db:setup
```

> ⚠️ **Segera ganti password admin setelah pertama login!**

### 4. Jalankan development server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

Panel admin: [http://localhost:3000/admin](http://localhost:3000/admin)

---

## Scripts

| Perintah | Keterangan |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run db:setup` | Setup DB + seed data + buat admin default |
| `npm run db:seed` | Hanya seed data dari family.json |
| `npm run db:migrate` | Migrasi DB yang sudah ada (tambah tabel audit_logs + kolom gallery) |

---

## Deploy ke Vercel

### Langkah

1. Push kode ke GitHub
2. Import project di [vercel.com](https://vercel.com)
3. Tambahkan environment variables di dashboard Vercel:
   - `DATABASE_URL` — connection string PostgreSQL (Supabase, Neon, Railway, dll)
   - `SESSION_SECRET` — string acak panjang (min 32 karakter)
   - `NEXT_PUBLIC_DATA_SOURCE` = `api`
   - `NEXT_PUBLIC_AUDIT_LOGS_ENABLED` = `true` _(opsional, default: nonaktif)_
4. Deploy

### Rekomendasi PostgreSQL hosting

| Provider | Notes |
|---|---|
| [Supabase](https://supabase.com) | Free tier, connection pooling |
| [Neon](https://neon.tech) | Serverless PostgreSQL, free tier |
| [Railway](https://railway.app) | Mudah dipakai |
| [Render](https://render.com) | Free tier tersedia |

### Jalankan setup DB di remote

Setelah deploy, jalankan setup dari lokal dengan DATABASE_URL yang mengarah ke database produksi:

```bash
DATABASE_URL="postgresql://..." npm run db:setup
```

---

## Deploy Self-Hosted (VPS/Server)

### Persyaratan

- Server Linux (Ubuntu 22.04+ direkomendasikan)
- Node.js 18+
- PostgreSQL 14+
- Nginx (opsional, untuk reverse proxy)
- PM2 (opsional, untuk process management)

### Langkah

```bash
# 1. Clone & install
git clone <repo-url>
cd family-tree
npm install

# 2. Setup environment
cp .env.example .env.local
nano .env.local   # isi DATABASE_URL, SESSION_SECRET, dll

# 3. Setup database
npm run db:setup

# 4. Build
npm run build

# 5. Jalankan dengan PM2
npm install -g pm2
pm2 start npm --name "family-tree" -- start
pm2 save
pm2 startup
```

### Nginx reverse proxy (opsional)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Struktur Proyek

```
family-tree/
├── data/
│   └── family.json              # Data keluarga (source of truth untuk local mode)
├── scripts/
│   ├── setup-db.ts              # Setup schema + seed + buat admin default
│   └── seed.ts                  # Hanya seed data
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── layout.tsx       # Admin layout (server, reads session)
│   │   │   ├── page.tsx         # Dashboard
│   │   │   ├── admins/          # Manajemen admin (super_admin only)
│   │   │   ├── backup/          # Backup & import data
│   │   │   ├── login/           # Login page
│   │   │   ├── members/         # CRUD anggota
│   │   │   └── stats/           # Statistik dengan charts
│   │   ├── api/
│   │   │   └── admin/
│   │   │       ├── admins/      # API manajemen admin user
│   │   │       ├── auth/        # Login/logout API
│   │   │       ├── backup/      # Export API
│   │   │       ├── import/      # Import API
│   │   │       ├── marriages/   # CRUD pernikahan
│   │   │       └── members/     # CRUD anggota + descendants
│   │   ├── globals.css          # Design system, CSS variables, dark/light
│   │   ├── layout.tsx           # Root layout
│   │   └── page.tsx             # Halaman publik
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminNav.tsx     # Sidebar navigasi admin (client)
│   │   │   ├── AdminsTable.tsx  # Tabel manajemen admin
│   │   │   ├── ConfirmDialog.tsx # Custom confirm modal
│   │   │   ├── MemberForm.tsx   # Form tambah/edit anggota
│   │   │   ├── MembersTable.tsx # Tabel anggota dengan delete cascade warning
│   │   │   ├── StatsCharts.tsx  # Komponen recharts untuk statistik
│   │   │   └── Toast.tsx        # Toast notification system
│   │   ├── FamilyTree.tsx
│   │   ├── TreeNode.tsx
│   │   ├── DetailModal.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useDarkMode.ts
│   │   └── useFamilyData.ts
│   ├── lib/
│   │   ├── db/
│   │   │   ├── familyRepository.ts  # CRUD anggota + cascade delete + descendants
│   │   │   └── adminRepository.ts   # CRUD admin user + bcrypt
│   │   └── session.ts               # HMAC session token (Web Crypto, Edge-compatible)
│   ├── middleware.ts                 # Auth + role-based access control
│   └── types/
│       └── index.ts
├── .env.example                 # Template environment variables
├── .env.local                   # Credentials lokal (JANGAN dicommit!)
└── package.json
```

---

## Akun Admin Default

Setelah `npm run db:setup`:

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `admin123` |
| Role | Super Admin |

> ⚠️ **Segera ganti password ini setelah pertama kali login!**

---

## Format Data JSON

Untuk import atau referensi, format JSON anggota:

```json
{
  "id": "m001",
  "name": "Nama Lengkap",
  "photo": "",
  "gender": "male",
  "birthDate": "1985-03-15",
  "deathDate": null,
  "birthPlace": "Jakarta",
  "fatherId": "m000",
  "motherId": null,
  "spouseIds": ["m002"],
  "childrenIds": ["m003", "m004"],
  "marriages": [
    {
      "spouseId": "m002",
      "status": "married",
      "marriedDate": "2010-06-20",
      "endDate": null
    }
  ],
  "nickname": "Budi",
  "profession": "Dokter",
  "education": "S2 Kedokteran",
  "religion": "Islam",
  "nationality": "Indonesia",
  "biography": "Cerita singkat...",
  "hobbies": ["Membaca", "Memasak"],
  "socialLinks": [
    { "label": "Instagram", "url": "https://instagram.com/..." }
  ]
}
```

Status pernikahan yang valid: `married` | `widowed` | `divorced` | `separated` | `annulled`

---

## AI Development

Proyek ini dikembangkan dengan bantuan **[Claude Code](https://claude.ai/code)** — CLI resmi dari Anthropic.

| | |
|---|---|
| Model | Claude Sonnet 4.6 (`claude-sonnet-4-6`) |
| Tool | Claude Code (Anthropic CLI) |
| Scope | Arsitektur, implementasi fitur, debugging, refactoring |

> Untuk melihat total token yang digunakan, buka [console.anthropic.com](https://console.anthropic.com) → **Usage**.

---

## Lisensi

MIT
