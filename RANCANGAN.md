# Rancangan SMART TT

## Tentang

SMART TT adalah sistem pemantauan imunisasi Tetanus Toxoid (TT) ibu hamil untuk UPTD Puskesmas Kabukarudi, Sumba Barat, NTT. Berjalan sepenuhnya di sisi klien (SPA) dengan arsitektur offline-first.

## Stack

| Lapisan | Teknologi |
|---------|-----------|
| UI | React 19 + TypeScript |
| Bundler | Vite 6 |
| Styling | Tailwind CSS 4 |
| Icons | lucide-react |
| Chart | Recharts |
| PDF | jsPDF |
| Animasi | Motion (Framer Motion) |
| Database | Supabase (PostgreSQL) + localStorage |
| Hosting | Static (Vercel/Netlify/manual) |

## Arsitektur

```
Browser ─→ localStorage (sumber kebenaran lokal)
              │
              ▼ (async, jika online)
           Supabase (remote sync)
```

- **Offline-first**: semua data baca/tulis melalui localStorage. Supabase hanya target sinkronasi async saat online.
- **Single Page Application**: tanpa router — navigasi via state tab `useState`.
- **Login**: hash SHA-256 via Web Crypto API, session disimpan di localStorage. Wajib online untuk login pertama (verifikasi akun dari Supabase), selanjutnya bisa offline.
- **Role**: `Puskesmas` (lihat semua data, kelola akun) dan `Desa` (terbatas pada desa masing-masing).

## Alur Data

1. **LOAD** → coba Supabase → fallback localStorage jika offline/gagal
2. **SAVE** → localStorage langsung → Supabase async jika online
3. **SYNC** → trigger saat event `online`, push semua data localStorage → Supabase

## Struktur File

```
src/
├── App.tsx          # Seluruh UI (3760+ baris, monolithic)
├── main.tsx         # Entry point React
├── index.css        # Tailwind + font Inter
└── lib/
    ├── db.ts        # Offline-first data layer (CRUD, auth, sync)
    └── supabase.ts  # Supabase client
```

## Halaman (Tab)

| Tab | Fungsi | Akses |
|-----|--------|-------|
| Beranda | Dashboard statistik | Semua |
| Input Data TT | Registrasi & riwayat pasien | Semua |
| Lacak Drop Out | Early warning dropout | Semua |
| Jadwal Pengingat | Edukasi interval dosis | Semua |
| Pusat Integrasi | Template kode Supabase/WA/GAS | Semua |
| Kelola Akun | CRUD akun bidan desa | Puskesmas |

## Landing Page (Microsite)

Sebelum login, ditampilkan microsite dengan tiga tombol:
1. **Masuk ke Aplikasi** — menuju halaman login
2. **Pengenalan TT** — info jadwal, manfaat, dan dampak imunisasi
3. **Daftar Akun Per Desa** — daftar 12 akun terdaftar
