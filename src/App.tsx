/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, 
  Users, 
  Calendar, 
  FileText, 
  Send, 
  LogOut, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Search, 
  Plus, 
  PlusCircle,
  Edit,
  Clipboard, 
  Check, 
  FileDown, 
  Info, 
  MapPin, 
  Phone,
  Eye,
  Settings,
  ChevronRight,
  Database,
  ArrowRight,
  RefreshCw,
  Trash,
  Trash2,
  Upload
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  loadPatients,
  savePatients,
  deletePatient,
  clearPatients,
  loadAccounts,
  saveAccounts,
  loadWhatsappLogs,
  saveWhatsappLog,
  syncPendingData,
  hasPendingSync,
  verifyLogin,
  changePassword,
  hashPassword,
  getSession,
  setSession,
} from './lib/db';

// ==========================================
// DATA REGION & LIST OF VILLAGES (SUNDA/SUMBA BARAT - KABUKARUDI)
// ==========================================
const VILLAGES = [
  'Sodana',
  'Patiala Bawa',
  'Bodohulla',
  'Watukarere',
  'Ringu Rara',
  'Palamoko',
  'Welibo',
  'Rajaka',
  'Laboya Dete',
  'Laboya Bawa',
  'Kabukarudi'
];

interface Account {
  username: string;
  password?: string;
  role: 'Puskesmas' | 'Desa';
  desa: string;
  namaLengkap: string;
}

interface Patient {
  no: number;
  tanggalRegistrasi: string;
  nikIbu: string;
  namaLengkapIbu: string;
  desa: string;
  nomorHp: string;
  hpht: string;
  tt1: boolean;
  tanggalTt1: string;
  tt2: boolean;
  tanggalTt2: string;
  tt3: boolean;
  tanggalTt3: string;
  tt4: boolean;
  tanggalTt4: string;
  tt5: boolean;
  tanggalTt5: string;
  keterangan: string;
  gravida?: number;
  paritas?: number;
  abortus?: number;
  jarakKelahiran?: string;
  tindakLanjut?: string;
  riwayatTindakLanjut?: string;
}

interface WhatsappLog {
  id: string;
  nikIbu: string;
  namaLengkapIbu: string;
  nomorHp: string;
  desa: string;
  pesan: string;
  tanggalKirim: string;
  status: string;
}

// ==========================================
// OUTSTANDING INTEGRATION CODES FOR SUPABASE & WHATSAPP Reminders
// ==========================================
const supabaseSqlTemplate = `-- ==========================================
-- SUPABASE POSTGRESQL TABLE SCHEMAS
-- MASUKKAN DI MENU SQL EDITOR DASHBOARD SUPABASE ANDA
-- ==========================================

-- 1. Tabel Pasien (Ibu Hamil)
CREATE TABLE patients (
  no SERIAL,
  tanggal_registrasi DATE DEFAULT CURRENT_DATE,
  nik_ibu VARCHAR(16) PRIMARY KEY,
  nama_lengkap_ibu VARCHAR(255) NOT NULL,
  desa VARCHAR(100) NOT NULL,
  nomor_hp VARCHAR(20),
  hpht DATE,
  tt1 BOOLEAN DEFAULT FALSE,
  tanggal_tt1 VARCHAR(100),
  tt2 BOOLEAN DEFAULT FALSE,
  tanggal_tt2 VARCHAR(100),
  tt3 BOOLEAN DEFAULT FALSE,
  tanggal_tt3 VARCHAR(100),
  tt4 BOOLEAN DEFAULT FALSE,
  tanggal_tt4 VARCHAR(100),
  tt5 BOOLEAN DEFAULT FALSE,
  tanggal_tt5 VARCHAR(100),
  keterangan VARCHAR(100) NOT NULL,
  gravida INTEGER DEFAULT 1,
  paritas INTEGER DEFAULT 0,
  abortus INTEGER DEFAULT 0,
  jarak_kelahiran VARCHAR(100) DEFAULT 'Anak Pertama'
);

-- 2. Tabel Akun Pengguna (Puskesmas & Bidan Desa)
CREATE TABLE accounts (
  username VARCHAR(100) PRIMARY KEY,
  password VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL,
  desa VARCHAR(100) NOT NULL,
  nama_lengkap VARCHAR(255) NOT NULL
);

-- 3. Injeksi Data Multi-Akun default
INSERT INTO accounts (username, password, role, desa, nama_lengkap) VALUES
('puskesmas', 'adminpuskesmas', 'Puskesmas', 'Semua', 'Admin Puskesmas Kabukarudi'),
('bidan_kabukarudi', 'desa123', 'Desa', 'Kabukarudi', 'Sitti Rahma (Bidan Kabukarudi)'),
('bidan_bondosula', 'desa123', 'Desa', 'Bondosula', 'Maria S. (Bidan Bondosula)'),
('bidan_dokakaka', 'desa123', 'Desa', 'Dokakaka', 'Yuliana K. (Bidan Dokakaka)')
ON CONFLICT (username) DO NOTHING;`;

const supabaseJsTemplate = `// ==========================================
// CLIENT INTEGRATION (supabase.ts atau App.tsx)
// ==========================================
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
export const supabase = createClient(supabaseUrl, supabaseKey);

// FETCH ALL PATIENTS (Ambil Riwayat)
export async function fetchPatientsFromSupabase() {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('no', { ascending: true });
    
  if (error) {
    console.error('Error fetching patients:', error.message);
    return [];
  }
  return data;
}

// SAVE OR UPDATE Ibu Hamil
export async function savePatientToSupabase(patient) {
  const { data, error } = await supabase
    .from('patients')
    .upsert({
      nik_ibu: patient.nikIbu,
      nama_lengkap_ibu: patient.namaLengkapIbu,
      desa: patient.desa,
      nomor_hp: patient.nomorHp,
      hpht: patient.hpht,
      tt1: patient.tt1,
      tanggal_tt1: patient.tanggalTt1,
      tt2: patient.tt2,
      tanggal_tt2: patient.tanggalTt2,
      tt3: patient.tt3,
      tanggal_tt3: patient.tanggalTt3,
      tt4: patient.tt4,
      tanggal_tt4: patient.tanggalTt4,
      tt5: patient.tt5,
      tanggal_tt5: patient.tanggalTt5,
      keterangan: patient.keterangan,
      gravida: patient.gravida,
      paritas: patient.paritas,
      abortus: patient.abortus,
      jarak_kelahiran: patient.jarakKelahiran
    }, { onConflict: 'nik_ibu' });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}`;

const whatsappCodeTemplate = `// ==========================================
// WHATSAPP API GATEWAY CALLER (Fonnte / Api Lokal)
// ==========================================
export async function sendWhatsAppNotification(phone, message) {
  if (!phone || phone === '-') {
    return { success: false, error: 'Nomor HP tidak valid' };
  }
  
  // Format nomor 08xx -> 628xx (Indonesian Standard)
  let phoneFormatted = phone.trim();
  if (phoneFormatted.startsWith('0')) {
    phoneFormatted = '62' + phoneFormatted.slice(1);
  }
  
  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': 'MASUKKAN_KEY_TOKEN_DASHBOARD_FONNTE_DI_SINI'
      },
      body: new URLSearchParams({
        target: phoneFormatted,
        message: message,
        countryCode: '62'
      })
    });
    
    const result = await response.json();
    return {
      success: !!result.status,
      log: result
    };
  } catch (error) {
    console.error('Server WA Connection API Error:', error);
    return { success: false, error: error.message };
  }
}`;

const whatsappGasTemplate = `// ==========================================
// GOOGLE SHEETS APPS SCRIPT WA AUTOMATION
// TRIGGER BIASA: KIRIM OTOMATIS SAAT EDIT BARIS BARU
// ==========================================
function sendWhatsAppAlert(toPhone, patientName, nextSchedule, nextDose) {
  var token = "MASUKKAN_KEY_TOKEN_DASHBOARD_FONNTE_DI_SINI";
  var url = "https://api.fonnte.com/send";
  
  // Normalisasi HP
  var formattedPhone = toPhone.toString().trim();
  if (formattedPhone.indexOf('0') === 0) {
    formattedPhone = '62' + formattedPhone.substring(1);
  }
  
  var textMessage = "Halo Ibu " + patientName + ", ini pengingat resmi dari Bidan Puskesmas Kabukarudi. " +
                    "Jadwal suntik " + nextDose + " Anda dijadwalkan masuk masa tenggang pada tanggal " + nextSchedule + ". " +
                    "Silakan ke Poskesdes atau Puskesmas terdekat untuk menjamin imunisasi lengkap bayi & janin Anda! Terima kasih.";
  
  var payload = {
    'target': formattedPhone,
    'message': textMessage,
    'countryCode': '62'
  };
  
  var options = {
    'method': 'post',
    'headers': {
      'Authorization': token
    },
    'payload': payload,
    'muteHttpExceptions': true
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    Logger.log('WA Logger Result: ' + response.getContentText());
  } catch (e) {
    Logger.log('Apps Script WA Error: ' + e.toString());
  }
}`;

