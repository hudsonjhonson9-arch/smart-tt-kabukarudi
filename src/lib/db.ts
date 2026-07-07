/**
 * db.ts — Offline-first data layer untuk SMART TT
 *
 * Arsitektur:
 *   localStorage  = sumber kebenaran lokal (selalu ditulis duluan, bekerja offline)
 *   Supabase      = remote sync (dicoba jika online, diabaikan jika tidak)
 *
 * Alur:
 *   LOAD  → coba Supabase dulu → fallback ke localStorage jika gagal/offline
 *   SAVE  → localStorage dulu (langsung) → Supabase async jika online
 *   SYNC  → dipanggil saat event 'online', push localStorage → Supabase
 *
 * Login:
 *   - Wajib online pertama kali (verify ke Supabase)
 *   - Session disimpan di localStorage → tetap bisa akses offline setelah pernah login
 *   - Password di-hash SHA-256 (Web Crypto API, built-in browser)
 *   - Backward-compat: jika password di DB masih plain-text, auto-upgrade ke hash
 */

import { supabase } from './supabase';

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface Patient {
  no: number;
  tanggalRegistrasi: string;
  nikIbu: string;
  namaLengkapIbu: string;
  desa: string;
  nomorHp: string;
  hpht: string;
  tt1: boolean; tanggalTt1: string;
  tt2: boolean; tanggalTt2: string;
  tt3: boolean; tanggalTt3: string;
  tt4: boolean; tanggalTt4: string;
  tt5: boolean; tanggalTt5: string;
  keterangan: string;
  gravida?: number;
  paritas?: number;
  abortus?: number;
  jarakKelahiran?: string;
}

export interface Account {
  username: string;
  password?: string;
  role: 'Puskesmas' | 'Desa';
  desa: string;
  namaLengkap: string;
}

export interface WhatsappLog {
  id: string;
  nikIbu: string;
  namaLengkapIbu: string;
  nomorHp: string;
  desa: string;
  pesan: string;
  tanggalKirim: string;
  status: string;
}

// ─── LOCALSTORAGE KEYS ────────────────────────────────────────────────────────

const LS = {
  PATIENTS:     'smart_tt_patients',
  ACCOUNTS:     'smart_tt_accounts',
  WA_LOGS:      'smart_tt_wa_logs',
  PENDING_SYNC: 'smart_tt_pending_sync',
  SESSION:      'smart_tt_session',
} as const;

// ─── SHA-256 VIA WEB CRYPTO API ───────────────────────────────────────────────

/**
 * Hash password dengan SHA-256 menggunakan Web Crypto API (built-in browser).
 * Tidak perlu library eksternal.
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Cek apakah string sudah berupa SHA-256 hash (64 hex chars) */
function isHashed(str: string): boolean {
  return /^[0-9a-f]{64}$/.test(str);
}

// ─── SESSION MANAGEMENT (localStorage, offline-capable) ───────────────────────

/**
 * Ambil session dari localStorage. Tetap tersedia offline setelah pernah login.
 */
export function getSession(): Account | null {
  try {
    const raw = localStorage.getItem(LS.SESSION);
    return raw ? (JSON.parse(raw) as Account) : null;
  } catch {
    return null;
  }
}

/**
 * Simpan atau hapus session.
 * Pass null untuk logout (hapus session).
 */
export function setSession(account: Account | null): void {
  if (account) {
    // Jangan simpan password di session
    const { password: _pw, ...safe } = account;
    localStorage.setItem(LS.SESSION, JSON.stringify(safe));
  } else {
    localStorage.removeItem(LS.SESSION);
  }
}

// ─── LOGIN & AUTH ─────────────────────────────────────────────────────────────

/**
 * Verifikasi login ke Supabase (harus online untuk pertama kali).
 * Jika offline dan ada cache akun, verifikasi dari cache.
 *
 * Mendukung:
 *   1. Password sudah di-hash SHA-256
 *   2. Password masih plain-text (backward-compat) → auto-upgrade ke hash di Supabase
 *
 * Returns: Account (tanpa password) jika berhasil, null jika gagal.
 */
