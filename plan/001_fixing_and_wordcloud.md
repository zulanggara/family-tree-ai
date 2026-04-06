# AI Family Tree – Development & Improvement Plan

## Tujuan
Meningkatkan keamanan, kontrol akses, dan fitur analitik pada aplikasi AI Family Tree.

---

## 1. Fix Logout Behavior (UI & Security)

### Problem
Setelah logout, menu bar masih tampil. Seharusnya halaman hanya menampilkan form login.

### Expected Behavior
- Session/token terhapus saat logout
- Redirect ke halaman login
- Tidak ada navbar / sidebar
- Hanya tampil form login

### Implementation
- Backend:
  - Pastikan endpoint logout menghapus session/token
- Frontend:
  - Gunakan route guard / middleware untuk cek auth
  - Pisahkan layout:
    - AuthLayout → hanya login/register
    - MainLayout → dashboard + navbar

### Acceptance Criteria
- Tidak ada UI selain login setelah logout
- Tidak bisa akses halaman lain tanpa login

---

## 2. WordCloud Statistik Nama

### Tujuan
Menampilkan visualisasi kata yang paling sering muncul pada nama di family tree.

### Lokasi
Admin → Statistik → WordCloud Nama

### Data Processing
1. Ambil semua data nama dari database
2. Split nama menjadi kata
   Contoh:
   "Ahmad Fauzi" → ["Ahmad", "Fauzi"]
3. Normalisasi:
   - lowercase
   - trim spasi
4. Hitung frekuensi tiap kata

### Output Format
[
  { "text": "ahmad", "value": 10 },
  { "text": "fauzi", "value": 5 }
]

### Implementation
- Backend:
  - Endpoint untuk generate word frequency
- Frontend:
  - Gunakan library wordcloud

### Enhancement
- Filter berdasarkan generasi
- Filter berdasarkan cabang keluarga
- Stop words (contoh: bin, binti, dll)

### Acceptance Criteria
- WordCloud tampil dengan benar
- Data frekuensi akurat
- Tidak ada kata noise

---

## 3. Role-Based Access: family_admin

### Problem
family_admin masih bisa mengakses data di luar scope.

### Rule
family_admin hanya bisa:
- Mengelola dirinya sendiri
- Mengelola semua keturunannya (descendants)

family_admin tidak bisa:
- Mengakses parent (ancestor)
- Mengakses cabang lain

### Contoh Struktur
M005
 ├── M010
 │    └── M020
 └── M011

Hak akses:
- Bisa: M005, M010, M020, M011
- Tidak bisa: parent dari M005

---

### Implementation

#### Struktur Data
Setiap record memiliki:
- id
- parent_id

#### Query Descendants (SQL)
WITH RECURSIVE descendants AS (
    SELECT id, parent_id
    FROM family
    WHERE id = :current_user_id

    UNION ALL

    SELECT f.id, f.parent_id
    FROM family f
    INNER JOIN descendants d ON f.parent_id = d.id
)
SELECT * FROM descendants;

#### Authorization Logic (Pseudo Code)
if (!in_array(target_user_id, getDescendants(current_user_id))) {
    throw UnauthorizedAccess;
}

---

### Endpoint Protection
Wajib menggunakan validasi:
- Update member
- Delete member
- Create child
- View detail

---

### Enhancement
- Cache descendants (Redis)
- Gunakan materialized path untuk performa

---

## Testing Checklist

### Auth
- [ ] Logout menghapus session
- [ ] Redirect ke login
- [ ] Navbar tidak tampil

### WordCloud
- [ ] Data tampil
- [ ] Frekuensi benar
- [ ] Tidak ada noise

### Role family_admin
- [ ] Tidak bisa akses parent
- [ ] Bisa akses descendants
- [ ] Endpoint terlindungi

---

## Notes Teknis
- Gunakan index pada parent_id
- Pertimbangkan pagination untuk tree besar
- Logging untuk audit perubahan data