export default function App() {
  // Authentication State
  const [user, setUser] = useState<Account | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Landing Page States
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [showLandingInfo, setShowLandingInfo] = useState(false);
  const [showAccountList, setShowAccountList] = useState(false);

  // Change Password Modal States
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [changePasswordTarget, setChangePasswordTarget] = useState<Account | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState('');

  // Accounts Management States
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isAccountFormOpen, setIsAccountFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accFormUsername, setAccFormUsername] = useState('');
  const [accFormPassword, setAccFormPassword] = useState('');
  const [accFormConfirmPassword, setAccFormConfirmPassword] = useState('');
  const [accFormDesa, setAccFormDesa] = useState('');
  const [accFormNamaLengkap, setAccFormNamaLengkap] = useState('');
  const [accFormRole, setAccFormRole] = useState<'Puskesmas' | 'Desa'>('Desa');
  const [accSearch, setAccSearch] = useState('');

  // Main UI States
  const [activeTab, setActiveTab] = useState<'beranda' | 'input' | 'lacak' | 'interval' | 'integrasi_gas' | 'accounts' | 'lacar'>(() => (localStorage.getItem('smarttt_activeTab') as any) || 'beranda');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [lacakSubFilter, setLacakSubFilter] = useState<'dropout' | 'mendekati' | 'all'>('all');
  const [selectedDesaFilter, setSelectedDesaFilter] = useState('Semua');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // WhatsApp State
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsappLog[]>([]);
  const [activeWhatsappModal, setActiveWhatsappModal] = useState<Patient | null>(null);
  const [customMsg, setCustomMsg] = useState('');
  const [showWaLog, setShowWaLog] = useState(false);
  const [isSendingWa, setIsSendingWa] = useState(false);

  // Custom Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'primary' | 'danger' | 'success' | 'warning';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Form input States (Create / Update Patient)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [integrationSubTab, setIntegrationSubTab] = useState<'gas' | 'supabase' | 'whatsapp'>('gas');
  
  // New Patient Form fields
  const [formNik, setFormNik] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formDesa, setFormDesa] = useState('');
  const [formHp, setFormHp] = useState('');
  const [formHpht, setFormHpht] = useState('');
  const [formTanggalRegistrasi, setFormTanggalRegistrasi] = useState(new Date().toISOString().split('T')[0]);
  const [formTtValue, setFormTtValue] = useState<number>(1); // Dosis terakhir yang diberikan
  const [formTanggalTt, setFormTanggalTt] = useState('');
  const [formGravida, setFormGravida] = useState<number | ''>('');
  const [formParitas, setFormParitas] = useState<number | ''>('');
  const [formAbortus, setFormAbortus] = useState<number | ''>('');
  const [formJarakKelahiran, setFormJarakKelahiran] = useState('');
  const [nikMatch, setNikMatch] = useState<'found' | 'not_found' | ''>('');

  // Dynamic fields for multicheck dosage records
  const [dosageTt1, setDosageTt1] = useState(false);
  const [dateTt1, setDateTt1] = useState('');
  const [dosageTt2, setDosageTt2] = useState(false);
  const [dateTt2, setDateTt2] = useState('');
  const [dosageTt3, setDosageTt3] = useState(false);
  const [dateTt3, setDateTt3] = useState('');
  const [dosageTt4, setDosageTt4] = useState(false);
  const [dateTt4, setDateTt4] = useState('');
  const [dosageTt5, setDosageTt5] = useState(false);
  const [dateTt5, setDateTt5] = useState('');

  // Copied alert state
  const [copiedKey, setCopiedKey] = useState<'gs' | 'html' | 'sheet' | null>(null);

  // Sync status: apakah ada data offline yang belum di-sync
  const [pendingSync, setPendingSync] = React.useState(hasPendingSync());
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);

  // Load Database and Session
  useEffect(() => {
    // Session load dari localStorage → tetap tersedia offline setelah pernah login
    const savedSession = getSession();
    if (savedSession) {
      setUser(savedSession);
      if (savedSession.role === 'Desa') {
        setSelectedDesaFilter(savedSession.desa);
      }
    }

    // Load semua data: Supabase dulu, fallback localStorage jika offline/gagal
    const loadData = async () => {
      const { data: accountData } = await loadAccounts();
      setAccounts(accountData);

      const { data: patientData } = await loadPatients();
      setPatients(patientData.filter(p => VILLAGES.includes(p.desa)));

      const { data: logData } = await loadWhatsappLogs();
      setWhatsappLogs(logData);

      setPendingSync(hasPendingSync());
    };

    loadData();

    // Background sync saat jaringan kembali
    const handleOnline = async () => {
      setIsOffline(false);
      await syncPendingData();
      setPendingSync(hasPendingSync());
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Simpan activeTab ke localStorage agar tidak reset saat reload
  useEffect(() => {
    localStorage.setItem('smarttt_activeTab', activeTab);
  }, [activeTab]);

  // Debounced NIK lookup — isi otomatis form jika NIK sudah ada
  useEffect(() => {
    if (!isFormOpen) return;
    const timer = setTimeout(() => {
      if (formNik.length !== 16) { setNikMatch(''); return; }
      const match = patients.find(p => p.nikIbu === formNik);
      if (match) {
        setNikMatch('found');
        setEditingPatient(match);
        setFormNama(match.namaLengkapIbu);
        setFormDesa(match.desa);
        setFormHp(match.nomorHp);
        setFormHpht(match.hpht || '');
        setFormJarakKelahiran(match.jarakKelahiran || '');
        setFormGravida(match.gravida !== undefined ? match.gravida : '');
        setFormParitas(match.paritas !== undefined ? match.paritas : '');
        setFormAbortus(match.abortus !== undefined ? match.abortus : '');
        setDosageTt1(match.tt1); setDateTt1(match.tanggalTt1 || '');
        setDosageTt2(match.tt2); setDateTt2(match.tanggalTt2 || '');
        setDosageTt3(match.tt3); setDateTt3(match.tanggalTt3 || '');
        setDosageTt4(match.tt4); setDateTt4(match.tanggalTt4 || '');
        setDosageTt5(match.tt5); setDateTt5(match.tanggalTt5 || '');
      } else {
        setNikMatch('not_found');
        setEditingPatient(null);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [formNik, isFormOpen, patients]);

  // Save patients — localStorage dulu, Supabase jika online
  const updatePatientsInStorage = (newList: Patient[]) => {
    setPatients(newList);
    savePatients(newList);
    setPendingSync(hasPendingSync());
  };

  const handleTindakLanjutChange = (no: number, value: string) => {
    const now = new Date().toISOString().split('T')[0];
    setPatients(prev => {
      const updated = prev.map(p => {
        if (p.no !== no) return p;
        const riwayat = p.riwayatTindakLanjut ? JSON.parse(p.riwayatTindakLanjut) : [];
        if (value === 'Pengulangan Dosis') {
          riwayat.push({ tgl: now, tindakan: value });
          return { ...p, tindakLanjut: value, riwayatTindakLanjut: JSON.stringify(riwayat), tt1: false, tanggalTt1: '', tt2: false, tanggalTt2: '', tt3: false, tanggalTt3: '', tt4: false, tanggalTt4: '', tt5: false, tanggalTt5: '', keterangan: '' };
        }
        if (value === 'Hubungi Via Whatsapp') {
          riwayat.push({ tgl: now, tindakan: value });
        }
        return { ...p, tindakLanjut: value, riwayatTindakLanjut: JSON.stringify(riwayat) };
      });
      savePatients(updated);
      return updated;
    });
    if (value === 'Hubungi Via Whatsapp') {
      const p = patients.find(x => x.no === no);
      if (p) requestWhatsappModal(p);
    }
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(ws);
        let updated = [...patients];
        for (const row of rows) {
          const gpa = (row['GPA'] || row['gpa'] || '').toString().match(/G(\d+)\s*P(\d+)\s*A(\d+)/i);
          const gravida = gpa ? parseInt(gpa[1]) : undefined;
          const paritas = gpa ? parseInt(gpa[2]) : undefined;
          const abortus = gpa ? parseInt(gpa[3]) : undefined;
          const getBool = (key: string) => {
            const v = row[key]?.toString().trim().toLowerCase();
            if (v === 'true' || v === '1' || v === 'ya' || v === 'sudah') return true;
            if (v === 'false' || v === '0' || v === 'tidak' || v === 'belum') return false;
            return false;
          };
          const getDate = (ttKey: string, dateKey: string) => {
            if (getBool(ttKey)) {
              const v = row[dateKey];
              if (v) {
                const d = new Date((v as any).toISOString ? (v as Date) : v);
                return isNaN(d.getTime()) ? v.toString() : d.toISOString().split('T')[0];
              }
            }
            return '';
          };
          const p: Patient = {
            no: nextNo++,
            tanggalRegistrasi: row['TANGGAL REGISTRASI']?.toString() || new Date().toISOString().split('T')[0],
            nikIbu: row['NIK IBU']?.toString().trim() || '',
            namaLengkapIbu: row['NAMA LENGKAP IBU']?.toString().trim() || '',
            desa: row['DESA']?.toString().trim() || '',
            nomorHp: row['NOMOR HP']?.toString().trim() || '',
            hpht: row['HPHT']?.toString().trim() || '',
            tt1: getBool('TT1'), tanggalTt1: getDate('TT1', 'TANGGAL TT1'),
            tt2: getBool('TT2'), tanggalTt2: getDate('TT2', 'TANGGAL TT2'),
            tt3: getBool('TT3'), tanggalTt3: getDate('TT3', 'TANGGAL TT3'),
            tt4: getBool('TT4'), tanggalTt4: getDate('TT4', 'TANGGAL TT4'),
            tt5: getBool('TT5'), tanggalTt5: getDate('TT5', 'TANGGAL TT5'),
            keterangan: row['KETERANGAN']?.toString().trim() || '',
            gravida, paritas, abortus,
            jarakKelahiran: row['JARAK KELAHIRAN']?.toString().trim() || 'Anak Pertama',
          };
          if (!p.namaLengkapIbu || !p.nikIbu) continue;
          const existing = updated.findIndex(x => x.nikIbu === p.nikIbu);
          if (existing >= 0) {
            updated[existing] = { ...updated[existing], ...p, no: updated[existing].no };
          } else {
            p.no = updated.length > 0 ? Math.max(...updated.map(x => x.no)) + 1 : 1;
            updated.push(p);
          }
        }
        if (updated.length === patients.length) return;
        setPatients(updated);
        savePatients(updated);
        setPendingSync(hasPendingSync());
      } catch (err) {
        console.error('Import gagal:', err);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Delete a single patient record
  const handleDeletePatient = (no: number, nama: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Rekam Medis',
      message: `Apakah Anda yakin ingin menghapus data rekam medis Ibu ${nama}? Tindakan ini permanen dan tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: () => {
        const updated = deletePatient(patients, no);
        setPatients(updated);
        setPendingSync(hasPendingSync());
      }
    });
  };

  // Wipes all patients from the local database
  const handleClearAllPatients = () => {
    setConfirmDialog({
      isOpen: true,
      title: '⚠️ KOSONGKAN BASIS DATA',
      message: 'Apakah Anda yakin ingin menghapus SELURUH data ibu hamil dari basis data lokal? Seluruh rekam medis dan data imunisasi akan hilang secara permanen dan sistem akan kembali kosong.',
      confirmText: 'Ya, Bersihkan Semua',
      cancelText: 'Batalkan',
      type: 'danger',
      onConfirm: () => {
        clearPatients();
        setPatients([]);
        setPendingSync(hasPendingSync());
      }
    });
  };

  // -------------------------------------------------------------
  // VILLAGE ACCOUNTS MANAGEMENT FUNCTIONS (CRUD)
  // -------------------------------------------------------------
  const updateAccountsInStorage = (newList: Account[]) => {
    setAccounts(newList);
    saveAccounts(newList);
    setPendingSync(hasPendingSync());
  };

  const openNewAccountForm = () => {
    setEditingAccount(null);
    setAccFormUsername('');
    setAccFormPassword('');
    setAccFormConfirmPassword('');
    setAccFormDesa(VILLAGES[0] || 'Pustu Sodana');
    setAccFormNamaLengkap('');
    setAccFormRole('Desa');
    setIsAccountFormOpen(true);
  };

  const openEditAccountForm = (acc: Account) => {
    setEditingAccount(acc);
    setAccFormUsername(acc.username);
    setAccFormPassword(''); // Jangan pre-fill hash — biarkan kosong saat edit
    setAccFormConfirmPassword('');
    setAccFormDesa(acc.desa);
    setAccFormNamaLengkap(acc.namaLengkap);
    setAccFormRole(acc.role);
    setIsAccountFormOpen(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    // Saat edit: password boleh kosong (artinya tidak diubah)
    const isNew = !editingAccount;
    if (!accFormUsername || !accFormNamaLengkap || (isNew && !accFormPassword)) {
      setConfirmDialog({
        isOpen: true,
        title: 'Data Tidak Lengkap',
        message: 'Mohon isi semua field wajib (Username, Nama Lengkap, dan Kata Sandi)!',
        confirmText: 'Kembali',
        type: 'warning',
        onConfirm: () => {}
      });
      return;
    }

    // Validasi konfirmasi password jika diisi
    if (accFormPassword.trim() && accFormPassword !== accFormConfirmPassword) {
      setConfirmDialog({
        isOpen: true,
        title: 'Kata Sandi Tidak Cocok',
        message: 'Konfirmasi kata sandi tidak sesuai. Pastikan kedua kolom kata sandi sama.',
        confirmText: 'Perbaiki',
        type: 'warning',
        onConfirm: () => {}
      });
      return;
    }

    // Check duplication of username if creating new
    if (isNew) {
      const exists = accounts.some(a => a.username.toLowerCase() === accFormUsername.toLowerCase());
      if (exists) {
        setConfirmDialog({
          isOpen: true,
          title: 'Username Sudah Terpakai',
          message: `Username '${accFormUsername}' sudah digunakan oleh petugas lain. Silakan pilih username yang berbeda.`,
          confirmText: 'Perbaiki',
          type: 'warning',
          onConfirm: () => {}
        });
        return;
      }
    }

    // Hash password baru jika diisi, atau pertahankan hash lama saat edit
    let finalPassword: string;
    if (accFormPassword.trim()) {
      finalPassword = await hashPassword(accFormPassword.trim());
    } else if (editingAccount) {
      // Edit tanpa ubah password → pertahankan password lama
      finalPassword = editingAccount.password ?? '';
    } else {
      finalPassword = '';
    }

    const accountData: Account = {
      username:    accFormUsername.trim(),
      password:    finalPassword,
      role:        accFormRole,
      desa:        accFormRole === 'Puskesmas' ? 'Semua' : accFormDesa,
      namaLengkap: accFormNamaLengkap.trim()
    };

    let updatedAccounts: Account[] = [];
    if (editingAccount) {
      updatedAccounts = accounts.map(a =>
        a.username.toLowerCase() === editingAccount.username.toLowerCase() ? accountData : a
      );
    } else {
      updatedAccounts = [...accounts, accountData];
    }

    updateAccountsInStorage(updatedAccounts);
    setIsAccountFormOpen(false);

    setConfirmDialog({
      isOpen: true,
      title: 'Akun Disimpan',
      message: `Akun petugas '${accFormNamaLengkap}' berhasil disimpan ke sistem SMART TT.`,
      confirmText: 'OK',
      type: 'success',
      onConfirm: () => {}
    });
  };

  const handleDeleteAccount = (username: string, namaLengkap: string) => {
    if (username.toLowerCase() === 'puskesmas') {
      setConfirmDialog({
        isOpen: true,
        title: 'Tindakan Ditolak',
        message: 'Akun administrator Puskesmas utama tidak diperbolehkan untuk dihapus demi keamanan akses sistem.',
        confirmText: 'OK',
        type: 'warning',
        onConfirm: () => {}
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Akun Petugas Desa',
      message: `Apakah Anda yakin ingin menghapus akun '${username}' (${namaLengkap})? Petugas bersangkutan tidak akan memiliki akses login lagi.`,
      confirmText: 'Ya, Hapus Akun',
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: () => {
        const updated = accounts.filter(a => a.username.toLowerCase() !== username.toLowerCase());
        updateAccountsInStorage(updated);
      }
    });
  };

  // Buka modal ganti password
  const openChangePassword = (acc: Account) => {
    setChangePasswordTarget(acc);
    setNewPasswordInput('');
    setConfirmNewPasswordInput('');
    setChangePasswordError('');
    setIsChangePasswordOpen(true);
  };

  // Handle ganti password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changePasswordTarget) return;
    if (newPasswordInput.length < 6) {
      setChangePasswordError('Password minimal 6 karakter.');
      return;
    }
    if (newPasswordInput !== confirmNewPasswordInput) {
      setChangePasswordError('Konfirmasi password tidak cocok.');
      return;
    }
    setIsChangingPassword(true);
    setChangePasswordError('');
    const { success, error } = await changePassword(changePasswordTarget.username, newPasswordInput);
    setIsChangingPassword(false);
    if (success) {
      // Update state lokal
      const hashed = await hashPassword(newPasswordInput);
      setAccounts(prev => prev.map(a =>
        a.username === changePasswordTarget.username ? { ...a, password: hashed } : a
      ));
      setIsChangePasswordOpen(false);
      setConfirmDialog({
        isOpen: true,
        title: 'Password Berhasil Diubah',
        message: `Password akun '${changePasswordTarget.username}' telah berhasil diperbarui dan di-enkripsi SHA-256.`,
        confirmText: 'OK',
        type: 'success',
        onConfirm: () => {}
      });
    } else {
      setChangePasswordError(error ?? 'Gagal mengubah password.');
    }
  };

  // Helper calculating detailed next schedule dates, remaining days and statuses
  const getPatientScheduleInfo = (p: Partial<Patient>) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (p.tt5 && p.tanggalTt5) {
      return {
        nextDose: 'Selesai (Pr. Seumur Hidup)',
        dueDate: null,
        dueDateStr: 'Lengkap (T5)',
        daysRemaining: null,
        statusText: 'Lengkap (T5)',
        colorClass: 'text-emerald-700 font-extrabold border-emerald-200',
        bgClass: 'bg-emerald-50'
      };
    }

    if (!p.tt1 || !p.tanggalTt1) {
      return {
        nextDose: 'TT1',
        dueDate: null,
        dueDateStr: 'Segera',
        daysRemaining: 0,
        statusText: 'Belum Mulai',
        colorClass: 'text-slate-600 font-bold border-slate-200',
        bgClass: 'bg-slate-100'
      };
    }

    let nextDose = 'TT2';
    let prevAntigen = 'TT1';
    let prevDateStr = p.tanggalTt1;
    let dueDate = new Date(p.tanggalTt1);

    if (p.tt1 && (!p.tt2 || !p.tanggalTt2)) {
      nextDose = 'TT2';
      prevAntigen = 'TT1';
      prevDateStr = p.tanggalTt1;
      dueDate = new Date(p.tanggalTt1);
      dueDate.setDate(dueDate.getDate() + 28); // 4 Wks
    } else if (p.tt2 && (!p.tt3 || !p.tanggalTt3)) {
      nextDose = 'TT3';
      prevAntigen = 'TT2';
      prevDateStr = p.tanggalTt2;
      dueDate = new Date(p.tanggalTt2);
      dueDate.setMonth(dueDate.getMonth() + 6); // 6 Mos
    } else if (p.tt3 && (!p.tt4 || !p.tanggalTt4)) {
      nextDose = 'TT4';
      prevAntigen = 'TT3';
      prevDateStr = p.tanggalTt3;
      dueDate = new Date(p.tanggalTt3);
      dueDate.setFullYear(dueDate.getFullYear() + 1); // 1 Yr
    } else if (p.tt4 && (!p.tt5 || !p.tanggalTt5)) {
      nextDose = 'TT5';
      prevAntigen = 'TT4';
      prevDateStr = p.tanggalTt4;
      dueDate = new Date(p.tanggalTt4);
      dueDate.setFullYear(dueDate.getFullYear() + 1); // 1 Yr
    }

    dueDate.setHours(0, 0, 0, 0);
    const diffTime = dueDate.getTime() - today.getTime();
    const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const formattedDueDate = dueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    if (daysRemaining < 0) {
      return {
        nextDose,
        prevAntigen,
        prevDateStr,
        dueDate,
        dueDateStr: formattedDueDate,
        daysRemaining,
        statusText: 'Drop Out',
        colorClass: 'text-rose-700 font-extrabold border-rose-200',
        bgClass: 'bg-rose-50'
      };
    } else if (daysRemaining <= 14) {
      // Within 14 days is approaching next schedule
      return {
        nextDose,
        prevAntigen,
        prevDateStr,
        dueDate,
        dueDateStr: formattedDueDate,
        daysRemaining,
        statusText: 'Mendekati Jadwal',
        colorClass: 'text-amber-800 font-extrabold border-amber-200 animate-pulse',
        bgClass: 'bg-amber-50/70'
      };
    } else {
      return {
        nextDose,
        prevAntigen,
        prevDateStr,
        dueDate,
        dueDateStr: formattedDueDate,
        daysRemaining,
        statusText: 'Sedang Dipantau',
        colorClass: 'text-sky-700 font-bold border-sky-150',
        bgClass: 'bg-sky-50'
      };
    }
  };

  // Helper calculating Interval Check & Drop Out / Telat status
  const calculateKeteranganStatus = (p: Partial<Patient>): string => {
    return getPatientScheduleInfo(p).statusText;
  };

  // Handle Login — async, verifikasi ke Supabase, session di localStorage
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    const { account, error } = await verifyLogin(usernameInput.trim(), passwordInput);

    setIsLoggingIn(false);

    if (account) {
      const userSession: Account = {
        username:    account.username,
        role:        account.role as 'Puskesmas' | 'Desa',
        desa:        account.desa,
        namaLengkap: account.namaLengkap
      };
      setUser(userSession);
      setSession(userSession); // localStorage — tetap online saat offline
      setLoginError('');
      if (userSession.role === 'Desa') {
        setSelectedDesaFilter(userSession.desa);
      } else {
        setSelectedDesaFilter('Semua');
      }
    } else {
      setLoginError(error ?? 'Username atau password salah.');
    }
  };

  // Pre-fill Quick Logins for Testing Ease
  const triggerQuickLogin = (user: string, pass: string) => {
    setUsernameInput(user);
    setPasswordInput(pass);
  };

  // Handle Logout
  const handleLogout = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Konfirmasi Keluar',
      message: 'Apakah Anda yakin ingin keluar dari sistem SMART TT? Sesi login akan dihapus dari perangkat ini.',
      confirmText: 'Ya, Keluar',
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: () => {
        setUser(null);
        setSession(null); // Hapus dari localStorage
        setUsernameInput('');
        setPasswordInput('');
      }
    });
  };

  // Safe Filtered Patients logic according to logged-in user context
  const filteredPatients = React.useMemo(() => {
    let result = [...patients];

    // BACKEND-LEVEL ROLE SAFETY SIMULATION
    if (user) {
      if (user.role === 'Desa') {
        result = result.filter(p => p.desa.trim().toLowerCase() === user.desa.trim().toLowerCase());
      } else {
        // Puskesmas admin can filter manually
        if (selectedDesaFilter !== 'Semua') {
          result = result.filter(p => p.desa.trim().toLowerCase() === selectedDesaFilter.trim().toLowerCase());
        }
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(p =>
        p.namaLengkapIbu.toLowerCase().includes(q) ||
        p.nikIbu.includes(q) ||
        p.desa.toLowerCase().includes(q) ||
        (p.nomorHp && p.nomorHp.includes(q))
      );
    }

    // Status filter
    if (statusFilter !== 'Semua') {
      result = result.filter(p => {
        const estStatus = calculateKeteranganStatus(p);
        if (statusFilter === 'Lengkap (T5)') return estStatus.toLowerCase().includes('t5');
        if (statusFilter === 'Drop Out') return estStatus === 'Drop Out';
        if (statusFilter === 'Mendekati Jadwal') return estStatus === 'Mendekati Jadwal';
        if (statusFilter === 'Sedang Dipantau') return estStatus === 'Sedang Dipantau';
        if (statusFilter === 'Belum Mulai') return estStatus === 'Belum Mulai';
        return true;
      });
    }

    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patients, user, selectedDesaFilter, searchQuery, statusFilter]);

  // Stats Counters
  const getStats = () => {
    const list = user && user.role === 'Desa' 
      ? patients.filter(p => p.desa.toLowerCase() === user.desa.toLowerCase())
      : patients;
      
    let total = list.length;
    let limitT5 = list.filter(p => calculateKeteranganStatus(p) === 'Lengkap (T5)').length;
    let dropOut = list.filter(p => calculateKeteranganStatus(p) === 'Drop Out').length;
    let mendekati = list.filter(p => calculateKeteranganStatus(p) === 'Mendekati Jadwal').length;
    let dipantau = list.filter(p => calculateKeteranganStatus(p) === 'Sedang Dipantau').length;
    
    return { total, limitT5, dropOut, mendekati, dipantau };
  };

  const stats = getStats();

  // Reset Form
  const resetFormState = () => {
    setFormNik('');
    setFormNama('');
    setFormDesa(user?.role === 'Desa' ? user.desa : 'Kabukarudi');
    setFormHp('');
    setFormHpht('');
    setFormTanggalRegistrasi(new Date().toISOString().split('T')[0]);
    setFormGravida('');
    setFormParitas('');
    setFormAbortus('');
    setFormJarakKelahiran('');
    
    // reset checkboxes
    setDosageTt1(false); setDateTt1('');
    setDosageTt2(false); setDateTt2('');
    setDosageTt3(false); setDateTt3('');
    setDosageTt4(false); setDateTt4('');
    setDosageTt5(false); setDateTt5('');
    
    setEditingPatient(null);
    setNikMatch('');
  };

  // Open Add Patient Form
  const openNewForm = () => {
    resetFormState();
    setIsFormOpen(true);
  };

  // Open Edit Patient Form
  const openEditForm = (p: Patient) => {
    setEditingPatient(p);
    setFormNik(p.nikIbu);
    setFormNama(p.namaLengkapIbu);
    setFormDesa(p.desa);
    setFormHp(p.nomorHp);
    setFormHpht(p.hpht || '');
    setFormTanggalRegistrasi(p.tanggalRegistrasi || new Date().toISOString().split('T')[0]);
    setFormGravida(p.gravida !== undefined ? p.gravida : '');
    setFormParitas(p.paritas !== undefined ? p.paritas : '');
    setFormAbortus(p.abortus !== undefined ? p.abortus : '');
    setFormJarakKelahiran(p.jarakKelahiran || '');
    
    setDosageTt1(p.tt1); setDateTt1(p.tanggalTt1 || '');
    setDosageTt2(p.tt2); setDateTt2(p.tanggalTt2 || '');
    setDosageTt3(p.tt3); setDateTt3(p.tanggalTt3 || '');
    setDosageTt4(p.tt4); setDateTt4(p.tanggalTt4 || '');
    setDosageTt5(p.tt5); setDateTt5(p.tanggalTt5 || '');

    setIsFormOpen(true);
  };

  // Handle Actual Saving of Patient
  const executeSavePatient = (draftPatient: Partial<Patient>, matchedDesa: string) => {
    let updatedList = [...patients];

    if (editingPatient) {
      // Edit mode
      updatedList = patients.map(p => {
        if (p.no === editingPatient.no) {
          return {
            ...p,
            ...draftPatient,
            keterangan: calculateKeteranganStatus(draftPatient)
          } as Patient;
        }
        return p;
      });
    } else {
      // Create or update by NIK
      const existing = patients.find(p => p.nikIbu === formNik);
      if (existing) {
        updatedList = patients.map(p => {
          if (p.nikIbu !== formNik) return p;
          return {
            ...p,
            ...draftPatient,
            no: p.no,
            tanggalRegistrasi: p.tanggalRegistrasi,
            keterangan: calculateKeteranganStatus(draftPatient),
          } as Patient;
        });
      } else {
        const nextNo = patients.length > 0 ? Math.max(...patients.map(p => p.no)) + 1 : 1;
        const newPatient: Patient = {
          no: nextNo,
          tanggalRegistrasi: formTanggalRegistrasi,
          nikIbu: formNik,
          namaLengkapIbu: formNama,
          desa: matchedDesa,
          nomorHp: formHp,
          hpht: formHpht,
          tt1: dosageTt1,
          tanggalTt1: dosageTt1 ? dateTt1 : '',
          tt2: dosageTt2,
          tanggalTt2: dosageTt2 ? dateTt2 : '',
          tt3: dosageTt3,
          tanggalTt3: dosageTt3 ? dateTt3 : '',
          tt4: dosageTt4,
          tanggalTt4: dosageTt4 ? dateTt4 : '',
          tt5: dosageTt5,
          tanggalTt5: dosageTt5 ? dateTt5 : '',
          keterangan: calculateKeteranganStatus(draftPatient),
          gravida: formGravida === '' ? undefined : Number(formGravida),
          paritas: formParitas === '' ? undefined : Number(formParitas),
          abortus: formAbortus === '' ? undefined : Number(formAbortus),
          jarakKelahiran: formJarakKelahiran,
        };
        updatedList.push(newPatient);
      }
    }

    updatePatientsInStorage(updatedList);
    setIsFormOpen(false);
    resetFormState();
  };

  // Handle Form Submission
  const savePatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama || !formNik) {
      alert('Nama Ibu Hamil dan NIK Ibu wajib diisi!');
      return;
    }

    if (formNik.length !== 16) {
      alert('NIK Ibu Hamil harus tepat 16 digit!');
      return;
    }

    const matchedDesa = user?.role === 'Desa' ? user.desa : formDesa;

    // Build the updated object draft
    const draftPatient: Partial<Patient> = {
      nikIbu: formNik,
      namaLengkapIbu: formNama,
      desa: matchedDesa,
      nomorHp: formHp,
      hpht: formHpht,
      tanggalRegistrasi: formTanggalRegistrasi,
      tt1: dosageTt1,
      tanggalTt1: dosageTt1 ? dateTt1 : '',
      tt2: dosageTt2,
      tanggalTt2: dosageTt2 ? dateTt2 : '',
      tt3: dosageTt3,
      tanggalTt3: dosageTt3 ? dateTt3 : '',
      tt4: dosageTt4,
      tanggalTt4: dosageTt4 ? dateTt4 : '',
      tt5: dosageTt5,
      tanggalTt5: dosageTt5 ? dateTt5 : '',
      gravida: formGravida === '' ? undefined : Number(formGravida),
      paritas: formParitas === '' ? undefined : Number(formParitas),
      abortus: formAbortus === '' ? undefined : Number(formAbortus),
      jarakKelahiran: formJarakKelahiran,
    };

    setConfirmDialog({
      isOpen: true,
      title: editingPatient ? 'Konfirmasi Simpan Perubahan' : 'Konfirmasi Pendaftaran Baru',
      message: `Apakah Anda yakin ingin ${editingPatient ? `memperbarui rekam data Ibu ${formNama}` : `mendaftarkan Ibu ${formNama} baru`} ke dalam basis data SMART TT? Seluruh jadwal tindak lanjut dan laporan cakupan wilayah akan diperbaharui otomatis.`,
      confirmText: editingPatient ? 'Ya, Perbarui' : 'Ya, Daftarkan',
      cancelText: 'Periksa Kembali',
      type: 'success',
      onConfirm: () => {
        executeSavePatient(draftPatient, matchedDesa);
      }
    });
  };

  // Open Send Whatsapp Modal
  const requestWhatsappModal = (p: Patient) => {
    setActiveWhatsappModal(p);
    
    // Automatically generate pre-filled text depending on the missed doses and schedule status
    const info = getPatientScheduleInfo(p);
    let nextScheduled = info.nextDose || 'Suntikan TT Berikutnya';
    let prevAntigen = info.prevAntigen || 'dosis terakhir';
    let prevDate = info.prevDateStr || '-';

    let messageText = '';
    if (info.statusText === 'Mendekati Jadwal') {
      messageText = `Selamat siang Ibu ${p.namaLengkapIbu} di Desa ${p.desa}. Kami dari Puskesmas Kabukarudi ingin mengingatkan bahwa waktu imunisasi Anda untuk ${nextScheduled} akan segera tiba pada tanggal ${info.dueDateStr} (${info.daysRemaining} hari lagi). Demi perlindungan optimal Ibu dan bayi tercinta dari bahaya infeksi Tetanus, mohon berkenan mengunjungi Bidan terdekat pada tanggal tersebut untuk mendapatkan pelayanan imunisasi TT secara tepat waktu. Terima kasih banyak atas perhatian Ibu. Salam Sehat.`;
    } else {
      messageText = `Yth. Ibu ${p.namaLengkapIbu} di Desa ${p.desa}. Kami dari Puskesmas Kabukarudi menginfokan bahwa waktu imunisasi Anda untuk ${nextScheduled} telah melewati rentang waktu minimal yang direkomendasikan sejak dosis terakhir ${prevAntigen} tanggal ${prevDate}. Demi kesehatan ibu dan bayi dari bahaya infeksi Tetanus Neonatorum, mohon segera mengunjungi Bidan terdekat untuk melengkapi dosis Anda. Terima kasih.`;
    }
    
    setCustomMsg(messageText);
  };

  // Simulate Sending WhatsApp
  const executeSendWhatsApp = () => {
    if (!activeWhatsappModal) return;
    setIsSendingWa(true);
    
    setTimeout(() => {
      const newLog: WhatsappLog = {
        id: 'wl-' + Math.floor(Math.random() * 1000000),
        nikIbu: activeWhatsappModal.nikIbu,
        namaLengkapIbu: activeWhatsappModal.namaLengkapIbu,
        nomorHp: activeWhatsappModal.nomorHp || '08xxxxxxxx',
        desa: activeWhatsappModal.desa,
        pesan: customMsg,
        tanggalKirim: new Date().toLocaleString('id-ID'),
        status: 'Terkirim via Gateway'
      };

      const updatedLogs = saveWhatsappLog(newLog, whatsappLogs);
      setWhatsappLogs(updatedLogs);
      setPendingSync(hasPendingSync());

      setIsSendingWa(false);
      setActiveWhatsappModal(null);
      alert(`Pesan WhatsApp Pengingat berhasil dikirim kepada Ibu ${newLog.namaLengkapIbu} (Nomor: ${newLog.nomorHp})`);
    }, 1500);
  };

  // Export PDF Report Generator
  const generatePdfReport = () => {
    const doc = new jsPDF();
    const activeDesaStr = user?.role === 'Desa' ? user.desa : selectedDesaFilter;
    
    // Page 1: Main aggregate monitoring report
    doc.setFontSize(14);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('PEMERINTAH KABUPATEN SUMBA BARAT', 105, 15, { align: 'center' });
    doc.setFontSize(15);
    doc.text('DINAS KESEHATAN - UPTD PUSKESMAS KABUKARUDI', 105, 22, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Alamat: Sumba Barat, Nusa Tenggara Timur - Indonesia. Telepon: (0387) Kode Pos 87214', 105, 28, { align: 'center' });
    
    doc.setLineWidth(0.8);
    doc.setDrawColor(13, 148, 136); // Teal border line
    doc.line(15, 31, 195, 31);
    
    // Sheet Title
    doc.setFontSize(12);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`LAPORAN PERIODIK MONITORING IMUNISASI TETANUS TOXOID (TT) BUMIL`, 105, 40, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Cakupan Wilayah: Desa ${activeDesaStr === 'Semua' ? 'Semua Desa (Lingkup Puskesmas)' : activeDesaStr}`, 105, 46, { align: 'center' });
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} | Petugas: ${user?.namaLengkap || 'Bidan Puskesmas'}`, 105, 52, { align: 'center' });

    // Summary Statistics Block
    doc.setFillColor(241, 245, 249);
    doc.rect(15, 58, 180, 15, 'F');
    doc.setFontSize(9.5);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Total Bumil: ${stats.total}`, 20, 67);
    doc.text(`Dipantau: ${stats.dipantau}`, 58, 67);
    doc.text(`Mendekati: ${stats.mendekati}`, 98, 67);
    doc.text(`Drop Out: ${stats.dropOut}`, 138, 67);
    doc.text(`Lengkap: ${stats.limitT5}`, 172, 67);

    // List Table Rows
    const tableBody = filteredPatients.map((p, index) => [
      index + 1,
      p.namaLengkapIbu,
      p.nikIbu,
      p.desa,
      `G${p.gravida ?? '-'} P${p.paritas ?? '-'} A${p.abortus ?? '-'}`,
      p.jarakKelahiran || '-',
      p.nomorHp || '-',
      p.tt1 ? 'Y' : 'N',
      p.tt2 ? 'Y' : 'N',
      p.tt3 ? 'Y' : 'N',
      p.tt4 ? 'Y' : 'N',
      p.tt5 ? 'Y' : 'N',
      calculateKeteranganStatus(p)
    ]);

    autoTable(doc, {
      startY: 78,
      head: [['No', 'Nama Ibu Hamil', 'NIK', 'Desa', 'G-P-A', 'Jarak L.', 'No HP', 'TT1', 'TT2', 'TT3', 'TT4', 'TT5', 'Keterangan']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [13, 148, 136], fontSize: 7.5 },
      styles: { fontSize: 7.5, cellPadding: 1.5, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 6 },
        1: { cellWidth: 24 },
        2: { cellWidth: 22 },
        3: { cellWidth: 16 },
        4: { cellWidth: 13 },
        5: { cellWidth: 13 },
        6: { cellWidth: 18 },
        7: { cellWidth: 8 },
        8: { cellWidth: 8 },
        9: { cellWidth: 8 },
        10: { cellWidth: 8 },
        11: { cellWidth: 8 },
        12: { cellWidth: 38 }
      }
    });

    // Signature on Page 1
    const finalY = (doc as any).lastAutoTable.finalY + 12;
    if (finalY < 255) {
      doc.setFontSize(9.5);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text('Mengetahui,', 140, finalY);
      doc.text('Kepala Puskesmas Kabukarudi,', 140, finalY + 5);
      doc.text('__________________________', 140, finalY + 25);
    }

    // Additional Pages: Individual Immunization History Record Card for Each Patient
    filteredPatients.forEach((p) => {
      doc.addPage();
      
      // Page Border / Card Container Outline
      doc.setDrawColor(203, 213, 225); // Slate-300
      doc.setLineWidth(0.5);
      doc.rect(10, 10, 190, 277);
      
      // Card Header Banner Accent
      doc.setFillColor(13, 148, 136); // Teal-600
      doc.rect(10, 10, 190, 18, 'F');
      
      doc.setFontSize(11);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('KARTU PEMANTAUAN RIWAYAT IMUNISASI TETANUS TOXOID (TT) MATERNAL', 105, 21, { align: 'center' });
      
      // Subtitle
      doc.setFontSize(8.5);
      doc.setFont('Helvetica', 'normal');
      doc.text('UPTD Puskesmas kabukarudi - Kabupaten Sumba Barat', 105, 25, { align: 'center' });
      
      // Reset Default Text Color to Slate-800
      doc.setTextColor(30, 41, 59);
      
      // Section A: IDENTITAS IBU HAMIL
      doc.setFontSize(11);
      doc.setFont('Helvetica', 'bold');
      doc.text('A. IDENTITAS IBU HAMIL', 15, 38);
      doc.setDrawColor(226, 232, 240); // Slate-200
      doc.line(15, 41, 195, 41);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Nama Lengkap Ibu', 20, 49);
      doc.text(':', 62, 49);
      doc.setFont('Helvetica', 'bold');
      doc.text(p.namaLengkapIbu, 67, 49);
      doc.setFont('Helvetica', 'normal');
      
      doc.text('Nomor NIK Ibu', 20, 57);
      doc.text(':', 62, 57);
      doc.setFont('Helvetica', 'bold');
      doc.text(p.nikIbu, 67, 57);
      doc.setFont('Helvetica', 'normal');
      
      doc.text('Desa Domisili', 20, 65);
      doc.text(':', 62, 65);
      doc.text(`Desa ${p.desa}`, 67, 65);
      
      doc.text('No. HP / WhatsApp', 20, 73);
      doc.text(':', 62, 73);
      doc.text(p.nomorHp || 'Tidak Ada / -', 67, 73);
      
      doc.text('Tanggal Registrasi', 20, 81);
      doc.text(':', 62, 81);
      doc.text(p.tanggalRegistrasi ? new Date(p.tanggalRegistrasi).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-', 67, 81);
      
      // Section B: INFORMASI KLINIS & OBSTETRI
      doc.setFontSize(11);
      doc.setFont('Helvetica', 'bold');
      doc.text('B. INFORMASI KLINIS & OBSTETRI', 15, 93);
      doc.line(15, 96, 195, 96);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Status Kehamilan (GPA) :  G${p.gravida ?? '-'} P${p.paritas ?? '-'} A${p.abortus ?? '-'}`, 20, 104);
      doc.text(`Jarak Kelahiran Terakhir :  ${p.jarakKelahiran || 'Anak Pertama / -'}`, 20, 112);
      
      const hplStr = (() => {
        if (!p.hpht) return '-';
        const d = new Date(p.hpht);
        if (isNaN(d.getTime())) return '-';
        d.setDate(d.getDate() + 7);
        d.setMonth(d.getMonth() + 9);
        return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
      })();
      doc.text(`Hari Pertama Haid Terakhir (HPHT):  ${p.hpht || '-'}`, 20, 120);
      doc.text(`Taksiran Persalinan (Estimasi HPL):  ${hplStr}`, 20, 128);
      
      // Section C: CATATAN RIWAYAT SUNTIKAN IMUNISASI TT
      doc.setFontSize(11);
      doc.setFont('Helvetica', 'bold');
      doc.text('C. CATATAN DOSIS IMUNISASI TETANUS TOXOID', 15, 142);
      doc.line(15, 145, 195, 145);
      
      const cardTableBody = [
        ['Dosis TT1', p.tt1 ? 'SUDAH SUNTIK' : 'BELUM IMUNISASI', p.tanggalTt1 || '-', 'Langkah pertama pendaftaran rekam hamil'],
        ['Dosis TT2', p.tt2 ? 'SUDAH SUNTIK' : 'BELUM IMUNISASI', p.tanggalTt2 || '-', 'Minimal 4 Minggu setelah TT1'],
        ['Dosis TT3', p.tt3 ? 'SUDAH SUNTIK' : 'BELUM IMUNISASI', p.tanggalTt3 || '-', 'Minimal 6 Bulan setelah TT2'],
        ['Dosis TT4', p.tt4 ? 'SUDAH SUNTIK' : 'BELUM IMUNISASI', p.tanggalTt4 || '-', 'Minimal 1 Tahun setelah TT3'],
        ['Dosis TT5', p.tt5 ? 'SUDAH SUNTIK' : 'BELUM IMUNISASI', p.tanggalTt5 || '-', 'Minimal 1 Tahun setelah TT4'],
      ];

      autoTable(doc, {
        startY: 149,
        head: [['Dosis Vaksin', 'Status Verifikasi', 'Tanggal Pemberian', 'Standar Selang Interval Minimal']],
        body: cardTableBody,
        theme: 'grid',
        margin: { left: 15, right: 15 },
        headStyles: { fillColor: [71, 85, 105], fontSize: 9 },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 32, fontStyle: 'bold' },
          1: { cellWidth: 42, fontStyle: 'bold' },
          2: { cellWidth: 42 },
          3: { cellWidth: 64 }
        },
        didParseCell: (data) => {
          if (data.row.index >= 0 && data.column.index === 1) {
            const text = data.cell.text[0];
            if (text === 'SUDAH SUNTIK') {
              data.cell.styles.textColor = [16, 124, 65]; // Green text
            } else {
              data.cell.styles.textColor = [185, 28, 28]; // Red text
            }
          }
        }
      });

      // Section D: KESIMPULAN CAKUPAN & TINDAK LANJUT
      const tableFinalY = (doc as any).lastAutoTable.finalY || 210;
      
      doc.setFontSize(11);
      doc.setFont('Helvetica', 'bold');
      doc.text('D. KESIMPULAN CAKUPAN & TINDAK LANJUT', 15, tableFinalY + 12);
      doc.line(15, tableFinalY + 15, 195, tableFinalY + 15);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      const pStatus = calculateKeteranganStatus(p);
      doc.text('Status Cakupan Pemantauan:', 20, tableFinalY + 23);
      
      doc.setFont('Helvetica', 'bold');
      doc.text(pStatus, 72, tableFinalY + 23);
      doc.setFont('Helvetica', 'normal');

      let recommendation = 'Tindak lanjut rutin. Ibu Hamil disarankan mengunjungi faskes terdekat untuk melengkapi cakupan proteksi TT.';
      if (pStatus === 'Lengkap (T5)') {
        recommendation = 'LENGKAP (T5 booster): Perlindungan optimal hingga 25 Tahun / Seumur Hidup terhadap bahaya Tetanus Neonatorum berhasil ditegakkan!';
      } else if (pStatus === 'Drop Out') {
        recommendation = 'WARNING DROP OUT: Masa interval dosis berikutnya telah terlambat. Segera hubungi Ibu Hamil untuk imunisasi ulang!';
      } else if (pStatus === 'Sedang Dipantau') {
        recommendation = 'DALAM PEMANTAUAN AKTIF: Jadwal imunisasi berikutnya sedang berjalan lancar. Pastikan kontrol sesuai dengan masa tenggang interval.';
      }

      doc.text('Rekomendasi Medis Bidan:', 20, tableFinalY + 31);
      doc.setFont('Helvetica', 'oblique');
      doc.text(recommendation, 67, tableFinalY + 31, { maxWidth: 125 });
      doc.setFont('Helvetica', 'normal');

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Cetak Kartu: ${new Date().toLocaleDateString('id-ID')} | UPTD Puskesmas Kabukarudi Sumba Barat`, 15, tableFinalY + 52);
      
      doc.setTextColor(30, 41, 59);
      doc.text('Petugas Bidan Koordinator,', 145, tableFinalY + 52);
      doc.text('( ______________________ )', 145, tableFinalY + 72);
    });

    doc.save(`Laporan_SMART_TT_Kabukarudi_${activeDesaStr.replace(/\s+/g, '_')}.pdf`);
  };

  const getAgeFromNik = (nik: string): number => {
    if (!nik || nik.length < 12) return 0;
    try {
      let day = parseInt(nik.substring(6, 8), 10);
      const month = parseInt(nik.substring(8, 10), 10) - 1;
      let year = parseInt(nik.substring(10, 12), 10);
      if (day > 40) day = day - 40;
      const curYear = new Date().getFullYear();
      const fullYear = year > (curYear % 100) ? 1900 + year : 2000 + year;
      const birth = new Date(fullYear, month, day);
      if (isNaN(birth.getTime())) return 0;
      let age = curYear - birth.getFullYear();
      const mDiff = new Date().getMonth() - birth.getMonth();
      if (mDiff < 0 || (mDiff === 0 && new Date().getDate() < birth.getDate())) age--;
      return age;
    } catch { return 0; }
  };

  const getCurrentTtDose = (p: Patient): string => {
    if (p.tt5) return 'TT5';
    if (p.tt4) return 'TT4';
    if (p.tt3) return 'TT3';
    if (p.tt2) return 'TT2';
    if (p.tt1) return 'TT1';
    return 'Belum';
  };

  const getLastTtDate = (p: Patient): string => {
    if (p.tanggalTt5) return p.tanggalTt5;
    if (p.tanggalTt4) return p.tanggalTt4;
    if (p.tanggalTt3) return p.tanggalTt3;
    if (p.tanggalTt2) return p.tanggalTt2;
    if (p.tanggalTt1) return p.tanggalTt1;
    return '-';
  };

  const getNextTtDate = (p: Patient): string => {
    const addDate = (dateStr: string, days: number): string => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      d.setDate(d.getDate() + days);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };
    if (!p.tt1) return addDate(new Date().toISOString().split('T')[0], 0);
    if (!p.tt2 && p.tanggalTt1) return addDate(p.tanggalTt1, 28);
    if (!p.tt3 && p.tanggalTt2) return addDate(p.tanggalTt2, 180);
    if (!p.tt4 && p.tanggalTt3) return addDate(p.tanggalTt3, 365);
    if (!p.tt5 && p.tanggalTt4) return addDate(p.tanggalTt4, 365);
    if (p.tt5) return 'Lengkap';
    return '-';
  };

  const getTindakLanjut = (p: Patient): string => {
    if (getCurrentTtDose(p) === 'Lengkap') return '-';
    const nxt = getNextTtDate(p);
    if (nxt === '-' || nxt === 'Lengkap') return '-';
    const parts = nxt.split(' ');
    if (parts.length < 3) return '-';
    const monthMap: Record<string, number> = { 'Jan':0,'Feb':1,'Mar':2,'Apr':3,'Mei':4,'Jun':5,'Jul':6,'Agu':7,'Sep':8,'Okt':9,'Nov':10,'Des':11 };
    const d = new Date(parseInt(parts[2]), monthMap[parts[1]] || 0, parseInt(parts[0]));
    if (isNaN(d.getTime())) return '-';
    if (d >= new Date()) return '-';
    return getCurrentTtDose(p) === 'Belum' ? 'Hubungi Via Whatsapp' : 'Pengulangan Dosis';
  };

  const exportLacarPdf = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const rows = patients.filter(p => VILLAGES.includes(p.desa)).map(p => [
      p.namaLengkapIbu, p.nikIbu, getAgeFromNik(p.nikIbu), p.desa,
      p.hpht || '-', p.gravida ?? '-', p.paritas ?? '-', p.abortus ?? '-',
      getCurrentTtDose(p), getLastTtDate(p), getNextTtDate(p), p.tindakLanjut || '-', p.keterangan || '-'
    ]);
    autoTable(doc, {
      head: [['Nama Ibu Hamil', 'NIK', 'Umur', 'Desa', 'HPHT', 'G', 'P', 'A', 'Status TT', 'TT Terakhir', 'TT Berikutnya', 'Tindak Lanjut', 'Keterangan']],
      body: rows,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [13, 148, 136], fontSize: 9, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 46 }, 1: { cellWidth: 38 }, 2: { cellWidth: 13 }, 3: { cellWidth: 26 },
        4: { cellWidth: 22 }, 5: { cellWidth: 9 }, 6: { cellWidth: 9 }, 7: { cellWidth: 9 },
        8: { cellWidth: 18 }, 9: { cellWidth: 22 }, 10: { cellWidth: 24 }, 11: { cellWidth: 26 }, 12: { cellWidth: 26 }
      },
      margin: { top: 10, right: 5, bottom: 10, left: 5 },
    });
    doc.save('Lembar_Lacak_TT.pdf');
  };

  const exportLacarExcel = () => {
    const rows = patients.filter(p => VILLAGES.includes(p.desa)).map(p => ({
      'Nama Ibu Hamil': p.namaLengkapIbu,
      'NIK': p.nikIbu,
      'Umur': getAgeFromNik(p.nikIbu),
      'Desa': p.desa,
      'HPHT': p.hpht || '-',
      'G': p.gravida ?? '-',
      'P': p.paritas ?? '-',
      'A': p.abortus ?? '-',
      'Status TT': getCurrentTtDose(p),
      'TT Terakhir': getLastTtDate(p),
      'TT Berikutnya': getNextTtDate(p),
      'Tindak Lanjut': p.tindakLanjut || '-',
      'Keterangan': p.keterangan || '-',
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Lembar Lacak');
    XLSX.writeFile(wb, 'Lembar_Lacak_TT.xlsx');
  };

  // Mock auto-copy script helpers
  const handleCopy = (codeText: string, key: 'gs' | 'html' | 'sheet') => {
    navigator.clipboard.writeText(codeText);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Google Sheets Apps Script Template Codes
  const codeGsText = `/**
 * =========================================================================
 * GOOGLE APS SCRIPT (Code.gs) - BACKEND DATABASE & ENDPOINTS
 * SISTEM SMART TT PUSKESMAS KABUKARUDI, SUMBA BARAT
 * =========================================================================
 */

const SPREADSHEET_ID = "MASUKKAN_SPREADSHEET_ID_ANDA_DISINI";

// Buka index.html utama
function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('SMART TT Puskesmas Kabukarudi')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Handler include file HTML bagian-bagian (opsional)
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// 1. FUNGSI AUTHENTIKASI & CHECK KREDENSIAL
function checkLogin(username, password) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Akun');
    const data = sheet.getDataRange().getValues();
    
    // Cari Baris Kredensial (Username ada di Col 0, Password di Col 1)
    for(let i = 1; i < data.length; i++) {
      if(data[i][0].toString().toLowerCase() === username.toLowerCase() && data[i][1].toString() === password) {
        return {
          success: true,
          username: data[i][0],
          role: data[i][2],       // "Puskesmas" atau "Desa"
          desa: data[i][3],       // Nama Desa spesifik
          namaLengkap: data[i][4] || "User " + data[i][3]
        };
      }
    }
    return { success: false, message: "Kredensial tidak cocok" };
  } catch (err) {
    return { success: false, message: "Gagal menghubungkan Spreadsheet database: " + err.message };
  }
}

// 2. FUNGSI AMBIL TAMPILAN DATA - TERPROTEKSI HAK AKSES SISTEM DI BACKEND
function getPatientsData(role, userDesa) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('DataTT');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    const results = [];
    
    for(let i = 1; i < data.length; i++) {
      const row = data[i];
      const patientDesa = row[4]; 
      
      // LOGIKA KEAMANAN BACKEND: Filter data sesuai wilayah tanggung jawab (Desa)
      if(role === 'Desa' && patientDesa.toLowerCase() !== userDesa.toLowerCase()) {
        continue; // Saring keluar record milih desa lain, cegah kebocoran data
      }
      
      results.push({
        no: row[0],
        tanggalRegistrasi: formatDate(row[1]),
        nikIbu: row[2].toString(),
        namaLengkapIbu: row[3],
        desa: row[4],
        nomorHp: row[5].toString(),
        hpht: formatDate(row[6]),
        tt1: row[7] === true || row[7] === "TRUE" || row[7].toString().toLowerCase() === "ya",
        tanggalTt1: formatDate(row[8]),
        tt2: row[9] === true || row[9] === "TRUE" || row[9].toString().toLowerCase() === "ya",
        tanggalTt2: formatDate(row[10]),
        tt3: row[11] === true || row[11] === "TRUE" || row[11].toString().toLowerCase() === "ya",
        tanggalTt3: formatDate(row[12]),
        tt4: row[13] === true || row[13] === "TRUE" || row[13].toString().toLowerCase() === "ya",
        tanggalTt4: formatDate(row[14]),
        tt5: row[15] === true || row[15] === "TRUE" || row[15].toString().toLowerCase() === "ya",
        tanggalTt5: formatDate(row[16]),
        keterangan: row[17],
        gravida: row[18] !== undefined && row[18] !== "" ? Number(row[18]) : undefined,
        paritas: row[19] !== undefined && row[19] !== "" ? Number(row[19]) : undefined,
        abortus: row[20] !== undefined && row[20] !== "" ? Number(row[20]) : undefined,
        jarakKelahiran: row[21] !== undefined ? row[21].toString() : ""
      });
    }
    return { success: true, count: results.length, data: results };
  } catch (err) {
    return { success: false, message: "Gagal menarik data: " + err.message };
  }
}

// Helper Format Tanggal aman untuk JavaScript frontend
function formatDate(dateVal) {
  if (!dateVal) return "";
  if (dateVal instanceof Date) {
    return Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return dateVal.toString();
}

// 3. SEED SAVE ATAU EDIT UPDATE IBU HAMIL (TERALIRI AKSES AMAN)
function saveOrUpdatePatient(patientObj, userRole, userDesa) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('DataTT');
    const data = sheet.getRange("A:C").getValues(); // Mengunci kunci unik NIK
    
    // Validasi Hak Akses Tambahan
    if (userRole === "Desa") {
      patientObj.desa = userDesa; // Paksa inputan desa ke wilayah bidan itu sendiri, cegah spoofing
    }
    
    let rowIndex = -1;
    for(let i = 1; i < data.length; i++) {
      if(data[i][2] && data[i][2].toString() === patientObj.nikIbu.toString()) {
        rowIndex = i + 1; // temukan baris index untuk update yang sudah ada
        break;
      }
    }
    
    const rowValues = [
      rowIndex !== -1 ? rowIndex - 1 : sheet.getLastRow(), // NO
      patientObj.tanggalRegistrasi,
      "'" + patientObj.nikIbu, // NIK String Format
      patientObj.namaLengkapIbu,
      patientObj.desa,
      "'" + patientObj.nomorHp,
      patientObj.hpht,
      patientObj.tt1,
      patientObj.tanggalTt1,
      patientObj.tt2,
      patientObj.tanggalTt2,
      patientObj.tt3,
      patientObj.tanggalTt3,
      patientObj.tt4,
      patientObj.tanggalTt4,
      patientObj.tt5,
      patientObj.tanggalTt5,
      patientObj.keterangan,
      patientObj.gravida !== undefined ? patientObj.gravida : "",
      patientObj.paritas !== undefined ? patientObj.paritas : "",
      patientObj.abortus !== undefined ? patientObj.abortus : "",
      patientObj.jarakKelahiran || ""
    ];
    
    if(rowIndex !== -1) {
      // Update
      sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
      return { success: true, message: "Data Ibu Hamil " + patientObj.namaLengkapIbu + " berhasil diperbarui!" };
    } else {
      // Baris Baru
      sheet.appendRow(rowValues);
      return { success: true, message: "Pendaftaran Ibu Hamil baru berhasil tersimpan!" };
    }
  } catch(err) {
    return { success: false, message: "Gagal menyimpan data: " + err.message };
  }
}

// 4. MOCK WHATSAPP NOTIFIER VIA SHEETS INTEGRATED API (FONE INTEGRATOR / FONTE/WABLAS)
function requestWhatsAppExpress(nomorHp, pesan) {
  try {
    // Fungsi ini bisa dihubungkan ke penyedia gateway WA seperti Fonte, WABlas, Twilio dll.
    // Contoh integrasi opsional dengan api eksternal:
    // UrlFetchApp.fetch("https://api.gatewaywa.com/send", { ... });
    
    Logger.log("Mengirim WhatsApp ke: " + nomorHp + " | Pesan: " + pesan);
    return { success: true, message: "Pengingat terjadwal via server berhasil dikirim!" };
  } catch(e) {
    return { success: false, message: e.message };
  }
}`;

  const codeHtmlText = `<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <!-- Tailwind CSS & CDN Integrasi -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Chart.js via CDN untuk visualisasi -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
  <title>SMART TT Puskesmas Kabukarudi</title>
</head>
<body class="bg-gray-50 font-sans text-gray-800">
  <!-- Aplikasi web di-render client-side di sini layaknya Single Page Application (SPA) -->
  <div id="app" class="min-h-screen flex flex-col pb-16 md:pb-0">
     <!-- Script script JS dinamis dimasukkan di sini untuk sinkronisasi -->
     <p class="text-center p-8 text-teal-600">Silahkan buka dan salin berkas ini ke Project Google Apps Script Anda!</p>
  </div>
</body>
</html>`;

  return (
    <div id="full-app-root" className={`min-h-screen bg-slate-50 text-slate-900 antialiased font-sans ${user ? 'flex flex-col md:flex-row w-full overflow-hidden h-screen' : 'flex flex-col'}`}>
      
      {/* MOBILE TOP HEADER */}
      {user && (
        <header className="md:hidden h-14 bg-slate-900 text-white px-4 flex items-center justify-between z-40 shrink-0 select-none">
          <div className="flex items-center gap-2">
              <img src="/logo_smart_tt.png" alt="SMART TT" className="w-8 h-8 object-contain" />
            <div>
              <h1 className="font-black text-xs tracking-wider">SMART TT</h1>
              <p className="text-[8px] text-slate-400">UPTD KABUKARUDI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOffline && (
              <span className="text-[9px] bg-red-950 text-red-400 px-2 py-0.5 rounded-full font-bold animate-pulse">
                📴 Offline
              </span>
            )}
            {!isOffline && pendingSync && (
              <span className="text-[9px] bg-yellow-950 text-yellow-400 px-2 py-0.5 rounded-full font-bold animate-pulse">
                ⏳ Menyinkron...
              </span>
            )}
            <span className="text-[9px] bg-sky-950 text-sky-400 px-2 py-0.5 rounded-full font-bold">
              {user.role === 'Puskesmas' ? '🏥 Puskesmas' : `🏡 ${user.desa}`}
            </span>
            <button 
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg"
              title="Keluar"
            >
              <LogOut size={14} />
            </button>
          </div>
        </header>
      )}

      {/* DESKTOP SIDEBAR NAVIGATION */}
      {user && (
        <aside className="w-64 bg-slate-900 flex flex-col text-white shrink-0 hidden md:flex h-full select-none border-r border-slate-950">
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <img src="/logo_smart_tt.png" alt="SMART TT" className="w-10 h-10 object-contain" />
              <div>
                <h1 className="text-sm font-black leading-tight tracking-wider uppercase text-slate-100">SMART TT</h1>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">KABUKARUDI, SUMBA BARAT</p>
              </div>
            </div>
          </div>
          
          <nav className="flex-1 py-6">
            <ul className="space-y-1">
              <li 
                onClick={() => setActiveTab('beranda')}
                className={`px-6 py-3.5 flex items-center gap-4 cursor-pointer transition-all ${activeTab === 'beranda' ? 'bg-sky-600/10 border-l-4 border-sky-500 text-sky-400 font-extrabold' : 'hover:bg-slate-800/60 hover:text-slate-200 text-slate-400'}`}
              >
                <TrendingUp size={18} />
                <span className="font-semibold text-xs uppercase tracking-wider">Dasbor Utama</span>
              </li>
              <li 
                onClick={() => setActiveTab('input')}
                className={`px-6 py-3.5 flex items-center gap-4 cursor-pointer transition-all ${activeTab === 'input' ? 'bg-sky-600/10 border-l-4 border-sky-500 text-sky-400 font-extrabold' : 'hover:bg-slate-800/60 hover:text-slate-200 text-slate-400'}`}
              >
                <FileText size={18} />
                <span className="font-semibold text-xs uppercase tracking-wider">Input Data TT</span>
              </li>
              <li 
                onClick={() => setActiveTab('lacar')}
                className={`px-6 py-3.5 flex items-center gap-4 cursor-pointer transition-all relative ${activeTab === 'lacar' ? 'bg-sky-600/10 border-l-4 border-sky-500 text-sky-400 font-extrabold' : 'hover:bg-slate-800/60 hover:text-slate-200 text-slate-400'}`}
              >
                <ShieldAlert size={18} className={activeTab === 'lacar' ? 'text-sky-400' : (stats.dropOut > 0 ? 'text-red-400' : 'text-slate-400')} />
                <span className={`font-semibold text-xs uppercase tracking-wider flex items-center justify-between w-full ${activeTab === 'lacar' ? 'text-sky-400' : (stats.dropOut > 0 ? 'text-red-400' : 'text-slate-400')}`}>
                  <span>Lacak & Lembar Lacak</span>
                  {stats.dropOut > 0 && activeTab !== 'lacar' && (
                    <span className="px-2 py-0.5 text-[10px] bg-red-600 text-white font-extrabold rounded-full animate-pulse">{stats.dropOut}</span>
                  )}
                </span>
              </li>
              <li 
                onClick={() => setActiveTab('interval')}
                className={`px-6 py-3.5 flex items-center gap-4 cursor-pointer transition-all ${activeTab === 'interval' ? 'bg-sky-600/10 border-l-4 border-sky-500 text-sky-400 font-extrabold' : 'hover:bg-slate-800/60 hover:text-slate-200 text-slate-400'}`}
              >
                <Info size={18} />
                <span className="font-semibold text-xs uppercase tracking-wider">Jadwal Pengingat</span>
              </li>

              {user.role === 'Puskesmas' && (
                <li 
                  onClick={() => setActiveTab('accounts')}
                  className={`px-6 py-3.5 flex items-center gap-4 cursor-pointer transition-all ${activeTab === 'accounts' ? 'bg-sky-600/10 border-l-4 border-sky-500 text-sky-400 font-extrabold' : 'hover:bg-slate-800/60 hover:text-slate-200 text-slate-400'}`}
                >
                  <Users size={18} />
                  <span className="font-semibold text-xs uppercase tracking-wider">Kelola Akun Desa</span>
                </li>
              )}
            </ul>
          </nav>

          <div className="p-6 bg-slate-950 mt-auto flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-750 flex items-center justify-center text-xs font-black text-slate-300">
                {user.namaLengkap.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-200 truncate">{user.namaLengkap}</p>
                <p className="text-[10px] text-emerald-400 font-bold truncate">Akses {user.role === 'Puskesmas' ? 'Puskesmas' : `Desa ${user.desa}`}</p>
              </div>
            </div>
            {isOffline && (
              <div className="text-[10px] bg-red-950 text-red-400 px-3 py-1.5 rounded-lg font-bold text-center animate-pulse">
                📴 Mode Offline — Data tersimpan lokal
              </div>
            )}
            {!isOffline && pendingSync && (
              <div className="text-[10px] bg-yellow-950 text-yellow-400 px-3 py-1.5 rounded-lg font-bold text-center animate-pulse">
                ⏳ Menyinkron data ke server...
              </div>
            )}
            {!isOffline && !pendingSync && (
              <div className="text-[10px] bg-emerald-950 text-emerald-500 px-3 py-1.5 rounded-lg font-bold text-center">
                ✓ Tersinkron dengan Database
              </div>
            )}
            <button 
              onClick={handleLogout}
              className="w-full py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 transition-colors text-white text-[11px] font-black rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut size={12} />
              <span>LOGOUT SYSTEM</span>
            </button>
          </div>
        </aside>
      )}

      {/* LANDING / MICROSITE PAGE IF NOT AUTHENTICATED */}
      {!user ? (
        showLandingPage ? (
          <main className="flex-grow flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden bg-cover bg-center min-h-screen" style={{ backgroundImage: `linear-gradient(rgba(15, 118, 110, 0.95), rgba(2, 44, 34, 0.99)), url('https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&q=80')` }}>
            
            <div className="w-full max-w-lg mx-auto text-center space-y-8 relative z-10">
              
              {/* Top Header Banner */}
              <img src="/top_header.png" alt="" className="w-full max-w-md mx-auto rounded-2xl shadow-lg mb-2" />

              {/* Logo & Title */}
              <div className="space-y-3">
                <img src="/logo_smart_tt.png" alt="SMART TT" className="w-20 h-20 object-contain mx-auto" />
                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-sm">
                  SMART TT
                </h1>
                <p className="text-sm font-medium text-teal-200/80 max-w-sm mx-auto leading-relaxed">
                  Sistem Monitoring dan Tracking Imunisasi Tetanus Toxoid Ibu Hamil<br />
                  UPTD Puskesmas Kabukarudi, Sumba Barat, NTT
                </p>
              </div>

              {/* Three Menu Cards */}
              <div className="grid gap-4 pt-4">
                <button
                  onClick={() => setShowLandingPage(false)}
                  className="w-full group bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-white/15 hover:border-white/30 rounded-2xl p-5 flex items-center gap-5 text-left transition-all duration-200 cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center shrink-0 group-hover:bg-sky-500/40 transition-colors">
                    <ArrowRight size={24} className="text-sky-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-base">Masuk ke Aplikasi</h3>
                    <p className="text-teal-200/60 text-xs font-medium mt-0.5">Login untuk petugas Puskesmas & Bidan Desa</p>
                  </div>
                  <ChevronRight size={20} className="text-white/30 group-hover:text-white/60 shrink-0" />
                </button>

                <button
                  onClick={() => setShowLandingInfo(true)}
                  className="w-full group bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-white/15 hover:border-white/30 rounded-2xl p-5 flex items-center gap-5 text-left transition-all duration-200 cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/40 transition-colors">
                    <Info size={24} className="text-emerald-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-base">Pengenalan TT</h3>
                    <p className="text-teal-200/60 text-xs font-medium mt-0.5">Apa itu Tetanus Toxoid? Manfaat & dampak imunisasi</p>
                  </div>
                  <ChevronRight size={20} className="text-white/30 group-hover:text-white/60 shrink-0" />
                </button>

                <button
                  onClick={() => setShowAccountList(true)}
                  className="w-full group bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-white/15 hover:border-white/30 rounded-2xl p-5 flex items-center gap-5 text-left transition-all duration-200 cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 group-hover:bg-amber-500/40 transition-colors">
                    <Users size={24} className="text-amber-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-base">Daftar Akun Per Desa</h3>
                    <p className="text-teal-200/60 text-xs font-medium mt-0.5">Lihat daftar akun petugas kesehatan setiap desa</p>
                  </div>
                  <ChevronRight size={20} className="text-white/30 group-hover:text-white/60 shrink-0" />
                </button>
              </div>

              <p className="text-[11px] text-teal-300/40 font-medium pt-4">
                SMART Tetanus Toxoid Monitoring — v1.0
              </p>
            </div>

            {/* TT Info Modal */}
            {showLandingInfo && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowLandingInfo(false)}>
                <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="sticky top-0 bg-white z-10 p-5 pb-3 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-lg font-black text-slate-800">Apa itu Imunisasi TT?</h2>
                    <button onClick={() => setShowLandingInfo(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">✕</button>
                  </div>
                  <div className="p-5 space-y-5 text-sm text-slate-600 leading-relaxed">
                    <p className="font-semibold text-slate-800">
                      Tetanus Toxoid (TT) adalah vaksin untuk mencegah penyakit tetanus pada ibu hamil dan bayi yang dikandungnya.
                    </p>

                    <div>
                      <h3 className="font-bold text-slate-800 text-sm mb-2">📋 Jadwal Pemberian</h3>
                      <div className="space-y-2">
                        {[
                          {dosis: 'TT1', waktu: 'Kunjungan pertama ANC', interval: '-', keterangan: 'Segera setelah diketahui hamil'},
                          {dosis: 'TT2', waktu: '4 minggu setelah TT1', interval: '4 minggu', keterangan: 'Memberi perlindungan awal'},
                          {dosis: 'TT3', waktu: '6 bulan setelah TT2', interval: '≥6 bulan', keterangan: 'Perlindungan 5 tahun'},
                          {dosis: 'TT4', waktu: '1 tahun setelah TT3', interval: '≥1 tahun', keterangan: 'Perlindungan 10 tahun'},
                          {dosis: 'TT5', waktu: '1 tahun setelah TT4', interval: '≥1 tahun', keterangan: 'Perlindungan seumur hidup'},
                        ].map(item => (
                          <div key={item.dosis} className="flex items-start gap-3 bg-slate-50 rounded-xl p-3">
                            <span className="w-10 h-7 rounded-lg bg-teal-100 text-teal-700 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">{item.dosis}</span>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-700 text-xs">{item.waktu}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">Interval: {item.interval} — {item.keterangan}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-800 text-sm mb-2">✅ Manfaat Imunisasi TT</h3>
                      <ul className="space-y-1.5">
                        {[
                          'Mencegah tetanus neonatorum (tetanus pada bayi baru lahir)',
                          'Melindungi ibu dari infeksi tetanus saat persalinan',
                          'Menurunkan angka kematian ibu dan bayi (AKI & AKB)',
                          'Kekebalan menurun ke bayi melalui plasenta',
                          'Biaya murah dan tersedia gratis di Puskesmas/Poskesdes',
                        ].map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-teal-500 mt-0.5 shrink-0">✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-800 text-sm mb-2">⚠️ Dampak Tanpa Imunisasi</h3>
                      <ul className="space-y-1.5">
                        {[
                          'Risiko tinggi tetanus neonatorum — penyebab utama kematian bayi di daerah dengan cakupan imunisasi rendah',
                          'Infeksi tetanus pada ibu saat persalinan meningkatkan risiko komplikasi',
                          'Biaya perawatan tetanus jauh lebih mahal dibanding biaya imunisasi',
                          'Angka kematian akibat tetanus neonatorum bisa mencapai 80-100% tanpa perawatan intensif',
                        ].map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-rose-500 mt-0.5 shrink-0">✕</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-teal-50 rounded-xl p-4 text-center">
                      <p className="text-xs font-bold text-teal-700">
                        "Imunisasi TT lengkap = Bayi terlindungi dari tetanus sejak lahir"
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Account List Modal */}
            {showAccountList && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowAccountList(false)}>
                <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="sticky top-0 bg-white z-10 p-5 pb-3 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-lg font-black text-slate-800">Daftar Akun Per Desa</h2>
                    <button onClick={() => setShowAccountList(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">✕</button>
                  </div>
                  <div className="p-5 space-y-2">
                    <p className="text-xs text-slate-400 font-medium mb-3">Akun petugas kesehatan di wilayah UPTD Puskesmas Kabukarudi</p>
                    {accounts.map(acc => (
                      <div key={acc.username} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 hover:bg-slate-100 transition-colors">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0 ${acc.role === 'Puskesmas' ? 'bg-sky-100 text-sky-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {acc.role === 'Puskesmas' ? 'PK' : 'BD'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-700 truncate">{acc.namaLengkap}</p>
                          <p className="text-[11px] text-slate-400 font-medium">@{acc.username} — {acc.desa}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md shrink-0 ${acc.role === 'Puskesmas' ? 'bg-sky-100 text-sky-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {acc.role}
                        </span>
                      </div>
                    ))}
                    <p className="text-[10px] text-slate-300 text-center pt-3 font-medium">
                      Total {accounts.length} akun terdaftar
                    </p>
                  </div>
                </div>
              </div>
            )}
          </main>
        ) : (
          /* LOGIN PAGE */
          <main id="login-container-view" className="flex-grow flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden bg-cover bg-center" style={{ backgroundImage: `linear-gradient(rgba(15, 118, 110, 0.93), rgba(2, 44, 34, 0.98)), url('https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&q=80')` }}>
            
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 relative z-10 border border-teal-100">
              <div className="text-center space-y-2">
                <img src="/logo_smart_tt.png" alt="SMART TT" className="w-16 h-16 object-contain mx-auto mb-2" />
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">SMART TT KABUKARUDI</h2>
                <p className="text-xs font-medium text-slate-500 max-w-xs mx-auto">
                  Sistem Pemantauan Tetanus Toxoid Ibu Hamil UPTD Puskesmas Kabukarudi, Sumba Barat
                </p>
              </div>

              {loginError && (
                <div className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded-md text-xs text-rose-700 flex items-start space-x-2">
                  <AlertTriangle size={18} className="shrink-0 text-rose-500 mt-0.5" />
                  <p>{loginError}</p>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">Username</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="Contoh: puskesmas" 
                      className="w-full pl-3 pr-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm transition-all shadow-sm text-slate-855"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">Password</label>
                  <div className="relative">
                    <input 
                      type="password" 
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Masukkan password" 
                      className="w-full pl-3 pr-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm transition-all shadow-sm text-slate-855"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoggingIn}
                  className="w-full py-3 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700 active:bg-sky-800 transition-colors text-sm shadow-md flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoggingIn ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      <span>Memverifikasi...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk Sekarang</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2 text-center text-[11px] text-slate-400">
                SMART Tetanus Toxoid Monitoring
              </div>
              <button
                onClick={() => setShowLandingPage(true)}
                className="w-full text-center text-[11px] text-slate-400 hover:text-teal-600 font-medium transition-colors cursor-pointer"
              >
                ← Kembali ke Beranda
              </button>
            </div>
          </main>
        )
      ) : (
        /* MAIN APPLICATION WORKSPACE - SLEEK INTERFACE */
        <div id="main-authed-workspace" className="flex-grow flex flex-col md:flex-row flex-1 overflow-hidden h-auto md:h-full min-h-0 w-full min-w-0">
          
          {/* CONTENT PANE */}
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-slate-50 relative min-w-0 w-full">
            
            {/* TOP HEADER */}
            <header className="h-16 bg-white border-b border-slate-200 px-6 md:px-8 flex items-center justify-between shrink-0 select-none sticky top-0 z-35 min-w-0 w-full">
              <div className="space-y-0.5 min-w-0 flex-1 mr-4">
                <h2 className="text-sm md:text-base font-black text-slate-850 tracking-tight truncate">
                  {activeTab === 'beranda' && 'Ringkasan Capaian Wilayah'}
                  {activeTab === 'input' && 'Sistem Registrasi & Master Data TT'}
                  {activeTab === 'interval' && 'Interval Edukasi Selang Dosis'}
                  {activeTab === 'accounts' && 'Kelola Akun Petugas Kesehatan Desa'}
                  {activeTab === 'lacar' && 'Lacak & Lembar Lacak Imunisasi TT'}
                </h2>
                <p className="text-[10px] text-slate-400 hidden sm:block font-bold tracking-wider truncate">
                  UPTD PUSKESMAS KABUKARUDI • SUMBA BARAT, NTT
                </p>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {(activeTab === 'beranda' || activeTab === 'input') && (
                  <>
                    <button 
                      onClick={generatePdfReport}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-sm shadow-emerald-600/10"
                      title="Ekspor PDF"
                    >
                      <FileDown size={13} />
                      <span className="hidden sm:inline">EXPORT LAPORAN PDF</span>
                    </button>
                    
                    <button 
                      onClick={openNewForm}
                      className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-sm shadow-sky-600/10"
                      title="Daftar Bumil Baru"
                    >
                      <Plus size={13} />
                      <span className="hidden sm:inline">DAFTAR BARU</span>
                      <span className="sm:hidden">BARU</span>
                    </button>
                  </>
                )}
                <div className="h-5 w-px bg-slate-200 hidden sm:block"></div>
                <span className="text-xs text-slate-500 font-bold hidden sm:inline">Juni 2026</span>
              </div>
            </header>

            <div className="pt-6 px-4 md:pt-8 md:px-8 pb-32 space-y-6 flex-1 bg-slate-50 font-sans min-h-0">
              
          {/* ======================= TAB 1: DASBOR IMUNISASI ======================= */}
          {activeTab === 'beranda' && (
            <div id="dashboard-view-tab" className="space-y-6">

              {/* USER WELCOME CARD */}
              <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Status Bidan Aktif</p>
                  <h3 className="text-base md:text-lg font-black text-slate-850 flex flex-wrap items-center gap-2">
                    <span>{user.namaLengkap}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-100">
                      {user.role === 'Puskesmas' ? '🏥 Puskesmas (Admin)' : `🏡 Desa: ${user.desa}`}
                    </span>
                  </h3>
                  <p className="text-slate-500 text-xs">
                    Sistem Pemantauan Tetanus Toxoid Ibu Hamil secara langsung.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-slate-400 text-right hidden lg:block bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-bold">
                  <span>TERAKHIR SYNC: BARU SAJA</span>
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-2" title="Koneksi Berhasil"></span>
                </div>
              </div>

              {/* PANEL INPUT DATA CEPAT (QUICK DATA ACTIONS) */}
              <div className="bg-gradient-to-r from-sky-50 to-teal-50/70 rounded-2xl p-5 border border-sky-100 shadow-2xs space-y-4">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-extrabold bg-sky-200/55 text-sky-900 uppercase tracking-widest">
                    ✦ Akses Cepat Manajemen Data
                  </span>
                  <p className="text-xs text-slate-600 font-medium">
                    Gunakan tombol pintasan utama di bawah ini untuk menginput atau memperbarui rekam vaksin Ibu Hamil secara langsung.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Button 1: DAFTAR BARU */}
                  <button
                    onClick={openNewForm}
                    className="group relative bg-white hover:bg-slate-50/50 p-4 rounded-xl border border-slate-200 hover:border-sky-300 text-left transition-all duration-200 hover:shadow-xs cursor-pointer flex items-start gap-3 w-full focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <div className="h-10 w-10 bg-sky-600 text-white rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-250 shadow-sm shadow-sky-600/10">
                      <PlusCircle size={20} />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs text-slate-800">Daftarkan Ibu Hamil Baru</span>
                        <span className="bg-sky-50 text-sky-700 text-[9px] font-black px-1.5 py-0.5 rounded border border-sky-100">Baru</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Mulai registrasi NIK, Nama, Desa, HPHT, dan riwayat Obstetrik (G-P-A) Ibu Hamil ke lembar pemantauan.
                      </p>
                    </div>
                  </button>

                  {/* Button 2: UPDATE DATA */}
                  <button
                    onClick={() => setActiveTab('input')}
                    className="group relative bg-white hover:bg-slate-50/50 p-4 rounded-xl border border-slate-200 hover:border-teal-300 text-left transition-all duration-200 hover:shadow-xs cursor-pointer flex items-start gap-3 w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <div className="h-10 w-10 bg-teal-600 text-white rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-250 shadow-sm shadow-teal-600/10">
                      <Edit size={16} />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs text-slate-800">Cari & Update Dosis Imunisasi</span>
                        <span className="bg-teal-50 text-teal-700 text-[9px] font-black px-1.5 py-0.5 rounded border border-teal-100">Update Data</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Cari rekam medis Ibu terdaftar, perbarui checklist, catat dosis suntikan TT berikutnya, atau perbaiki biodata.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* STATUS CARDS GRID (SLEEK DESIGN PRESCRIPTION) */}
              <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 font-sans">
                {/* Card 1: Total Bumil */}
                <article className="bg-white p-5 rounded-2xl shadow-xs border border-slate-150 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <span className="text-[10px] sm:text-xs text-slate-400 font-black uppercase tracking-wider block mb-1">Total Bumil</span>
                    <p className="text-2xl sm:text-3xl font-black text-slate-850 leading-tight">{stats.total}</p>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold">
                    <CheckCircle size={12} />
                    <span>Semua Sasaran Aktif</span>
                  </div>
                </article>

                {/* Card 2: TT1 Coverage */}
                <article className="bg-white p-5 rounded-2xl shadow-xs border border-slate-150 border-l-4 border-l-sky-500 flex flex-col justify-between hover:shadow-md transition-shadow">
                  {(() => {
                    const activePatientsCount = patients.filter(p => p.tt1 && (user.role === 'Puskesmas' || p.desa === user.desa)).length;
                    const tt1Pct = stats.total > 0 ? Math.round((activePatientsCount / stats.total) * 100) : 0;
                    return (
                      <>
                        <div>
                          <span className="text-[10px] sm:text-xs text-slate-400 font-black uppercase tracking-wider block mb-1">TT1 Coverage</span>
                          <p className="text-2xl sm:text-3xl font-black text-slate-850 leading-tight">{tt1Pct}%</p>
                        </div>
                        <div className="w-full mt-3">
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-sky-500 h-full rounded-full transition-all duration-500" style={{ width: `${tt1Pct}%` }}></div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </article>

                {/* Card 3: TT5 Lengkap */}
                <article className="bg-white p-5 rounded-2xl shadow-xs border border-slate-150 border-l-4 border-l-purple-500 flex flex-col justify-between hover:shadow-md transition-shadow">
                  {(() => {
                    const tt5Pct = stats.total > 0 ? Math.round((stats.limitT5 / stats.total) * 100) : 0;
                    return (
                      <>
                        <div>
                          <span className="text-[10px] sm:text-xs text-slate-400 font-black uppercase tracking-wider block mb-1">T5 Lengkap (Aman)</span>
                          <p className="text-2xl sm:text-3xl font-black text-slate-850 leading-tight">{tt5Pct}%</p>
                        </div>
                        <div className="w-full mt-3">
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${tt5Pct}%` }}></div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </article>

                {/* Card 4: Mendekati Jadwal */}
                <article className={`p-5 rounded-2xl shadow-xs border flex flex-col justify-between hover:shadow-md transition-shadow transition-colors ${stats.mendekati > 0 ? 'bg-amber-50/50 border-amber-250 text-amber-950' : 'bg-white border-slate-150 text-slate-800'}`}>
                  <div>
                    <span className={`text-[10px] sm:text-xs font-black uppercase tracking-wider block mb-1 ${stats.mendekati > 0 ? 'text-amber-700 font-bold' : 'text-slate-400'}`}>Mendekati Jadwal</span>
                    <p className={`text-2xl sm:text-3xl font-black leading-tight ${stats.mendekati > 0 ? 'text-amber-700' : 'text-slate-850'}`}>{stats.mendekati}</p>
                  </div>
                  <p className={`text-[10px] mt-3 font-semibold ${stats.mendekati > 0 ? 'text-amber-850 animate-pulse' : 'text-slate-450'}`}>
                    {stats.mendekati > 0 ? 'Hubungi WA Imbauan' : 'Semua Jadwal Aman'}
                  </p>
                </article>

                {/* Card 5: Drop Out */}
                <article className={`p-5 rounded-2xl shadow-xs border flex flex-col justify-between hover:shadow-md transition-shadow transition-colors ${stats.dropOut > 0 ? 'bg-rose-50/50 border-rose-250 text-rose-950' : 'bg-white border-slate-150 text-slate-800'}`}>
                  <div>
                    <span className={`text-[10px] sm:text-xs font-black uppercase tracking-wider block mb-1 ${stats.dropOut > 0 ? 'text-red-700' : 'text-slate-400'}`}>Drop Out (Lacak)</span>
                    <p className={`text-2xl sm:text-3xl font-black leading-tight ${stats.dropOut > 0 ? 'text-red-700' : 'text-slate-850'}`}>{stats.dropOut}</p>
                  </div>
                  <p className={`text-[10px] mt-3 font-bold ${stats.dropOut > 0 ? 'text-red-650 animate-pulse' : 'text-slate-450'}`}>
                    {stats.dropOut > 0 ? 'Memerlukan Tindak Lanjut' : 'Wilayah Bebas Tetanus'}
                  </p>
                </article>
              </section>
              
              {/* VILLAGE SELECTOR FILTER FOR PUSKESMAS ADMINS */}
              {user.role === 'Puskesmas' && (
                <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2 text-slate-600 font-bold">
                    <MapPin size={16} className="text-teal-600" />
                    <span>Filter Laporan Wilayah Capaian Kerja:</span>
                  </div>
                  <select 
                    value={selectedDesaFilter}
                    onChange={(e) => setSelectedDesaFilter(e.target.value)}
                    className="p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
                  >
                    <option value="Semua">🏥 Semua 11 Desa (Seluruh Puskesmas)</option>
                    {VILLAGES.map(v => (
                      <option key={v} value={v}>🏡 Desa {v}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* STATISTICAL CHANNELS */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* DOSE COMPLETENESS STAGE (CHART 1) */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs md:col-span-6 space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                      <TrendingUp size={16} className="text-teal-600" />
                      <span>Capaian Kumulatif Antigen TT (T1 - T5)</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Persentase Ibu hamil yang telah menerima masing-masing dosis imunisasi TT.
                    </p>
                  </div>

                  {/* CUSTOM COMPREHENSIVE PROGRESS PERCENTAGES */}
                  <div className="space-y-3.5 pt-2">
                    {[
                      { key: 'tt1', label: 'Imunisasi TT1', val: patients.filter(p => p.tt1 && (user.role === 'Puskesmas' || p.desa === user.desa)).length, color: 'bg-teal-500' },
                      { key: 'tt2', label: 'Imunisasi TT2', val: patients.filter(p => p.tt2 && (user.role === 'Puskesmas' || p.desa === user.desa)).length, color: 'bg-emerald-500' },
                      { key: 'tt3', label: 'Imunisasi TT3', val: patients.filter(p => p.tt3 && (user.role === 'Puskesmas' || p.desa === user.desa)).length, color: 'bg-emerald-600' },
                      { key: 'tt4', label: 'Imunisasi TT4', val: patients.filter(p => p.tt4 && (user.role === 'Puskesmas' || p.desa === user.desa)).length, color: 'bg-cyan-600' },
                      { key: 'tt5', label: 'Imunisasi TT5', val: patients.filter(p => p.tt5 && (user.role === 'Puskesmas' || p.desa === user.desa)).length, color: 'bg-blue-600' }
                    ].map((item, idx) => {
                      const totalC = user.role === 'Desa' ? patients.filter(p => p.desa === user.desa).length : patients.length;
                      const pct = totalC > 0 ? Math.round((item.val / totalC) * 100) : 0;
                      return (
                        <div key={item.key} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold leading-none text-slate-600">
                            <span>{item.label}</span>
                            <span className="text-slate-800">{item.val} / {totalC} Ibu ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                            <div className={`${item.color} h-3 rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* GRAPH COMPARE BY VILLAGES (CHART 2) */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs md:col-span-6 space-y-3">
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                      <MapPin size={16} className="text-teal-600" />
                      <span>{user?.role === 'Puskesmas' ? 'Perbandingan Capaian Antar 11 Desa' : 'Distribusi Status Imunisasi Desa'}</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {user?.role === 'Puskesmas' 
                        ? 'Jumlah Ibu Hamil terdaftar di seluruh wilayah kerja UPTD Kabukarudi' 
                        : `Detail status imunisasi TT warga Desa ${user?.desa}`
                      }
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 text-xs">
                    {user?.role === 'Puskesmas' ? (
                      // Comparative bar heights for 11 villages
                      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                        {VILLAGES.map(v => {
                          const vCount = patients.filter(p => p.desa === v).length;
                          const t5Count = patients.filter(p => p.desa === v && calculateKeteranganStatus(p) === 'Lengkap (T5)').length;
                          const pct = patients.length > 0 ? (vCount / patients.length) * 100 : 0;
                          return (
                            <div key={v} className="flex items-center space-x-2">
                              <span className="w-24 truncate font-bold text-slate-500 text-[11px]">{v}</span>
                              <div className="flex-grow bg-slate-100 h-6.5 rounded-md overflow-hidden relative flex items-center px-1">
                                <div className="bg-teal-600/20 h-full rounded-l-md transition-all absolute left-0" style={{ width: `${pct}%` }}></div>
                                <span className="z-10 text-[10px] font-black pl-1">{vCount} Ibu <span className="text-[9px] font-medium text-slate-400">({t5Count} T5)</span></span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      // Single village detailed donut simulated components
                      <div className="space-y-3 p-3 bg-teal-50/50 rounded-xl border border-teal-100 flex flex-col justify-center h-full">
                        <div className="text-center space-y-1">
                          <span className="text-[11px] font-bold text-teal-800 tracking-wider uppercase">Wilayah Puskesmas</span>
                          <h5 className="text-lg font-black text-teal-950">Desa {user.desa}</h5>
                        </div>

                        <div className="space-y-2 pt-1 font-sans">
                          {[
                            { label: 'Suntik Terpenuhi (T5)', count: stats.limitT5, color: 'text-emerald-600 bg-emerald-50' },
                            { label: 'Suntik Sedang Dipantau', count: stats.dipantau, color: 'text-sky-600 bg-sky-50' },
                            { label: 'Kategori Drop Out / Terlambat', count: stats.dropOut, color: 'text-amber-700 bg-amber-50' }
                          ].map((x, i) => (
                            <div key={i} className={`flex items-center justify-between p-2 rounded-lg border border-teal-100 ${x.color}`}>
                              <span className="font-bold text-[11px]">{x.label}</span>
                              <span className="font-extrabold text-sm">{x.count} Bumil</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* DUA PANEL UTAMA BAWAH (SPLIT INFOGRAPHIC PANELS - SLEEK INTERFACE PRESCRIPTION) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-5">
                {/* Panel 1: Info Standar Interval TT */}
                <div className="bg-slate-900 rounded-2xl p-6 text-white flex items-center gap-5 shadow-xs">
                  <div className="h-12 w-12 bg-slate-800 rounded-full flex items-center justify-center shrink-0 border border-slate-700">
                    <Info className="w-6 h-6 text-sky-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">Informasi Interval Imunisasi TT</h4>
                    <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                      TT1: Kontak Pertama • TT2: 4 Minggu setelah TT1 • TT3: 6 Bulan setelah TT2 • TT4: 1 Tahun setelah TT3 • TT5: 1 Tahun setelah TT4.
                    </p>
                  </div>
                </div>

                {/* Panel 2: WhatsApp Gateway Active Reminders */}
                <div className="bg-emerald-50 border border-emerald-150 rounded-2xl p-6 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-left">
                    <div className="h-10 w-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm shadow-emerald-500/20">
                       <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-emerald-950">Pengingat WhatsApp Gateway</h4>
                      <p className="text-[11.5px] text-emerald-700 leading-relaxed mt-0.5">Ada {stats.dropOut} sasaran terdeteksi terlambat. Kirim pemberitahuan edukatif sekarang.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('lacak')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    KIRIM NOTIFIKASI
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ======================= TAB 2: MASTER DATA SMART TT (INPUT FORM / DIRECTORY) ======================= */}
          {activeTab === 'input' && (
            <div id="master-data-view-tab" className="space-y-4">
              
              {/* TOP PATIENT BAR & FILTERS */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                
                {/* Search query box */}
                <div className="relative w-full sm:max-w-xs">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search size={15} />
                  </span>
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari Nama Ibu, NIK, atau HP..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs text-slate-800"
                  />
                </div>

                {/* Status Filter Dropdown */}
                <div className="flex flex-wrap gap-2 items-center w-full justify-end">
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="p-2 rounded-lg border border-slate-300 bg-white font-semibold text-xs text-slate-800"
                  >
                    <option value="Semua">Semua Status</option>
                    <option value="Belum Mulai">🔵 Belum Mulai</option>
                    <option value="Sedang Dipantau">🛡️ Sedang Dipantau</option>
                    <option value="Mendekati Jadwal">⏳ Mendekati Jadwal</option>
                    <option value="Drop Out">🚨 Drop Out (Telat Dosis)</option>
                    <option value="Lengkap (T5)">👑 Lengkap (T5)</option>
                  </select>

                  {/* Village selection for Puskesmas */}
                  {user.role === 'Puskesmas' && (
                    <>
                      <select 
                        value={selectedDesaFilter}
                        onChange={(e) => setSelectedDesaFilter(e.target.value)}
                        className="p-2 rounded-lg border border-slate-300 bg-white font-semibold text-xs text-slate-800"
                      >
                        <option value="Semua">Semua 11 Desa</option>
                        {VILLAGES.map(v => (
                          <option key={v} value={v}>Desa {v}</option>
                        ))}
                      </select>

                      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportExcel} hidden />

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Import Excel"
                      >
                        <Upload size={13} />
                        <span>IMPORT EXCEL</span>
                      </button>

                      <button
                        onClick={handleClearAllPatients}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Kosongkan Database"
                      >
                        <Trash2 size={13} />
                        <span>KOSONGKAN DATA</span>
                      </button>
                    </>
                  )}
                </div>

              </div>

              {/* Reset filter indicator */}
              {(statusFilter !== 'Semua' || searchQuery.trim() || (user?.role === 'Puskesmas' && selectedDesaFilter !== 'Semua')) && (
                <div className="flex items-center gap-2 text-xs bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">
                  <span className="text-sky-700 font-semibold flex-1">
                    Filter aktif — menampilkan {filteredPatients.length} dari {patients.length} data
                  </span>
                  <button
                    onClick={() => { setStatusFilter('Semua'); setSearchQuery(''); if (user?.role === 'Puskesmas') setSelectedDesaFilter('Semua'); }}
                    className="text-sky-600 hover:text-sky-800 font-bold underline cursor-pointer whitespace-nowrap"
                  >
                    Reset Filter
                  </button>
                </div>
              )}

              {/* LIST OF REGISTERED CLINICAL PATIENTS (MOBILE MOBILE CARD LAYOUT BY DESIGN) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Menampilkan {filteredPatients.length} Data Ibu Hamil
                  </h4>
                </div>

                {filteredPatients.length === 0 ? (
                  <div className="bg-white p-12 rounded-xl text-center border border-slate-200 text-slate-400 space-y-2">
                    <FileText size={36} className="mx-auto text-slate-300" />
                    <p className="font-bold text-sm">Tidak Ada Data Ibu Hamil</p>
                    <p className="text-xs max-w-sm mx-auto">Silahkan ubah kata kunci pencarian atau daftarkan ibu hamil baru pada tombol diatas.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {filteredPatients.map((p) => {
                      const computedStats = calculateKeteranganStatus(p);
                      return (
                        <div 
                          key={p.no} 
                          id={`patient-card-${p.no}`}
                          className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-teal-500 hover:shadow-md transition-all p-4 flex flex-col justify-between space-y-4"
                        >
                          {/* TOP CARD BAR */}
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700">
                                Desa {p.desa}
                              </span>
                              <h5 className="font-bold text-slate-900 text-sm md:text-base">{p.namaLengkapIbu}</h5>
                              <p className="text-xs font-mono text-slate-500">NIK: {p.nikIbu}</p>
                              {p.nomorHp && (
                                <p className="text-xs text-slate-600 flex items-center gap-1.5 pt-0.5">
                                  <Phone size={12} className="text-teal-600" />
                                  <span>{p.nomorHp}</span>
                                </p>
                              )}
                            </div>

                            {/* Status tag */}
                            <span className={`px-2 py-1 rounded text-[10px] font-black tracking-wide uppercase ${
                              computedStats.includes('T5') 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : computedStats === 'Drop Out' 
                                ? 'bg-rose-100 text-rose-800' 
                                : computedStats === 'Mendekati Jadwal'
                                ? 'bg-amber-100 text-amber-800 border border-amber-250 animate-pulse'
                                : 'bg-sky-100 text-sky-800'
                            }`}>
                              {computedStats}
                            </span>
                          </div>

                          {/* HISTORI OBSTETRI & KLINIS */}
                          <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100 shadow-2xs font-sans">
                            <div className="space-y-0.5">
                              <span className="text-slate-400 font-bold block uppercase text-[8px] tracking-wider">Histori Obstetri (G-P-A)</span>
                              <span className="font-mono font-extrabold text-slate-800 text-xs">
                                G{p.gravida ?? '-'} • P{p.paritas ?? '-'} • A{p.abortus ?? '-'}
                              </span>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-slate-400 font-bold block uppercase text-[8px] tracking-wider">Jarak Kelahiran</span>
                              <span className="font-semibold text-slate-800">
                                {p.jarakKelahiran || 'Tidak Ada / -'}
                              </span>
                            </div>
                            <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                              <span>HPHT: <strong className="text-slate-700 font-mono">{p.hpht || '-'}</strong></span>
                              {p.hpht && (
                                <span className="text-teal-600 font-bold" title="Taksiran Persalinan (Rumus Naegele)">
                                  Est HPL: {(() => {
                                    const d = new Date(p.hpht);
                                    if (isNaN(d.getTime())) return '-';
                                    d.setDate(d.getDate() + 7);
                                    d.setMonth(d.getMonth() + 9);
                                    return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
                                  })()}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* IMMUNISATION SEED TRACKER DOTS */}
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 grid grid-cols-5 gap-1 text-center text-[10px]">
                            {[
                              { label: 'TT1', ok: p.tt1, date: p.tanggalTt1 },
                              { label: 'TT2', ok: p.tt2, date: p.tanggalTt2 },
                              { label: 'TT3', ok: p.tt3, date: p.tanggalTt3 },
                              { label: 'TT4', ok: p.tt4, date: p.tanggalTt4 },
                              { label: 'TT5', ok: p.tt5, date: p.tanggalTt5 }
                            ].map((dosage, index) => (
                              <div key={index} className="flex flex-col items-center">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black ${
                                  dosage.ok ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-400'
                                }`}>
                                  {index + 1}
                                </span>
                                <span className="font-bold scale-90 pt-0.5">{dosage.label}</span>
                                <span className="text-[8px] font-mono whitespace-nowrap overflow-hidden text-ellipsis w-14 text-slate-400">
                                  {dosage.ok ? dosage.date.slice(5) : 'Belum'}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* NEXT ACTION OVERVIEW BANNER */}
                          {(() => {
                            const info = getPatientScheduleInfo(p);
                            if (info.dueDateStr !== 'Lengkap (T5)' && info.statusText !== 'Lengkap (T5)') {
                              return (
                                <div className={`p-2 rounded-lg text-xs flex items-center justify-between font-sans ${info.bgClass} border border-dashed text-slate-700 ${
                                  info.statusText === 'Mendekati Jadwal' ? 'border-amber-400' : info.statusText === 'Drop Out' ? 'border-rose-300 animate-pulse' : 'border-sky-300'
                                }`}>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <Clock size={12} className={info.statusText === 'Drop Out' ? 'text-rose-600 animate-spin flex' : 'text-slate-500'} />
                                    <span className="font-bold text-[11px]">Dosis Terdekat:</span>
                                    <span className="font-mono bg-white px-1.5 py-0.5 rounded font-black text-[10.5px] border border-slate-200 text-slate-800">{info.nextDose}</span>
                                  </div>
                                  <div className="text-right text-[11px]">
                                    <span className="font-bold">{info.dueDateStr}</span>
                                    <span className={`block text-[9.5px] font-black ${
                                      info.statusText === 'Drop Out' ? 'text-rose-600' : info.statusText === 'Mendekati Jadwal' ? 'text-amber-700' : 'text-sky-600'
                                    }`}>
                                      {info.daysRemaining !== null ? (
                                        info.daysRemaining < 0 ? `Telat ${Math.abs(info.daysRemaining)} Hari 🚨` : `${info.daysRemaining} Hari Lagi ⏳`
                                      ) : 'Segera ⚡'}
                                    </span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {/* ACTION ACTIONS */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <p className="text-[10px] text-slate-400">Registrasi: {p.tanggalRegistrasi}</p>
                            
                            <div className="flex space-x-2">
                              {/* Trigger WhatsApp reminder manual */}
                              {(computedStats === 'Drop Out' || computedStats === 'Mendekati Jadwal') && (
                                <button 
                                  onClick={() => requestWhatsappModal(p)}
                                  className={`p-1 px-2.5 rounded text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors ${
                                    computedStats === 'Mendekati Jadwal'
                                      ? 'bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 animate-pulse'
                                      : 'bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800'
                                  }`}
                                  title="Kirim pengingat WhatsApp"
                                >
                                  <Send size={11} />
                                  <span>WhatsApp</span>
                                </button>
                              )}

                              <button 
                                onClick={() => openEditForm(p)}
                                className="p-1 px-2.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded text-teal-800 text-xs font-bold flex items-center space-x-1 cursor-pointer"
                              >
                                <span>Perbarui Dosis</span>
                                <ChevronRight size={12} />
                              </button>

                              <button 
                                onClick={() => handleDeletePatient(p.no, p.namaLengkapIbu)}
                                className="p-1 px-2 border border-rose-200 text-rose-600 hover:text-white hover:bg-rose-600 rounded text-xs transition-colors cursor-pointer flex items-center justify-center"
                                title="Hapus Rekam"
                              >
                                <Trash size={12} />
                              </button>
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}

              </div>

            </div>
          )}

          {/* ======================= TAB 4: INTERVAL & JADWAL TT PENDIDIKAN ======================= */}
          {activeTab === 'interval' && (
            <div id="interval-standards-view-tab" className="space-y-4 font-sans">
              
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black tracking-widest text-teal-600 uppercase">Standar Kementerian Kesehatan</span>
                  <h3 className="text-xl font-extrabold text-slate-800">Interval & Jarak Pemberian Imunisasi TT Ibu Hamil</h3>
                  <p className="text-xs text-slate-500">
                    Setiap wanita usia subur (WUS) wajib mendapatkan perlindungan Tetanus Toxoid 5 Dosis lengkap (T5) untuk imunitas seumur hidup dari kontaminasi bakteri persalinan.
                  </p>
                </div>

                <div className="space-y-3.5 pt-3">
                  {[
                    { dosage: 'TT1', interval: 'Suntikan Pertama', description: 'Diberikan pada kunjungan pertama ke fasilitas kesehatan (saat pertama kali ketahuan hamil). tidak memiliki durasi perlindungan bawaan.', duration: 'Langkah awal imunitas maternal.' },
                    { dosage: 'TT2', interval: 'Minimal 4 minggu setelah TT1', description: 'Sangat vital untuk memberi proteksi dasar imunisasi aktif.', duration: 'Perlindungan: 3 Tahun' },
                    { dosage: 'TT3', interval: 'Minimal 6 bulan setelah TT2', description: 'Memperkuat benteng pertahanan antibodi secara berkelanjutan.', duration: 'Perlindungan: 5 Tahun' },
                    { dosage: 'TT4', interval: 'Minimal 1 tahun setelah TT3', description: 'Menegakkan dan memperlama daya tahan memori fungsional sel B.', duration: 'Perlindungan: 10 Tahun' },
                    { dosage: 'TT5', interval: 'Minimal 1 tahun setelah TT4', description: 'Dosis tertinggi penuntas (Ultimate T5 booster).', duration: 'Perlindungan: 25 Tahun / Seumur Hidup' },
                  ].map((item, index) => (
                    <div key={index} className="flex gap-4 p-4 rounded-xl border border-slate-100 hover:border-teal-200 bg-teal-50/10 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-teal-600 text-white flex items-center justify-center font-extrabold text-sm md:text-base shrink-0 shadow-sm">
                        {item.dosage}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-extrabold text-slate-800 text-sm md:text-base">Imunisasi {item.dosage}</h4>
                          <span className="bg-emerald-50 text-emerald-800 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-100">
                            {item.duration}
                          </span>
                        </div>
                        <p className="text-xs text-teal-800 font-bold">Selang Minimal: {item.interval}</p>
                        <p className="text-xs text-slate-500 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-emerald-50 rounded-xl p-4 text-xs text-emerald-950 font-medium">
                  💡 <strong>Keterangan Klinis:</strong> Selang pemberian boleh diperpanjang (molor), namun TIDAK diperbolehkan untuk dipersingkat di bawah waktu minimal. Jika masa interval dipercepat di luar batas standar, efektivitas respon antibodi akan berkurang drastis.
                </div>
              </div>

            </div>
          )}

          {/* ======================= TAB 5: PUSAT INTEGRASI & SINKRONISASI DATA ======================= */}
          {activeTab === 'integrasi_gas' && (
            <div id="gas-integration-tab" className="space-y-4 w-full max-w-full overflow-hidden min-w-0">
              
              <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 space-y-6 w-full max-w-full overflow-hidden min-w-0">
                <div className="space-y-1">
                  <span className="text-[10px] font-black tracking-widest text-teal-600 uppercase">Pusat Integrasi SMART TT</span>
                  <h3 className="text-lg md:text-xl font-extrabold text-slate-800 flex items-center gap-2">
                    <Database size={20} className="text-teal-600 animate-pulse" />
                    <span>Konektivitas Database & Notifikasi WhatsApp</span>
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                    Sistem SMART TT dapat dikoordinasikan secara cloud seutuhnya. Di bawah ini adalah panduan, skema query, dan kode pemrograman lengkap untuk menghubungkan aplikasi Anda dengan Google Sheets (GAS), Supabase/PostgreSQL, serta mengaktifkan notifikasi pengingat WhatsApp bidan otomatis.
                  </p>
                </div>

                {/* SUB TAB CONTROLLERS */}
                <div className="flex border-b border-slate-200 overflow-x-auto gap-1">
                  <button
                    onClick={() => setIntegrationSubTab('gas')}
                    className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      integrationSubTab === 'gas'
                        ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                        : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <Database size={14} className="text-indigo-500" />
                    <span>Google Sheets + GAS</span>
                  </button>
                  <button
                    onClick={() => setIntegrationSubTab('supabase')}
                    className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      integrationSubTab === 'supabase'
                        ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50 rounded-t-lg'
                        : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <ShieldAlert size={14} className="text-emerald-500" />
                    <span>Supabase (PostgreSQL)</span>
                  </button>
                  <button
                    onClick={() => setIntegrationSubTab('whatsapp')}
                    className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      integrationSubTab === 'whatsapp'
                        ? 'border-sky-600 text-sky-600 bg-sky-50/50 rounded-t-lg'
                        : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <Send size={14} className="text-sky-500" />
                    <span>Notifikasi WA</span>
                  </button>
                </div>

                {/* SUB TAB 1 CONTENT: GOOGLE SHEETS & GAS */}
                {integrationSubTab === 'gas' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-xs space-y-2 text-indigo-950 leading-relaxed">
                      <h4 className="font-bold flex items-center gap-1.5">
                        <Info size={14} className="text-indigo-600" />
                        <span>Langkah Set-Up Lembar Kerja Google Sheets:</span>
                      </h4>
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Buat Spreadsheet kosong baru di Google Drive Anda.</li>
                        <li>Ganti nama tab lembar pertama menjadi <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-slate-700">DataTT</code> dengan kolom (Tajuk Atas) berikut:<br/>
                          <span className="font-mono text-[10px] bg-white px-2 py-1 rounded block whitespace-pre mt-1 border text-indigo-900 select-all overflow-x-auto font-semibold">
                            NO | TANGGAL REGISTRASI | NIK IBU | NAMA LENKGAP IBU | DESA | NOMOR HP | HPHT | TT1 | TANGGAL TT1 | TT2 | TANGGAL TT2 | TT3 | TANGGAL TT3 | TT4 | TANGGAL TT4 | TT5 | TANGGAL TT5 | KETERANGAN | GRAVIDA | PARITAS | ABORTUS | JARAK KELAHIRAN
                          </span>
                        </li>
                        <li>Buat tab lembar kedua dan beri nama <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-slate-700">Akun</code> dengan kolom tajuk:<br/>
                          <span className="font-mono text-[10px] bg-slate-900 text-emerald-400 px-2 py-1 rounded block whitespace-pre mt-1 select-all overflow-x-auto font-semibold">
                            Username | Password | Role | Desa | Nama_Lengkap
                          </span>
                        </li>
                        <li>Buka menu <strong>Ekstensi &gt; Apps Script</strong> dari Spreadsheet.</li>
                        <li>Timpa file <code className="font-mono bg-white px-1 font-bold">Code.gs</code> menggunakan skrip di bawah ini, lalu simpan dan klik <b>Terapkan &gt; Aplikasi Web</b>!</li>
                      </ol>
                    </div>

                    <div className="space-y-4">
                      {/* Code.gs block */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                            <FileText size={14} className="text-indigo-600" />
                            <span>1. Bagian Code.gs (Backend Google Apps Script)</span>
                          </span>
                          <button
                            onClick={() => handleCopy(codeGsText, 'gs')}
                            className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
                          >
                            {copiedKey === 'gs' ? <Check size={12} className="text-emerald-600" /> : <Clipboard size={12} />}
                            <span>{copiedKey === 'gs' ? 'Tersalin!' : 'Salin Code.gs'}</span>
                          </button>
                        </div>
                        <pre className="bg-slate-900 text-slate-200 text-[10.5px] p-3 rounded-xl overflow-x-auto max-h-[220px] font-mono leading-normal shadow-inner w-full">
                          {codeGsText}
                        </pre>
                      </div>

                      {/* Index.html block */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                            <FileText size={14} className="text-teal-600" />
                            <span>2. Bagian Index.html (Vite SPA HTML Build)</span>
                          </span>
                          <button
                            onClick={() => handleCopy(codeHtmlText, 'html')}
                            className="bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
                          >
                            {copiedKey === 'html' ? <Check size={12} className="text-emerald-600" /> : <Clipboard size={12} />}
                            <span>{copiedKey === 'html' ? 'Tersalin!' : 'Salin Index.html'}</span>
                          </button>
                        </div>
                        <pre className="bg-slate-900 text-slate-200 text-[10.5px] p-3 rounded-xl overflow-x-auto max-h-[180px] font-mono leading-normal shadow-inner w-full">
                          {codeHtmlText}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUB TAB 2 CONTENT: SUPABASE (POSTGRESQL) */}
                {integrationSubTab === 'supabase' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-xs space-y-2 text-emerald-950 leading-relaxed">
                      <h4 className="font-bold flex items-center gap-1.5 text-emerald-900">
                        <Info size={14} className="text-emerald-700" />
                        <span>Panduan Menghubungkan Aplikasi ke Supabase (Cloud SQL):</span>
                      </h4>
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Daftar di <a href="https://supabase.com" target="_blank" rel="noreferrer" className="underline font-bold text-emerald-700">supabase.com</a> dan buat sebuah proyek baru.</li>
                        <li>Masuk ke dasbor Supabase, klik menu <b>SQL Editor</b>.</li>
                        <li>Buat query SQL baru, salin skema tabel relasional di bawah ini, kemudian klik tombol <b>Run</b> untuk membuat tabel database.</li>
                        <li>Salin kode inisialisasi Client SDK di bawah ke dalam proyek React Anda agar data bidan & pasien tersimpan permanen di PostgreSQL Cloud secara real-time!</li>
                      </ol>
                    </div>

                    <div className="space-y-4">
                      {/* Supabase SQL DDL Block */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                            <Database size={14} className="text-emerald-600" />
                            <span>1. Skema Query DDL SQL Editor</span>
                          </span>
                          <button
                            onClick={() => handleCopy(supabaseSqlTemplate, 'sheet')}
                            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
                          >
                            {copiedKey === 'sheet' ? <Check size={12} className="text-emerald-600" /> : <Clipboard size={12} />}
                            <span>{copiedKey === 'sheet' ? 'Tersalin!' : 'Salin Skema SQL'}</span>
                          </button>
                        </div>
                        <pre className="bg-slate-900 text-emerald-400 text-[10.5px] p-3 rounded-xl overflow-x-auto max-h-[220px] font-mono leading-normal shadow-inner w-full">
                          {supabaseSqlTemplate}
                        </pre>
                      </div>

                      {/* Supabase JS Implementation Block */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                            <FileText size={14} className="text-emerald-600" />
                            <span>2. Contoh Model SDK JavaScript/React (Direct Integration)</span>
                          </span>
                          <button
                            onClick={() => handleCopy(supabaseJsTemplate, 'html')}
                            className="bg-emerald-50 text-emerald-750 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
                          >
                            {copiedKey === 'html' ? <Check size={12} className="text-emerald-600" /> : <Clipboard size={12} />}
                            <span>{copiedKey === 'html' ? 'Tersalin!' : 'Salin Kode Model JS'}</span>
                          </button>
                        </div>
                        <pre className="bg-slate-900 text-slate-200 text-[10.5px] p-3 rounded-xl overflow-x-auto max-h-[180px] font-mono leading-normal shadow-inner w-full">
                          {supabaseJsTemplate}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUB TAB 3 CONTENT: WHATSAPP NOTIFICATION PORTAL */}
                {integrationSubTab === 'whatsapp' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="bg-sky-50 border border-sky-100 p-4 rounded-xl text-xs space-y-2 text-sky-950 leading-relaxed">
                      <h4 className="font-bold flex items-center gap-1.5 text-sky-900">
                        <Info size={14} className="text-sky-700" />
                        <span>Panduan Integrasi Notifikasi Pengingat WhatsApp (Fonnte / Wablas):</span>
                      </h4>
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Daftarkan nomor telepon dinas / puskesmas Anda di gateway WhatsApp termurah Indonesia (misalnya <b>Fonnte.com</b> atau <b>Wablas</b>).</li>
                        <li>Dapatkan token autentikasi API (API Key) resmi dari dasbor penyedia.</li>
                        <li><b>Metode 1 (Langsung di Aplikasi):</b> Gunakan kode JavaScript Fetch di bawah ini ke dalam penanganan tombol WhatsApp dasbor untuk langsung membypass pengiriman ke server WhatsApp tanpa membuka tab chat browser manual.</li>
                        <li><b>Metode 2 (Otomatis via Google Sheets):</b> Gunakan skrip Apps Script pemicu dinamis di bawah. Setiap kali bidan / admin posyandu mengupdate baris imunisasi di Spreadsheet, server Google akan langsung menembak pesan WA pengingat otomatis ke HP Ibu Hamil secara terjadwal / real-time!</li>
                      </ol>
                    </div>

                    <div className="space-y-4">
                      {/* WA JS API Implementation */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                            <Send size={13} className="text-sky-600" />
                            <span>1. Skrip API Fetch Direct untuk React (Aplikasi)</span>
                          </span>
                          <button
                            onClick={() => handleCopy(whatsappCodeTemplate, 'gs')}
                            className="bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
                          >
                            {copiedKey === 'gs' ? <Check size={12} className="text-emerald-600" /> : <Clipboard size={12} />}
                            <span>{copiedKey === 'gs' ? 'Tersalin!' : 'Salin Kode React'}</span>
                          </button>
                        </div>
                        <pre className="bg-slate-900 text-slate-200 text-[10.5px] p-3 rounded-xl overflow-x-auto max-h-[200px] font-mono leading-normal shadow-inner w-full">
                          {whatsappCodeTemplate}
                        </pre>
                      </div>

                      {/* WA Google Apps Script Hook */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                            <FileText size={14} className="text-sky-600" />
                            <span>2. Google Apps Script Trigger Pengingat Otomatis (Code.gs Webhook)</span>
                          </span>
                          <button
                            onClick={() => handleCopy(whatsappGasTemplate, 'html')}
                            className="bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
                          >
                            {copiedKey === 'html' ? <Check size={12} className="text-emerald-600" /> : <Clipboard size={12} />}
                            <span>{copiedKey === 'html' ? 'Tersalin!' : 'Salin Kode GAS'}</span>
                          </button>
                        </div>
                        <pre className="bg-slate-900 text-sky-300 text-[10.5px] p-3 rounded-xl overflow-x-auto max-h-[180px] font-mono leading-normal shadow-inner w-full">
                          {whatsappGasTemplate}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* ======================= TAB 6: KELOLA AKUN DESA ======================= */}
          {activeTab === 'accounts' && user.role === 'Puskesmas' && (
            <div id="accounts-management-tab" className="space-y-6 animate-fadeIn">
              
              {/* BRIEF INTRODUCTION SECTION */}
              <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-150 space-y-2">
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <span className="text-xl">👥</span> Hak Akses & Akun Petugas Kesehatan Desa
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Administrator Puskesmas Kabukarudi memiliki keleluasaan penuh untuk mendaftarkan akun bidan baru, mengubah kata sandi, memperbarui nama lengkap, atau menghentikan hak login petugas desa. Setiap desa yang terdaftar hanya dapat melihat dan mengelola data ibu hamil pada wilayah cakupan masing-masing.
                </p>
              </div>

              {/* STATS OVERVIEW CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-indigo-600 text-white rounded-2xl p-5 shadow-sm border border-indigo-500 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-100">Total Akun Terdaftar</p>
                    <h3 className="text-2xl font-black mt-1 font-mono">{accounts.length}</h3>
                  </div>
                  <div className="text-2xl bg-indigo-500/20 w-12 h-12 rounded-xl flex items-center justify-center">👥</div>
                </div>

                <div className="bg-sky-600 text-white rounded-2xl p-5 shadow-sm border border-sky-500 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-sky-100">Petugas Bidan Desa</p>
                    <h3 className="text-2xl font-black mt-1 font-mono">
                      {accounts.filter(a => a.role === 'Desa').length}
                    </h3>
                  </div>
                  <div className="text-2xl bg-sky-500/20 w-12 h-12 rounded-xl flex items-center justify-center">🏡</div>
                </div>

                <div className="bg-emerald-600 text-white rounded-2xl p-5 shadow-sm border border-emerald-500 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-100">Cakupan Wilayah Puskesmas</p>
                    <h3 className="text-2xl font-black mt-1 font-mono">{VILLAGES.length} Desa</h3>
                  </div>
                  <div className="text-2xl bg-emerald-500/20 w-12 h-12 rounded-xl flex items-center justify-center">🗺️</div>
                </div>
              </div>

              {/* INTERACTIVE TABLE & CONTROLS */}
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
                <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                    <input 
                      type="text"
                      placeholder="Cari akun berdasarkan nama / desa / username..."
                      value={accSearch}
                      onChange={(e) => setAccSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-805 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <button 
                    onClick={openNewAccountForm}
                    className="p-2 px-4 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>BUAT AKUN BARU</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-100 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200">
                      <tr>
                        <th className="p-4">🩺 Nama Lengkap Petugas & Role</th>
                        <th className="p-4">🏡 Desa Penugasan</th>
                        <th className="p-4">🔐 Username Log</th>
                        <th className="p-4">🔑 Kata Sandi / Password</th>
                        <th className="p-4 text-center">Aksi Pengelolaan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700">
                      {accounts
                        .filter(a => {
                          const query = accSearch.toLowerCase();
                          return (
                            a.namaLengkap.toLowerCase().includes(query) ||
                            a.desa.toLowerCase().includes(query) ||
                            a.username.toLowerCase().includes(query)
                          );
                        })
                        .map((acc, index) => {
                          const isPuskesmas = acc.username.toLowerCase() === 'puskesmas';
                          return (
                            <tr key={acc.username + index} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 space-y-1">
                                <div className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                                  <span>{acc.namaLengkap}</span>
                                  {isPuskesmas && (
                                    <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[9px] font-black uppercase">
                                      Primary Admin
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-bold tracking-wider">
                                  HAK AKSES: {acc.role.toUpperCase()}
                                </div>
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                  isPuskesmas ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-800'
                                }`}>
                                  {isPuskesmas ? 'Semua Desa (Puskesmas)' : `Desa: ${acc.desa}`}
                                </span>
                              </td>
                              <td className="p-4 font-mono font-bold text-slate-600">{acc.username}</td>
                              <td className="p-4">
                                <span className="bg-slate-100 px-2 py-1 rounded font-mono text-[11px] border border-slate-200 text-slate-500 block w-fit">
                                  {acc.password && acc.password.length === 64 ? '🔐 SHA-256 Hash' : '⚠️ Plain Text'}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button 
                                    onClick={() => openEditAccountForm(acc)}
                                    className="p-1 px-2 border border-slate-200 text-sky-600 hover:text-white hover:bg-sky-600 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1 font-semibold"
                                    title="Edit Akun"
                                  >
                                    <Edit size={12} />
                                    <span>Edit</span>
                                  </button>

                                  
                                  <button 
                                    onClick={() => handleDeleteAccount(acc.username, acc.namaLengkap)}
                                    className={`p-1 px-2 border rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1 font-semibold ${
                                      isPuskesmas 
                                        ? 'border-slate-100 text-slate-300 cursor-not-allowed' 
                                        : 'border-rose-200 text-rose-600 hover:text-white hover:bg-rose-650'
                                    }`}
                                    disabled={isPuskesmas}
                                    title={isPuskesmas ? "Akun puskesmas utama tidak bisa dihapus" : "Hapus Akun"}
                                  >
                                    <Trash size={12} />
                                    <span>Hapus</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                      {accounts.filter(a => {
                        const query = accSearch.toLowerCase();
                        return (
                          a.namaLengkap.toLowerCase().includes(query) ||
                          a.desa.toLowerCase().includes(query) ||
                          a.username.toLowerCase().includes(query)
                        );
                      }).length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-10 text-slate-400 font-bold italic">
                            Tidak ditemukan akun yang cocok dengan kata pencarian "{accSearch}".
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'lacar' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row items-start gap-4">
                <div className="p-3 bg-teal-50 text-teal-700 rounded-full shrink-0">
                  <ShieldAlert size={24} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800">Pusat Lacak & Lembar Lacak Imunisasi TT</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Pantau status imunisasi seluruh ibu hamil — lacak kasus <strong>Drop Out</strong>, <strong>Mendekati Jadwal</strong>, atau lihat seluruh data dalam <strong>Lembar Lacak</strong>.
                  </p>
                </div>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl max-w-md border border-slate-200">
                <button onClick={() => setLacakSubFilter('all')} className={`flex-1 py-1.5 text-center text-xs font-extrabold rounded-lg cursor-pointer transition-all ${lacakSubFilter === 'all' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}>
                  Semua Data ({patients.filter(p => VILLAGES.includes(p.desa)).length})
                </button>
                <button onClick={() => setLacakSubFilter('dropout')} className={`flex-1 py-1.5 text-center text-xs font-extrabold rounded-lg cursor-pointer transition-all ${lacakSubFilter === 'dropout' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}>
                  🚨 Drop Out ({filteredPatients.filter(p => calculateKeteranganStatus(p) === 'Drop Out').length})
                </button>
                <button onClick={() => setLacakSubFilter('mendekati')} className={`flex-1 py-1.5 text-center text-xs font-extrabold rounded-lg cursor-pointer transition-all ${lacakSubFilter === 'mendekati' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}>
                  ⏳ Mendekati ({filteredPatients.filter(p => calculateKeteranganStatus(p) === 'Mendekati Jadwal').length})
                </button>
              </div>

              {lacakSubFilter === 'dropout' || lacakSubFilter === 'mendekati' ? (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      {lacakSubFilter === 'dropout' ? (
                        <><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span><span>Terdeteksi {filteredPatients.filter(p => calculateKeteranganStatus(p) === 'Drop Out').length} Kasus Drop Out (Telat Dosis)</span></>
                      ) : (
                        <><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block animate-pulse"></span><span>Terdeteksi {filteredPatients.filter(p => calculateKeteranganStatus(p) === 'Mendekati Jadwal').length} Ibu Hamil Mendekati Jadwal TT</span></>
                      )}
                    </h4>
                    <button onClick={() => setShowWaLog(!showWaLog)} className="text-xs text-teal-600 hover:underline font-bold cursor-pointer">
                      {showWaLog ? 'Tutup Log' : 'Lihat Log WA'}
                    </button>
                  </div>
                  {showWaLog && (
                    <div className="bg-slate-50 border-b border-slate-200 p-4 space-y-2 text-xs">
                      <p className="font-bold text-slate-700">Riwayat Pengiriman WhatsApp:</p>
                      <div className="max-h-[150px] overflow-y-auto space-y-1.5">
                        {whatsappLogs.length === 0 ? (
                          <p className="text-slate-400 italic">Belum ada pesan terkirim pada sesi ini.</p>
                        ) : (
                          whatsappLogs.map((log) => (
                            <div key={log.id} className="p-2 bg-white rounded border border-slate-200 text-[11px] flex justify-between items-center">
                              <div><p className="font-bold">{log.namaLengkapIbu} ({log.nomorHp}) - {log.desa}</p><p className="text-slate-500 italic">"{log.pesan.slice(0, 75)}..."</p></div>
                              <div className="text-right shrink-0 ml-3"><span className="text-emerald-600 font-extrabold block">✓ {log.status}</span><span className="text-slate-400 text-[9px]">{log.tanggalKirim}</span></div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                  <div className="divide-y divide-slate-100">
                    {(() => {
                      const targetStatus = lacakSubFilter === 'dropout' ? 'Drop Out' : 'Mendekati Jadwal';
                      const targetList = filteredPatients.filter(p => calculateKeteranganStatus(p) === targetStatus);
                      if (targetList.length === 0) {
                        return (
                          <div className="p-10 text-center text-slate-400">
                            <CheckCircle size={36} className={`${lacakSubFilter === 'dropout' ? 'text-emerald-500' : 'text-sky-500'} mx-auto mb-2`} />
                            <p className="font-bold text-xs uppercase tracking-wide">Semua Terpantau Aman</p>
                            <p className="text-xs pt-1">
                              {lacakSubFilter === 'dropout'
                                ? 'Tidak ada ibu hamil dengan status Drop Out di wilayah cakupan rujukan Anda.'
                                : 'Tidak ada ibu hamil dengan jadwal imunisasi berikutnya dalam 14 hari kedepan.'}
                            </p>
                          </div>
                        );
                      }
                      return targetList.map((p) => {
                        const info = getPatientScheduleInfo(p);
                        return (
                          <div key={p.no} className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                            lacakSubFilter === 'dropout' ? 'bg-rose-50/10' : 'bg-amber-50/10'
                          }`}>
                            <div className="space-y-1.5">
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  lacakSubFilter === 'dropout' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                                }`}>Desa {p.desa}</span>
                                <h5 className="font-extrabold text-slate-800 text-sm">{p.namaLengkapIbu}</h5>
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                  lacakSubFilter === 'dropout' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-yellow-50 text-yellow-800 border border-yellow-200 animate-pulse'
                                }`}>{lacakSubFilter === 'dropout' ? 'Drop Out' : 'Segera Vaksinasi'}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
                                <p>📞 No. HP: <span className="font-bold text-slate-700">{p.nomorHp || 'Tidak Ada'}</span></p>
                                <p>🎂 NIK: <span className="font-mono text-slate-700">{p.nikIbu}</span></p>
                                <p>🤰 Obstetri: <span className="font-bold font-mono text-slate-700">G{p.gravida ?? '-'} P{p.paritas ?? '-'} A{p.abortus ?? '-'}</span></p>
                                <p>⏳ Jarak Lahir: <span className="font-bold text-slate-700">{p.jarakKelahiran || 'Tidak Ada / -'}</span></p>
                                <p>📅 Dosis Terakhir: <span className="font-bold text-slate-700">{info.prevAntigen || 'Belum Ada'} ({info.prevDateStr || '-'})</span></p>
                                <p className={lacakSubFilter === 'dropout' ? 'text-red-700 font-bold' : 'text-amber-700 font-bold'}>
                                  {lacakSubFilter === 'dropout' ? '🚨 Tertunda:' : '⏳ Jadwal Dekat:'} <span className="font-extrabold">{info.nextDose} ({info.dueDateStr || 'Segera'})</span>
                                </p>
                              </div>
                              <p className={`text-[11px] font-semibold italic ${lacakSubFilter === 'dropout' ? 'text-red-700' : 'text-amber-700'}`}>
                                {lacakSubFilter === 'dropout'
                                  ? <>⚙️ Aturan: Minimal selang waktu ke {info.nextDose} telah lewat. Mohon hubungi bidan segera.</>
                                  : <>⏳ Estimasi: Sisa {info.daysRemaining} Hari lagi sebelum tenggat jatuh tempo optimal.</>}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2 justify-end shrink-0 pt-2 md:pt-0">
                              <select
                                value={p.tindakLanjut || ''}
                                onChange={e => handleTindakLanjutChange(p.no, e.target.value)}
                                className={`text-[11px] font-bold px-1.5 py-1.5 rounded-lg border cursor-pointer outline-none ${
                                  p.tindakLanjut === 'Hubungi Via Whatsapp' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                  p.tindakLanjut === 'Pengulangan Dosis' ? 'bg-purple-50 border-purple-200 text-purple-700' :
                                  'bg-white border-slate-200 text-slate-400'
                                }`}
                              >
                                <option value="">Tindak Lanjut</option>
                                <option value="Hubungi Via Whatsapp">📱 Hubungi Via Whatsapp</option>
                                <option value="Pengulangan Dosis">💉 Pengulangan Dosis</option>
                              </select>
                              <button onClick={() => requestWhatsappModal(p)} className={`p-2 rounded-lg text-white font-bold text-xs flex items-center space-x-1 cursor-pointer transition-colors ${lacakSubFilter === 'dropout' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
                                <Send size={13} /><span>{lacakSubFilter === 'dropout' ? 'Kirim Imbauan WA' : 'Kirim Pengingat WA'}</span>
                              </button>
                              <button onClick={() => openEditForm(p)} className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 font-bold text-xs flex items-center cursor-pointer transition-colors">
                                Perbarui Rekam
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={exportLacarPdf} className="text-xs font-bold bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl transition-all flex items-center gap-2">
                      Export PDF (Landscape A4)
                    </button>
                    <button onClick={exportLacarExcel} className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition-all flex items-center gap-2">
                      Export Excel
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl shadow-xs border border-slate-150 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-teal-600 text-white text-left">
                          <th className="p-2 font-bold whitespace-nowrap">Nama Ibu Hamil</th>
                          <th className="p-2 font-bold whitespace-nowrap">NIK</th>
                          <th className="p-2 font-bold whitespace-nowrap">Umur</th>
                          <th className="p-2 font-bold whitespace-nowrap">Desa</th>
                          <th className="p-2 font-bold whitespace-nowrap">HPHT</th>
                          <th className="p-2 font-bold whitespace-nowrap">G</th>
                          <th className="p-2 font-bold whitespace-nowrap">P</th>
                          <th className="p-2 font-bold whitespace-nowrap">A</th>
                          <th className="p-2 font-bold whitespace-nowrap">Status TT</th>
                          <th className="p-2 font-bold whitespace-nowrap">TT Terakhir</th>
                          <th className="p-2 font-bold whitespace-nowrap">TT Berikutnya</th>
                          <th className="p-2 font-bold whitespace-nowrap">Tindak Lanjut</th>
                          <th className="p-2 font-bold whitespace-nowrap">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patients.filter(p => VILLAGES.includes(p.desa)).map((p, i) => (
                          <tr key={p.no} className={i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                            <td className="p-2 font-semibold text-slate-800 whitespace-nowrap">{p.namaLengkapIbu}</td>
                            <td className="p-2 text-slate-600 whitespace-nowrap">{p.nikIbu}</td>
                            <td className="p-2 text-slate-600 whitespace-nowrap">{getAgeFromNik(p.nikIbu)}</td>
                            <td className="p-2 text-slate-600 whitespace-nowrap">{p.desa}</td>
                            <td className="p-2 text-slate-600 whitespace-nowrap">{p.hpht || '-'}</td>
                            <td className="p-2 text-slate-600">{p.gravida ?? '-'}</td>
                            <td className="p-2 text-slate-600">{p.paritas ?? '-'}</td>
                            <td className="p-2 text-slate-600">{p.abortus ?? '-'}</td>
                            <td className="p-2 whitespace-nowrap">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${getCurrentTtDose(p) === 'Belum' ? 'bg-red-100 text-red-700' : getCurrentTtDose(p) === 'TT5' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{getCurrentTtDose(p)}</span>
                            </td>
                            <td className="p-2 text-slate-600 whitespace-nowrap">{getLastTtDate(p)}</td>
                            <td className="p-2 text-slate-600 whitespace-nowrap">{getNextTtDate(p)}</td>
                            <td className="p-2 whitespace-nowrap">
                              <select
                                value={p.tindakLanjut || ''}
                                onChange={e => handleTindakLanjutChange(p.no, e.target.value)}
                                className={`text-[11px] font-bold px-1 py-0.5 rounded-lg border cursor-pointer outline-none ${
                                  p.tindakLanjut === 'Hubungi Via Whatsapp' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                  p.tindakLanjut === 'Pengulangan Dosis' ? 'bg-purple-50 border-purple-200 text-purple-700' :
                                  'bg-white border-slate-200 text-slate-400'
                                }`}
                              >
                                <option value="">-</option>
                                <option value="Hubungi Via Whatsapp">📱 Hubungi Via Whatsapp</option>
                                <option value="Pengulangan Dosis">💉 Pengulangan Dosis</option>
                              </select>
                            </td>
                            <td className="p-2 text-slate-600 text-[11px]">{p.keterangan || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

            {/* Elegant spacer box at the bottom of the main scroll container to guarantee perfect breathing room */}
            <div className="h-20 md:h-4 w-full shrink-0" />
            </div>
          </div>
        </div>
      )}

      {/* FOOTER LOGO OR PHONE BOTTOM TABS (MOBILE FRIENDLY SHIFT BAR) */}
      <footer className="md:hidden fixed bottom-0 left-0 right-0 z-40 select-none bg-white border-t-2 border-slate-200 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]" style={{paddingBottom: 'env(safe-area-inset-bottom)'}}>
        
        {user ? (
          <div className="flex w-full items-stretch">
            <button 
              onClick={() => setActiveTab('beranda')}
              className={`flex flex-col items-center flex-1 justify-center py-3 gap-1 transition-all cursor-pointer min-h-[60px] ${activeTab === 'beranda' ? 'text-sky-600' : 'text-slate-400'}`}
            >
              <TrendingUp size={22} strokeWidth={activeTab === 'beranda' ? 2.5 : 1.8} />
              <span className={`text-[11px] font-bold leading-none ${activeTab === 'beranda' ? 'text-sky-600' : 'text-slate-400'}`}>Beranda</span>
              {activeTab === 'beranda' && <span className="absolute bottom-0 w-8 h-0.5 bg-sky-500 rounded-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('input')}
              className={`flex flex-col items-center flex-1 justify-center py-3 gap-1 transition-all cursor-pointer min-h-[60px] ${activeTab === 'input' ? 'text-sky-600' : 'text-slate-400'}`}
            >
              <FileText size={22} strokeWidth={activeTab === 'input' ? 2.5 : 1.8} />
              <span className={`text-[11px] font-bold leading-none ${activeTab === 'input' ? 'text-sky-600' : 'text-slate-400'}`}>Input</span>
              {activeTab === 'input' && <span className="absolute bottom-0 w-8 h-0.5 bg-sky-500 rounded-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('lacar')}
              className={`flex flex-col items-center flex-1 justify-center py-3 gap-1 relative transition-all cursor-pointer min-h-[60px] ${activeTab === 'lacar' ? 'text-sky-600' : 'text-slate-400'}`}
            >
              <div className="relative">
                <ShieldAlert size={22} strokeWidth={activeTab === 'lacar' ? 2.5 : 1.8} className={activeTab !== 'lacar' && stats.dropOut > 0 ? 'text-red-500' : ''} />
                {stats.dropOut > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" />
                )}
              </div>
              <span className={`text-[11px] font-bold leading-none ${activeTab === 'lacar' ? 'text-sky-600' : stats.dropOut > 0 ? 'text-red-500' : 'text-slate-400'}`}>Lacak</span>
              {activeTab === 'lacar' && <span className="absolute bottom-0 w-8 h-0.5 bg-sky-500 rounded-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('interval')}
              className={`flex flex-col items-center flex-1 justify-center py-3 gap-1 transition-all cursor-pointer min-h-[60px] ${activeTab === 'interval' ? 'text-sky-600' : 'text-slate-400'}`}
            >
              <Info size={22} strokeWidth={activeTab === 'interval' ? 2.5 : 1.8} />
              <span className={`text-[11px] font-bold leading-none ${activeTab === 'interval' ? 'text-sky-600' : 'text-slate-400'}`}>Edukasi</span>
              {activeTab === 'interval' && <span className="absolute bottom-0 w-8 h-0.5 bg-sky-500 rounded-full" />}
            </button>
            {user.role === 'Puskesmas' && (
              <button 
                onClick={() => setActiveTab('accounts')}
                className={`flex flex-col items-center flex-1 justify-center py-3 gap-1 transition-all cursor-pointer min-h-[60px] ${activeTab === 'accounts' ? 'text-sky-600' : 'text-slate-400'}`}
              >
                <Users size={22} strokeWidth={activeTab === 'accounts' ? 2.5 : 1.8} />
                <span className={`text-[11px] font-bold leading-none ${activeTab === 'accounts' ? 'text-sky-600' : 'text-slate-400'}`}>Akun</span>
                {activeTab === 'accounts' && <span className="absolute bottom-0 w-8 h-0.5 bg-sky-500 rounded-full" />}
              </button>
            )}
          </div>
        ) : (
          <div className="w-full text-center text-slate-400 py-3 font-mono text-[10px]">
            SMART TT V1.2 • Dinas Kesehatan Kabupaten Sumba Barat
          </div>
        )}
      </footer>

      {/* ============================================================= */}
      {/* DIALOG: ADD/EDIT ACCOUNT FORM */}
      {/* ============================================================= */}
      {isAccountFormOpen && (
        <div id="account-form-overlay" className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-3 z-50 overflow-y-auto block backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-5 md:p-6 w-full max-w-md space-y-4 my-8 font-sans">
            
            {/* Header Form */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base md:text-lg font-black text-slate-800">
                {editingAccount ? `Perbarui Akun Petugas` : 'Buat Akun Petugas Baru'}
              </h3>
              <button 
                type="button"
                onClick={() => setIsAccountFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form Fields inside container */}
            <form onSubmit={handleSaveAccount} className="space-y-4">
              
              {/* Nama Lengkap */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Lengkap Petugas / Bidan *</label>
                <input 
                  type="text"
                  required
                  value={accFormNamaLengkap}
                  onChange={(e) => setAccFormNamaLengkap(e.target.value)}
                  placeholder="Contoh: Bidan Maria, S.Keb"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 bg-white"
                />
              </div>

              {/* Username & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Username Log *</label>
                  <input 
                    type="text"
                    required
                    disabled={!!editingAccount}
                    value={accFormUsername}
                    onChange={(e) => setAccFormUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                    placeholder="Contoh: bidan_sodana"
                    className="w-full p-2.5 border border-slate-300 bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800"
                  />
                  {editingAccount && <p className="text-[9px] text-slate-400 mt-0.5 font-bold">Username tidak dapat diubah</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {editingAccount ? 'Kata Sandi Baru' : 'Kata Sandi / Password *'}
                  </label>
                  <input 
                    type="password"
                    required={!editingAccount}
                    value={accFormPassword}
                    onChange={(e) => setAccFormPassword(e.target.value)}
                    placeholder={editingAccount ? 'Kosongkan jika tidak diubah' : 'Minimal 6 karakter'}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 bg-white"
                  />
                </div>
              </div>

              {/* Konfirmasi Password - tampil jika password diisi atau akun baru */}
              {(!editingAccount || accFormPassword.trim() !== '') && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Konfirmasi Kata Sandi *
                  </label>
                  <input
                    type="password"
                    required={!editingAccount || accFormPassword.trim() !== ''}
                    value={accFormConfirmPassword}
                    onChange={(e) => setAccFormConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi"
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 bg-white"
                  />
                  {accFormPassword && accFormConfirmPassword && accFormPassword !== accFormConfirmPassword && (
                    <p className="text-[10px] text-rose-500 mt-0.5 font-bold">⚠ Kata sandi tidak cocok</p>
                  )}
                  {accFormPassword && accFormConfirmPassword && accFormPassword === accFormConfirmPassword && (
                    <p className="text-[10px] text-emerald-600 mt-0.5 font-bold">✓ Kata sandi cocok</p>
                  )}
                </div>
              )}
              {editingAccount && accFormPassword.trim() === '' && (
                <p className="text-[10px] text-slate-400 font-semibold -mt-2">🔒 Kosongkan kata sandi jika tidak ingin mengubahnya.</p>
              )}

              {/* Role Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Peran Pengguna (Role) *</label>
                <select 
                  value={accFormRole}
                  onChange={(e) => setAccFormRole(e.target.value as 'Puskesmas' | 'Desa')}
                  className="w-full p-2.5 border border-slate-300 bg-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-850"
                >
                  <option value="Desa">Petugas Bidan Desa (Terbatas Wilayah)</option>
                  <option value="Puskesmas">Administrator Puskesmas (Akses Penuh)</option>
                </select>
              </div>

              {/* Desa Selection - Only relevant if role is Desa */}
              {accFormRole === 'Desa' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Wilayah Desa Penugasan *</label>
                  <select 
                    value={accFormDesa}
                    onChange={(e) => setAccFormDesa(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 bg-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-850"
                  >
                    {VILLAGES.map(v => (
                      <option key={v} value={v}>Desa {v}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Petugas hanya dapat melihat, menambah, atau mengedit rekam medis ibu hamil yang berasal dari desa ini.
                  </p>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAccountFormOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-sm hover:shadow-md transition-colors cursor-pointer"
                >
                  {editingAccount ? 'Simpan Perubahan' : 'Buat Akun'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* DIALOG/SLIDEOVER: ADD/EDIT PATIENT FORM */}
      {/* ============================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-3 z-50 overflow-y-auto block backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-5 md:p-6 w-full max-w-lg space-y-4 my-8 font-sans">
            
            {/* Header Form */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base md:text-lg font-black text-slate-800">
                {editingPatient ? `Perbarui Rekam Vaksin` : 'Daftarkan Ibu Hamil Baru'}
              </h3>
              <button 
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form Fields inside container */}
            <form onSubmit={savePatientSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              
              {/* NIK and Nama */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">NIK Ibu Hamil (16 Digit)</label>
                  <div className="relative">
                    <input 
                      type="text"
                      required
                      maxLength={16}
                      minLength={16}
                      value={formNik}
                      onChange={(e) => { setFormNik(e.target.value); setNikMatch(''); }}
                      placeholder="Contoh: 531201xxxxxxxxxx"
                      className="w-full p-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 pr-7"
                      style={{ borderColor: nikMatch === 'found' ? '#059669' : nikMatch === 'not_found' ? '#dc2626' : undefined }}
                    />
                    {nikMatch === 'found' && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-600 text-xs font-bold" title="Data ditemukan">✓</span>}
                    {nikMatch === 'not_found' && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-rose-600 text-xs font-bold" title="NIK baru">✗</span>}
                  </div>
                  {nikMatch === 'found' && <p className="text-[10px] text-emerald-600 mt-0.5">Data ditemukan, form terisi otomatis. Edit lalu simpan untuk memperbarui.</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Lengkap Ibu</label>
                  <input 
                    type="text"
                    required
                    value={formNama}
                    onChange={(e) => setFormNama(e.target.value)}
                    placeholder="Masukkan nama lengkap"
                    className="w-full p-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                  />
                </div>
              </div>

              {/* Desa & HP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Desa (Role Lock Otoritas)</label>
                  {user.role === 'Desa' ? (
                    <input 
                      type="text"
                      readOnly
                      disabled
                      value={user.desa}
                      className="w-full p-2 bg-slate-100 border border-slate-200 text-slate-500 text-sm rounded-lg font-semibold"
                    />
                  ) : (
                    <select 
                      value={formDesa}
                      onChange={(e) => setFormDesa(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                    >
                      {VILLAGES.map(v => (
                        <option key={v} value={v}>Desa {v}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nomor WhatsApp Aktif</label>
                  <input 
                    type="text"
                    value={formHp}
                    onChange={(e) => setFormHp(e.target.value)}
                    placeholder="Contoh: 081234xxxx"
                    className="w-full p-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                  />
                </div>
              </div>

              {/* HPHT & TGL Registrasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">HPHT (Hari Pertama Haid Terakhir)</label>
                  <input 
                    type="date"
                    value={formHpht}
                    onChange={(e) => setFormHpht(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tanggal Registrasi SMART</label>
                  <input 
                    type="date"
                    value={formTanggalRegistrasi}
                    onChange={(e) => setFormTanggalRegistrasi(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                  />
                </div>
              </div>

              {/* Gravida, Paritas, Abortus & Jarak Kelahiran */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
                <p className="text-[10px] font-extrabold text-teal-800 uppercase tracking-wider">Data Obstetri Ibu Hamil (G-P-A & Jarak Kelahiran)</p>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" title="Gravida (Jumlah Kehamilan termasuk yang sekarang)">Gravida (G)</label>
                    <input 
                      type="number"
                      min={1}
                      value={formGravida}
                      onChange={(e) => setFormGravida(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="G"
                      className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" title="Paritas (Jumlah bayi lahir hidup/mati >20 minggu)">Paritas (P)</label>
                    <input 
                      type="number"
                      min={0}
                      value={formParitas}
                      onChange={(e) => setFormParitas(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="P"
                      className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" title="Abortus (Jumlah keguguran <20 minggu)">Abortus (A)</label>
                    <input 
                      type="number"
                      min={0}
                      value={formAbortus}
                      onChange={(e) => setFormAbortus(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="A"
                      className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" title="Jarak Kelahiran Terakhir">Jarak Lahir</label>
                    <input 
                      type="text"
                      value={formJarakKelahiran}
                      onChange={(e) => setFormJarakKelahiran(e.target.value)}
                      placeholder="Contoh: 2 Th"
                      className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* DOSAGE RECORDS CHECKLIST (INDIVIDUALLY DATED ACCORDING TO USER FLOW) */}
              <fieldset className="bg-slate-50 p-3 rounded-xl border border-slate-200 mt-2 space-y-3">
                <legend className="text-[10px] font-black tracking-widest text-teal-700 uppercase bg-teal-100 px-3.5 py-1 rounded-full border border-teal-200">
                  Daftar Suntikan & Tanggal Imunisasi
                </legend>
                
                {/* TT1 */}
                <div className="space-y-1">
                  <label className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                    <input 
                      type="checkbox" 
                      checked={dosageTt1}
                      onChange={(e) => setDosageTt1(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4.5 w-4.5"
                    />
                    <span>Suntikan TT1</span>
                  </label>
                  {dosageTt1 && (
                    <div className="pl-6">
                      <input 
                        type="date"
                        required
                        value={dateTt1}
                        onChange={(e) => setDateTt1(e.target.value)}
                        className="p-1.5 rounded-lg border border-slate-300 text-xs w-full max-w-xs focus:ring-2 focus:ring-teal-500 text-slate-800"
                        placeholder="Tanggal TT1"
                      />
                    </div>
                  )}
                </div>

                {/* TT2 */}
                <div className="space-y-1">
                  <label className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                    <input 
                      type="checkbox" 
                      checked={dosageTt2}
                      onChange={(e) => setDosageTt2(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4.5 w-4.5"
                    />
                    <span>Suntikan TT2</span>
                  </label>
                  {dosageTt2 && (
                    <div className="pl-6">
                      <input 
                        type="date"
                        required
                        value={dateTt2}
                        onChange={(e) => setDateTt2(e.target.value)}
                        className="p-1.5 rounded-lg border border-slate-300 text-xs w-full max-w-xs focus:ring-2 focus:ring-teal-500 text-slate-800"
                        placeholder="Tanggal TT2"
                      />
                    </div>
                  )}
                </div>

                {/* TT3 */}
                <div className="space-y-1">
                  <label className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                    <input 
                      type="checkbox" 
                      checked={dosageTt3}
                      onChange={(e) => setDosageTt3(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4.5 w-4.5"
                    />
                    <span>Suntikan TT3</span>
                  </label>
                  {dosageTt3 && (
                    <div className="pl-6">
                      <input 
                        type="date"
                        required
                        value={dateTt3}
                        onChange={(e) => setDateTt3(e.target.value)}
                        className="p-1.5 rounded-lg border border-slate-300 text-xs w-full max-w-xs focus:ring-2 focus:ring-teal-500 text-slate-800"
                        placeholder="Tanggal TT3"
                      />
                    </div>
                  )}
                </div>

                {/* TT4 */}
                <div className="space-y-1">
                  <label className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                    <input 
                      type="checkbox" 
                      checked={dosageTt4}
                      onChange={(e) => setDosageTt4(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4.5 w-4.5"
                    />
                    <span>Suntikan TT4</span>
                  </label>
                  {dosageTt4 && (
                    <div className="pl-6">
                      <input 
                        type="date"
                        required
                        value={dateTt4}
                        onChange={(e) => setDateTt4(e.target.value)}
                        className="p-1.5 rounded-lg border border-slate-300 text-xs w-full max-w-xs focus:ring-2 focus:ring-teal-500 text-slate-800"
                        placeholder="Tanggal TT4"
                      />
                    </div>
                  )}
                </div>

                {/* TT5 */}
                <div className="space-y-1">
                  <label className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                    <input 
                      type="checkbox" 
                      checked={dosageTt5}
                      onChange={(e) => setDosageTt5(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4.5 w-4.5"
                    />
                    <span>Suntikan TT5</span>
                  </label>
                  {dosageTt5 && (
                    <div className="pl-6">
                      <input 
                        type="date"
                        required
                        value={dateTt5}
                        onChange={(e) => setDateTt5(e.target.value)}
                        className="p-1.5 rounded-lg border border-slate-300 text-xs w-full max-w-xs focus:ring-2 focus:ring-teal-500 text-slate-800"
                        placeholder="Tanggal TT5"
                      />
                    </div>
                  )}
                </div>

              </fieldset>

              {/* Action Buttons Submit */}
              <div className="flex items-center space-x-2 justify-end pt-3 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs bg-slate-100 font-bold text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-extrabold cursor-pointer"
                >
                  Selesai & Simpan Data
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* DIALOG: WHATSAPP MESSENGER OVERVIEW & REMINDER */}
      {/* ============================================================= */}
      {activeWhatsappModal && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-3 z-50 block backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-sm font-sans flex flex-col">
            
            {/* Mock phone view header */}
            <div className="bg-teal-700 text-white p-3 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-teal-800 text-white flex items-center justify-center font-bold">
                WA
              </div>
              <div>
                <h5 className="font-bold text-sm text-slate-50">{activeWhatsappModal.namaLengkapIbu}</h5>
                <p className="text-[10px] text-teal-100">{activeWhatsappModal.nomorHp || 'Tidak ada nomor'}</p>
              </div>
            </div>

            {/* Message composer box */}
            <div className="p-4 bg-slate-100 space-y-3 flex-grow">
              <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Isi Pesan Notifikasi</span>
              
              <textarea 
                rows={7}
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                className="w-full p-3 bg-white rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-inner"
              />

              <div className="bg-emerald-50 text-emerald-950 border border-emerald-100 p-3 rounded-lg text-[10px] space-y-1">
                <span className="font-bold block">✓ Gateway Gateway:</span>
                <p>Notifikasi akan dicatat pada log monitoring sistem SMART TT.</p>
              </div>
            </div>

            {/* Action panel */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2 justify-end">
              <button 
                onClick={() => setActiveWhatsappModal(null)}
                className="p-1.5 px-3 bg-slate-100 text-slate-600 rounded text-xs font-bold hover:bg-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  if (!activeWhatsappModal) return;
                  setConfirmDialog({
                    isOpen: true,
                    title: 'Konfirmasi Kirim WhatsApp',
                    message: `Apakah Anda yakin ingin mengirim pesan pengingat imunisasi TT ini kepada Ibu ${activeWhatsappModal.namaLengkapIbu}? Pesan akan dikirimkan ke nomor ${activeWhatsappModal.nomorHp || '08xxxxxxxx'}.`,
                    confirmText: 'Ya, Kirim',
                    cancelText: 'Kembali',
                    type: 'success',
                    onConfirm: () => {
                      executeSendWhatsApp();
                    }
                  });
                }}
                disabled={isSendingWa}
                className="p-1.5 px-3 bg-emerald-600 text-white rounded text-xs font-extrabold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer flex items-center space-x-1"
              >
                {isSendingWa ? (
                  <>
                    <RefreshCw className="animate-spin" size={12} />
                    <span>Mengirim...</span>
                  </>
                ) : (
                  <>
                    <Send size={12} />
                    <span>Kirim Pesan</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* DIALOG: GENERAL CONFIRMATION DIALOG (POLISHED CUSTOM MODAL) */}
      {/* ============================================================= */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-55 block backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-sm font-sans flex flex-col border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal header with distinct colors depending on type */}
            <div className={`p-4 flex items-center gap-3 border-b text-white ${
              confirmDialog.type === 'danger' ? 'bg-rose-600 border-rose-700' :
              confirmDialog.type === 'success' ? 'bg-emerald-600 border-emerald-700' :
              confirmDialog.type === 'warning' ? 'bg-amber-500 border-amber-600 text-slate-900' :
              'bg-teal-700 border-teal-800'
            }`}>
              <div className="shrink-0 p-1 bg-white/20 rounded-full">
                {confirmDialog.type === 'danger' ? <AlertTriangle size={15} /> :
                 confirmDialog.type === 'success' ? <CheckCircle size={15} /> :
                 confirmDialog.type === 'warning' ? <AlertTriangle size={15} /> :
                 <Info size={15} />}
              </div>
              <h4 className="font-extrabold text-xs tracking-wide uppercase">
                {confirmDialog.title}
              </h4>
            </div>

            {/* Modal content body */}
            <div className="p-5 space-y-4 text-left">
              <p className="text-slate-650 text-xs leading-relaxed font-semibold">
                {confirmDialog.message}
              </p>
            </div>

            {/* Modal action buttons */}
            <div className="p-3 bg-slate-50 border-t border-slate-200/60 flex items-center justify-end gap-2 shrink-0">
              <button 
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs bg-white border border-slate-200 font-bold text-slate-500 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors cursor-pointer"
              >
                {confirmDialog.cancelText || 'Batal'}
              </button>
              <button 
                type="button"
                onClick={() => {
                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                  confirmDialog.onConfirm();
                }}
                className={`px-4 py-2 text-xs text-white font-extrabold rounded-lg transition-colors cursor-pointer shadow-sm ${
                  confirmDialog.type === 'danger' ? 'bg-rose-600 hover:bg-rose-700' :
                  confirmDialog.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  confirmDialog.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 text-slate-900' :
                  'bg-teal-600 hover:bg-teal-750'
                }`}
              >
                {confirmDialog.confirmText || 'Konfirmasi'}
              </button>
            </div>

          </div>
        </div>
      )}



    </div>
  );
}