export async function verifyLogin(
  username: string,
  password: string
): Promise<{ account: Account | null; error?: string }> {
  const hashedPw = await hashPassword(password);

  if (navigator.onLine) {
    try {
      // Coba SHA-256 hash dulu
      const { data: byHash } = await supabase
        .from('accounts')
        .select('*')
        .eq('username', username)
        .eq('password', hashedPw)
        .maybeSingle();

      if (byHash) {
        const account = dbToAccount(byHash);
        // Refresh cache akun
        _refreshAccountCache();
        return { account };
      }

      // Backward-compat: coba plain-text password
      const { data: byPlain } = await supabase
        .from('accounts')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .maybeSingle();

      if (byPlain) {
        // Auto-upgrade password ke SHA-256 hash di Supabase
        await supabase
          .from('accounts')
          .update({ password: hashedPw })
          .eq('username', username);

        // Update di cache lokal juga
        const cached = getCachedAccounts();
        const upgraded = cached.map(a =>
          a.username === username ? { ...a, password: hashedPw } : a
        );
        if (upgraded.length > 0) cacheAccounts(upgraded);

        const account = dbToAccount(byPlain);
        return { account };
      }

      // Tidak ditemukan di Supabase
      return { account: null, error: 'Username atau password salah' };
    } catch (err) {
      console.warn('[db] verifyLogin: Supabase error, fallback ke cache.', err);
      // Jika Supabase error, coba dari cache (graceful degradation)
      return _verifyFromCache(username, password, hashedPw);
    }
  } else {
    // Offline: verifikasi dari cache lokal
    return _verifyFromCache(username, password, hashedPw);
  }
}

function _verifyFromCache(
  username: string,
  password: string,
  hashedPw: string
): { account: Account | null; error?: string } {
  const cached = getCachedAccounts();
  if (cached.length === 0) {
    return {
      account: null,
      error: 'Tidak dapat login saat offline (belum ada cache akun). Hubungkan ke internet terlebih dahulu.'
    };
  }
  const found = cached.find(a =>
    a.username.toLowerCase() === username.toLowerCase() &&
    (a.password === hashedPw || (!isHashed(a.password ?? '') && a.password === password))
  );
  return found
    ? { account: found }
    : { account: null, error: 'Username atau password salah' };
}

/**
 * Ganti password akun. Otomatis hash SHA-256 sebelum disimpan.
 */
export async function changePassword(
  username: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const hashedPw = await hashPassword(newPassword);

  // Update cache lokal dulu
  const cached = getCachedAccounts();
  const updated = cached.map(a =>
    a.username === username ? { ...a, password: hashedPw } : a
  );
  cacheAccounts(updated);

  if (navigator.onLine) {
    const { error } = await supabase
      .from('accounts')
      .update({ password: hashedPw })
      .eq('username', username);

    if (error) {
      console.warn('[db] changePassword: gagal update ke Supabase.', error.message);
      markPendingSync();
      return { success: false, error: error.message };
    }
    return { success: true };
  } else {
    markPendingSync();
    return { success: true }; // Akan di-sync saat online
  }
}

// ─── MAPPERS camelCase ↔ snake_case ───────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToPatient(row: any): Patient {
  return {
    no:               row.no,
    tanggalRegistrasi: row.tanggal_registrasi ?? '',
    nikIbu:           row.nik_ibu,
    namaLengkapIbu:   row.nama_lengkap_ibu,
    desa:             row.desa,
    nomorHp:          row.nomor_hp ?? '',
    hpht:             row.hpht ?? '',
    tt1: row.tt1 ?? false,  tanggalTt1: row.tanggal_tt1 ?? '',
    tt2: row.tt2 ?? false,  tanggalTt2: row.tanggal_tt2 ?? '',
    tt3: row.tt3 ?? false,  tanggalTt3: row.tanggal_tt3 ?? '',
    tt4: row.tt4 ?? false,  tanggalTt4: row.tanggal_tt4 ?? '',
    tt5: row.tt5 ?? false,  tanggalTt5: row.tanggal_tt5 ?? '',
    keterangan:       row.keterangan ?? '',
    gravida:          row.gravida,
    paritas:          row.paritas,
    abortus:          row.abortus,
    jarakKelahiran:   row.jarak_kelahiran ?? 'Anak Pertama',
  };
}

