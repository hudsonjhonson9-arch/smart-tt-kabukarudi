# Panduan Penggunaan SMART TT

## 1. Landing Page

Saat pertama kali membuka aplikasi, tampil microsite dengan tiga pilihan:

- **Masuk ke Aplikasi** — menuju halaman login
- **Pengenalan TT** — informasi jadwal dan manfaat imunisasi TT
- **Daftar Akun Per Desa** — lihat daftar akun petugas

## 2. Login

1. Klik **Masuk ke Aplikasi**
2. Masukkan username dan password
3. Klik **Masuk Sekarang**

### Akun Default

| Username | Password | Role |
|----------|----------|------|
| `puskesmas` | `adminpuskesmas` | Admin (lihat semua) |
| `bidan_kabukarudi` | `desa123` | Bidan Desa Kabukarudi |
| `bidan_sodana` | `desa123` | Bidan Pustu Sodana |
| (9 bidan desa lainnya) | `desa123` | — |

> Username lengkap bisa dilihat di tombol **Daftar Akun Per Desa** di landing page.

## 3. Navigasi

Setelah login, sidebar kiri (desktop) atau bottom bar (mobile) menampilkan menu:

### Dasbor Utama
- Statistik cakupan imunisasi
- Grafik per desa
- Ringkasan data

### Input Data TT
- Cari pasien berdasarkan NIK atau nama
- Tambah pasien baru (klik **+**)
- Edit data imunisasi
- Kirim pengingat WhatsApp
- Export PDF laporan

### Lacak Drop Out
- Daftar pasien yang terlewat jadwal (drop out)
- Pasien yang mendekati jadwal berikutnya

### Jadwal Pengingat (Edukasi)
- Info interval dosis TT1–TT5
- Materi edukasi untuk ibu hamil

### Kelola Akun (Puskesmas saja)
- Tambah/edit/hapus akun bidan desa
- Atur username, password, desa

## 4. Registrasi Pasien Baru

1. Buka tab **Input Data TT**
2. Klik **+ Register Ibu Hamil Baru**
3. Isi NIK, nama, desa, nomor HP, HPHT
4. Pilih dosis TT yang sudah diberikan
5. Klik **Simpan**

## 5. Mengirim Pengingat WhatsApp

1. Cari pasien di tab **Input Data TT**
2. Klik ikon **Send** pada kartu pasien
3. Edit pesan jika perlu
4. Klik **Kirim via WhatsApp**

> Fitur WA memerlukan token API Fonnte atau Google Apps Script. Lihat **Pusat Integrasi** untuk panduan setup.

## 6. Export PDF

- Klik **Export PDF** di header (halaman Beranda / Input Data)
- File akan otomatis terunduh

## 7. Logout

Klik **Logout System** di sidebar (desktop) atau ikon logout di pojok kanan atas (mobile).

## 8. Mode Offline

Aplikasi tetap bisa digunakan tanpa internet setelah pernah login. Data disimpan di localStorage dan akan di-sinkronasi otomatis saat koneksi kembali.
