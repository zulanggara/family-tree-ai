# 🌳 Frontend Enhancement Plan — Accessibility, Gallery & Word Cloud

## 🎯 Tujuan

Menambahkan fitur lanjutan pada website family tree yang sudah ada, dengan fokus pada:

* Aksesibilitas (khususnya untuk user lansia)
* Galeri foto per anggota keluarga
* Visualisasi Word Cloud yang menarik dan interaktif

---

## ♿ Accessibility Customization (WAJIB)

Tambahkan panel pengaturan yang bisa diakses user (modal / sidebar).

### 🎛️ Pengaturan yang harus tersedia:

#### 1. Font Size

* Small
* Medium
* Large
* Extra Large
  ➡ Semua teks di aplikasi harus mengikuti setting ini

---

#### 2. Font Weight

* Normal
* Bold
  ➡ Untuk meningkatkan keterbacaan

---

#### 3. Color Contrast Mode

* Normal
* High Contrast
  ➡ Mode high contrast:
* Background gelap
* Text terang
* Hindari warna abu-abu

---

#### 4. Image Visibility

* Show images
* Hide images
  ➡ Jika hide:
* Avatar tidak ditampilkan
* Fokus ke teks

---

#### 5. Node Size (PENTING)

* Small
* Medium
* Large
  ➡ Node family tree membesar agar mudah diklik

---

#### 6. Line Thickness (Connector Tree)

* Thin
* Medium
* Thick
  ➡ Garis antar node lebih jelas terlihat

---

#### 7. Animation Toggle

* Enable
* Disable
  ➡ Default: enable
  ➡ Disable untuk user sensitif / device lambat

---

### 🧠 Behavior

* Semua setting disimpan di `localStorage`
* Auto load saat aplikasi dibuka
* Perubahan langsung realtime tanpa reload

---

## 🖼️ Gallery per Member

Tambahkan fitur galeri pada setiap anggota keluarga.

### 📦 Struktur Data (tambahan JSON)

```json
{
  "gallery": [
    "https://link-image-1.jpg",
    "https://link-image-2.jpg"
  ]
}
```

---

### 🧩 UI Behavior

#### 1. Akses

* Dari detail member → tombol "Lihat Galeri"

---

#### 2. Tampilan

* Grid layout (2–4 kolom)
* Responsive

---

#### 3. Interaksi

* Klik gambar → buka preview (lightbox)
* Mobile:

  * Swipe antar gambar
* Desktop:

  * Klik next/prev

---

#### 4. UX Improvement

* Lazy load image
* Skeleton loading saat load
* Fallback jika gambar gagal

---

## ☁️ Word Cloud (WAJIB MENARIK & INTERAKTIF)

### 🎯 Tujuan

* Menampilkan statistik nama keluarga secara visual
* Memberikan insight unik dari data

---

### 🧠 Data Processing

* Ambil semua nama dari data
* Split menjadi kata:

  * "Budi Santoso" → ["Budi", "Santoso"]
* Normalisasi:

  * Lowercase
  * Trim
* Hitung frekuensi kemunculan kata

---

### 🎨 Visual Requirements

#### 1. Ukuran Kata

* Semakin sering muncul → semakin besar
* Gunakan scaling dinamis (min → max size)

---

#### 2. Warna

* Gunakan variasi warna (tidak monoton)
* Tetap kontras dengan background
* Support mode:

  * Normal
  * High contrast (mengikuti accessibility setting)

---

#### 3. Layout

* Tidak berantakan (hindari overlap)
* Gunakan library word cloud atau algoritma positioning
* Responsive

---

#### 4. Animasi

* Fade-in saat load
* Hover effect (scale sedikit membesar)

---

### 🖱️ Interaksi (WAJIB ADA)

#### 1. Hover

* Highlight kata
* Tampilkan jumlah kemunculan

---

#### 2. Click

Saat kata diklik:

* Highlight semua member yang mengandung kata tersebut
* Auto focus ke tree (scroll ke node relevan)

---

#### 3. Filter Mode (Optional tapi disarankan)

* Nama depan saja
* Nama belakang saja
* Semua kata

---

### 🔥 UX Enhancement (BIAR “HIDUP”)

* Tambahkan tooltip:

  * "Nama ini muncul X kali"
* Animasi ringan saat klik
* Transisi smooth antar state

---

### ⚡ Performance

* Precompute word frequency saat load awal
* Simpan hasil di state
* Hindari recompute berulang

---

## 🧠 Catatan Penting

* Semua fitur harus tetap ringan dan tidak mengganggu performa tree
* Accessibility setting harus mempengaruhi:

  * Tree
  * Modal
  * Word Cloud

---

## ✅ Expected Outcome

User bisa:

* Mengatur tampilan sesuai kebutuhan (terutama orang tua)
* Melihat galeri foto tiap anggota keluarga
* Melihat Word Cloud yang:

  * Informatif
  * Interaktif
  * Menarik secara visual

---


Untuk Word Claude hanya pada statistik di akses admin