function patientToDb(p: Patient) {
  return {
    no:                  p.no,
    tanggal_registrasi:  p.tanggalRegistrasi || new Date().toISOString().split('T')[0],
    nik_ibu:             p.nikIbu,
    nama_lengkap_ibu:    p.namaLengkapIbu,
    desa:                p.desa,
    nomor_hp:            p.nomorHp,
    hpht:                p.hpht || null,
    tt1: p.tt1, tanggal_tt1: p.tanggalTt1,
    tt2: p.tt2, tanggal_tt2: p.tanggalTt2,
    tt3: p.tt3, tanggal_tt3: p.tanggalTt3,
    tt4: p.tt4, tanggal_tt4: p.tanggalTt4,
    tt5: p.tt5, tanggal_tt5: p.tanggalTt5,
    keterangan:          p.keterangan,
    gravida:             p.gravida ?? 1,
    paritas:             p.paritas ?? 0,
    abortus:             p.abortus ?? 0,
    jarak_kelahiran:     p.jarakKelahiran ?? 'Anak Pertama',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dbToAccount(row: any): Account {
  return {
    username:    row.username,
    password:    row.password,
    role:        row.role as 'Puskesmas' | 'Desa',
    desa:        row.desa,
    namaLengkap: row.nama_lengkap,
  };
}

function accountToDb(a: Account) {
  return {
    username:     a.username,
    password:     a.password ?? '',
    role:         a.role,
    desa:         a.desa,
    nama_lengkap: a.namaLengkap,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToLog(row: any): WhatsappLog {
  return {
    id:             row.id,
    nikIbu:         row.nik_ibu,
    namaLengkapIbu: row.nama_lengkap_ibu,
    nomorHp:        row.nomor_hp,
    desa:           row.desa,
    pesan:          row.pesan,
    tanggalKirim:   row.tanggal_kirim,
    status:         row.status,
  };
}

function logToDb(l: WhatsappLog) {
  return {
    id:               l.id,
    nik_ibu:          l.nikIbu,
    nama_lengkap_ibu: l.namaLengkapIbu,
    nomor_hp:         l.nomorHp,
    desa:             l.desa,
    pesan:            l.pesan,
    tanggal_kirim:    l.tanggalKirim,
    status:           l.status,
  };
}

// ─── PENDING SYNC FLAG ────────────────────────────────────────────────────────

function markPendingSync() {
  localStorage.setItem(LS.PENDING_SYNC, 'true');
}

function clearPendingSync() {
  localStorage.removeItem(LS.PENDING_SYNC);
}

export function hasPendingSync(): boolean {
  return localStorage.getItem(LS.PENDING_SYNC) === 'true';
}

// ─── PATIENTS ─────────────────────────────────────────────────────────────────

function getCachedPatients(): Patient[] {
  try {
    const raw = localStorage.getItem(LS.PATIENTS);
    return raw ? (JSON.parse(raw) as Patient[]) : [];
  } catch { return []; }
}

function cachePatients(patients: Patient[]) {
  localStorage.setItem(LS.PATIENTS, JSON.stringify(patients));
}

/**
 * Load patients: coba Supabase dulu, fallback ke localStorage.
 * Jika Supabase berhasil, update cache lokal.
 */
export async function loadPatients(): Promise<{ data: Patient[]; fromCache: boolean }> {
  if (!navigator.onLine) {
    return { data: getCachedPatients(), fromCache: true };
  }
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('no', { ascending: true });
    if (error) throw error;
    const patients = (data ?? []).map(dbToPatient);
    cachePatients(patients);
    return { data: patients, fromCache: false };
  } catch (err) {
    console.warn('[db] loadPatients: Supabase gagal, pakai cache lokal.', err);
    return { data: getCachedPatients(), fromCache: true };
  }
}

/**
 * Simpan patients: localStorage dulu (langsung), Supabase jika online.
 */
export function savePatients(patients: Patient[]): void {
  cachePatients(patients);
  if (navigator.onLine) {
    _pushPatientsToSupabase(patients);
  } else {
    markPendingSync();
  }
}

async function _pushPatientsToSupabase(patients: Patient[]): Promise<void> {
  if (patients.length === 0) {
    await supabase.from('patients').delete().neq('nik_ibu', '');
    return;
  }
  const { error } = await supabase
    .from('patients')
    .upsert(patients.map(patientToDb), { onConflict: 'nik_ibu' });
  if (error) {
    console.warn('[db] pushPatients: gagal sync ke Supabase.', error.message);
    markPendingSync();
  }
}

/** Hapus satu pasien: dari cache lokal + Supabase */
export function deletePatient(patients: Patient[], no: number): Patient[] {
  const updated = patients.filter(p => p.no !== no);
  cachePatients(updated);
  if (navigator.onLine) {
    supabase.from('patients').delete().eq('no', no)
      .then(({ error }) => {
        if (error) {
          console.warn('[db] deletePatient: gagal sync.', error.message);
          markPendingSync();
        }
      });
  } else {
    markPendingSync();
  }
  return updated;
}

/** Hapus semua pasien */
export function clearPatients(): void {
  cachePatients([]);
  if (navigator.onLine) {
    supabase.from('patients').delete().neq('nik_ibu', '')
      .then(({ error }) => {
        if (error) {
          console.warn('[db] clearPatients: gagal sync.', error.message);
          markPendingSync();
        }
      });
  } else {
    markPendingSync();
  }
}

// ─── ACCOUNTS ─────────────────────────────────────────────────────────────────

function getCachedAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(LS.ACCOUNTS);
    return raw ? (JSON.parse(raw) as Account[]) : [];
  } catch { return []; }
}

function cacheAccounts(accounts: Account[]) {
  localStorage.setItem(LS.ACCOUNTS, JSON.stringify(accounts));
}

/** Background refresh cache dari Supabase (fire-and-forget) */
async function _refreshAccountCache(): Promise<void> {
  try {
    const { data, error } = await supabase.from('accounts').select('*');
    if (!error && data) cacheAccounts(data.map(dbToAccount));
  } catch { /* silent */ }
}

/**
 * Load accounts dari Supabase.
 * Jika offline atau Supabase gagal, fallback ke cache localStorage.
 * Tidak memerlukan fallback parameter — akun dikelola di Supabase.
 */
const DEFAULT_ACCOUNTS: Account[] = [
  { username: 'puskesmas', password: 'adminpuskesmas', role: 'Puskesmas', desa: 'Semua', namaLengkap: 'Admin Puskesmas Kabukarudi' },
  { username: 'bidan_sodana', password: 'desa123', role: 'Desa', desa: 'Pustu Sodana', namaLengkap: 'Sitti Aminah (Bidan Pustu Sodana)' },
  { username: 'bidan_patialabawa', password: 'desa123', role: 'Desa', desa: 'Pustu Patiala Bawa', namaLengkap: 'Maria S. (Bidan Patiala Bawa)' },
  { username: 'bidan_bodohulla', password: 'desa123', role: 'Desa', desa: 'Poskesdes Bodohulla', namaLengkap: 'Yuliana K. (Bidan Bodohulla)' },
  { username: 'bidan_watukarere', password: 'desa123', role: 'Desa', desa: 'Poskesdes Watukarere', namaLengkap: 'Marlina D. (Bidan Watukarere)' },
  { username: 'bidan_ringurara', password: 'desa123', role: 'Desa', desa: 'Poskesdes Ringu Rara', namaLengkap: 'Anastasia R. (Bidan Ringu Rara)' },
  { username: 'bidan_palamoko', password: 'desa123', role: 'Desa', desa: 'Polindes Palamoko', namaLengkap: 'Elizabeth T. (Bidan Palamoko)' },
  { username: 'bidan_welibo', password: 'desa123', role: 'Desa', desa: 'Polindes Welibo', namaLengkap: 'Christina M. (Bidan Welibo)' },
  { username: 'bidan_rajaka', password: 'desa123', role: 'Desa', desa: 'Polindes Rajaka', namaLengkap: 'Ningsih P. (Bidan Rajaka)' },
  { username: 'bidan_laboyadete', password: 'desa123', role: 'Desa', desa: 'Polindes Laboya Dete', namaLengkap: 'Agustina H. (Bidan Laboya Dete)' },
  { username: 'bidan_laboyabawa', password: 'desa123', role: 'Desa', desa: 'Polindes Laboya Bawa', namaLengkap: 'Fitriani W. (Bidan Laboya Bawa)' },
  { username: 'bidan_kabukarudi', password: 'desa123', role: 'Desa', desa: 'Kabukarudi', namaLengkap: 'Debora Y. (Bidan Kabukarudi)' },
];

function seedDefaultAccounts(): Account[] {
  const cached = getCachedAccounts();
  if (cached.length > 0) return cached;
  cacheAccounts(DEFAULT_ACCOUNTS);
  return DEFAULT_ACCOUNTS;
}

export async function loadAccounts(): Promise<{ data: Account[]; fromCache: boolean }> {
  if (!navigator.onLine) {
    return { data: seedDefaultAccounts(), fromCache: true };
  }
  try {
    const { data, error } = await supabase.from('accounts').select('*');
    if (error) throw error;
    if (data && data.length > 0) {
      const accounts = data.map(dbToAccount);
      cacheAccounts(accounts);
      return { data: accounts, fromCache: false };
    }
    return { data: seedDefaultAccounts(), fromCache: true };
  } catch (err) {
    console.warn('[db] loadAccounts: Supabase gagal, pakai cache.', err);
    return { data: seedDefaultAccounts(), fromCache: true };
  }
}

export function saveAccounts(accounts: Account[]): void {
  cacheAccounts(accounts);
  if (navigator.onLine) {
    supabase
      .from('accounts')
      .upsert(accounts.map(accountToDb), { onConflict: 'username' })
      .then(({ error }) => {
        if (error) {
          console.warn('[db] saveAccounts: gagal sync.', error.message);
          markPendingSync();
        }
      });
  } else {
    markPendingSync();
  }
}

// ─── WHATSAPP LOGS ─────────────────────────────────────────────────────────────

function getCachedLogs(): WhatsappLog[] {
  try {
    const raw = localStorage.getItem(LS.WA_LOGS);
    return raw ? (JSON.parse(raw) as WhatsappLog[]) : [];
  } catch { return []; }
}

function cacheLogs(logs: WhatsappLog[]) {
  localStorage.setItem(LS.WA_LOGS, JSON.stringify(logs));
}

export async function loadWhatsappLogs(): Promise<{ data: WhatsappLog[]; fromCache: boolean }> {
  if (!navigator.onLine) {
    return { data: getCachedLogs(), fromCache: true };
  }
  try {
    const { data, error } = await supabase
      .from('whatsapp_logs')
      .select('*')
      .order('tanggal_kirim', { ascending: false });
    if (error) throw error;
    const logs = (data ?? []).map(dbToLog);
    cacheLogs(logs);
    return { data: logs, fromCache: false };
  } catch (err) {
    console.warn('[db] loadWhatsappLogs: Supabase gagal, pakai cache.', err);
    return { data: getCachedLogs(), fromCache: true };
  }
}

export function saveWhatsappLog(log: WhatsappLog, currentLogs: WhatsappLog[]): WhatsappLog[] {
  const updated = [log, ...currentLogs];
  cacheLogs(updated);
  if (navigator.onLine) {
    supabase.from('whatsapp_logs').insert([logToDb(log)])
      .then(({ error }) => {
        if (error) {
          console.warn('[db] saveWhatsappLog: gagal sync.', error.message);
          markPendingSync();
        }
      });
  } else {
    markPendingSync();
  }
  return updated;
}

// ─── BACKGROUND SYNC ──────────────────────────────────────────────────────────

/**
 * Dipanggil saat event 'online' — push semua data cache ke Supabase.
 * App.tsx harus meregistrasi: window.addEventListener('online', syncPendingData)
 */
export async function syncPendingData(): Promise<void> {
  if (!hasPendingSync()) return;
  console.log('[db] Jaringan kembali. Memulai background sync...');

  let success = true;

  // Sync patients
  const patients = getCachedPatients();
  if (patients.length > 0) {
    const { error } = await supabase
      .from('patients')
      .upsert(patients.map(patientToDb), { onConflict: 'nik_ibu' });
    if (error) { console.warn('[db] sync patients gagal:', error.message); success = false; }
  }

  // Sync accounts
  const accounts = getCachedAccounts();
  if (accounts.length > 0) {
    const { error } = await supabase
      .from('accounts')
      .upsert(accounts.map(accountToDb), { onConflict: 'username' });
    if (error) { console.warn('[db] sync accounts gagal:', error.message); success = false; }
  }

  // Sync wa_logs — insert yang belum ada (ignore conflict)
  const logs = getCachedLogs();
  if (logs.length > 0) {
    const { error } = await supabase
      .from('whatsapp_logs')
      .upsert(logs.map(logToDb), { onConflict: 'id', ignoreDuplicates: true });
    if (error) { console.warn('[db] sync wa_logs gagal:', error.message); success = false; }
  }

  if (success) {
    clearPendingSync();
    console.log('[db] Background sync selesai ✓');
  } else {
    console.warn('[db] Background sync sebagian gagal, akan dicoba lagi nanti.');
  }
}
