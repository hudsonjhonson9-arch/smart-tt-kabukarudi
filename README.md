# SMART TT — Pemantauan Imunisasi Tetanus Toxoid Ibu Hamil

Sistem pemantauan imunisasi TT ibu hamil untuk **UPTD Puskesmas Kabukarudi, Sumba Barat, NTT**. Berjalan sepenuhnya di sisi klien dengan arsitektur offline-first.

## Stack

React 19 · TypeScript · Vite 6 · Tailwind CSS 4 · Supabase · localStorage

## Cara Pakai

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # build produksi ke dist/
```

## Variabel Lingkungan

Buat `.env` atau `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Tanpa Supabase, aplikasi tetap berjalan dengan **12 akun default** dan data di **localStorage**.

## Struktur

| File | Isi |
|------|-----|
| `src/App.tsx` | Seluruh UI (monolithic) |
| `src/lib/db.ts` | Offline-first data + auth + sync |
| `src/lib/supabase.ts` | Supabase client |
| `RANCANGAN.md` | Dokumentasi rancangan |
| `PANDUAN.md` | Panduan penggunaan |

## Supabase CORS

Jika di-deploy ke domain kustom, tambahkan domain ke:
**Supabase Dashboard → Authentication → Settings → Allowed Sites**
