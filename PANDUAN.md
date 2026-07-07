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
- **Import Excel** — upload file `.xlsx`, mapping otomatis kolom (NIK, nama, desa, HPHT, TT1–TT5, GPA, dll.)
- **Cek NIK duplikat** — saat daftar manual/import, jika NIK sudah ada data di-update
- **Auto-fill form** — ketika input NIK 16 digit, sistem cari data yang cocok (1,5 detik jeda)
- Edit data imunisasi
- Kirim pengingat WhatsApp
- Export Laporan PDF

### Lacak Drop Out
- Daftar pasien yang terlewat jadwal (drop out)
- Pasien yang mendekati jadwal berikutnya
- **Tindak Lanjut** — pilih opsi:
  - **📱 Hubungi Via Whatsapp** — tandai dan langsung buka modal kirim WA
  - **💉 Pengulangan Dosis** — tandai dan hapus semua data TT pasien (reset)

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

1. Cari pasien di tab **Input Data TT** atau **Lacak**
2. Klik tombol **WhatsApp / Kirim Pengingat WA** pada kartu pasien
3. Atau pilih **📱 Hubungi Via Whatsapp** dari dropdown Tindak Lanjut (otomatis buka modal)
4. Edit pesan jika perlu
5. Klik **Kirim via WhatsApp**

> Fitur WA memerlukan token API Fonnte atau Google Apps Script. Lihat **Pusat Integrasi** untuk panduan setup.

## 6. Export Laporan PDF

- Klik **EXPORT LAPORAN PDF** di header (halaman Beranda / Input Data)
- Halaman 1: tabel monitoring semua pasien
- Per pasien: kartu riwayat imunisasi lengkap dengan identitas, GPA, HPHT, dosis TT, rekomendasi medis

## 7. Logout

Klik **Logout System** di sidebar (desktop) atau ikon logout di pojok kanan atas (mobile).

## 8. Reload & Persistensi Tab

- Tab aktif (Beranda / Input / Lacak / Edukasi / Akun) disimpan di localStorage
- Refresh halaman tidak mengubah tab — tetap di halaman yang sama

## 9. Mode Offline

Aplikasi tetap bisa digunakan tanpa internet setelah pernah login. Data disimpan di localStorage dan akan di-sinkronasi otomatis saat koneksi kembali.
