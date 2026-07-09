/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Student, AttendanceRecord } from './types';
import StudentManager from './components/StudentManager';
import ScannerPanel from './components/ScannerPanel';
import AdminDashboard from './components/AdminDashboard';
import ParentPortal from './components/ParentPortal';
import SetupGuide from './components/SetupGuide';
import { 
  GraduationCap, 
  QrCode, 
  ClipboardList, 
  Users, 
  BookOpen, 
  Sparkles,
  RefreshCw,
  Bell
} from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'scan' | 'admin' | 'students' | 'parents' | 'guide'>('scan');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time listener for students
  useEffect(() => {
    setLoading(true);
    const studentsQuery = query(collection(db, 'students'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(studentsQuery, (snapshot) => {
      const list: Student[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Student);
      });
      setStudents(list);
      setLoading(false);
    }, (err) => {
      console.error("Gagal mendengarkan data siswa:", err);
      handleFirestoreError(err, OperationType.LIST, 'students');
      setError("Koneksi Firebase gagal. Pastikan konfigurasi valid.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time listener for attendance logs
  useEffect(() => {
    const attendanceQuery = query(collection(db, 'attendance'), orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(attendanceQuery, (snapshot) => {
      const list: AttendanceRecord[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as AttendanceRecord);
      });
      setAttendanceRecords(list);
    }, (err) => {
      console.error("Gagal mendengarkan logs presensi:", err);
      handleFirestoreError(err, OperationType.LIST, 'attendance');
    });

    return () => unsubscribe();
  }, []);

  const handleRefresh = () => {
    // Standard trigger for subcomponents
  };

  const handleNewAttendance = (record: AttendanceRecord) => {
    // We can show browser-native or custom toast here if we want
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-800 antialiased flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 z-40 sticky top-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-700 text-white rounded-lg flex items-center justify-center font-bold text-xl shadow-md shadow-emerald-900/10">
            A
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold text-slate-800 leading-none">Sistem Absensi Pintar</h1>
            <p className="text-[10px] md:text-xs text-slate-500 font-medium mt-1">Madrasah Aliyah Al-Achdan • Dashboard Pusat</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:block text-right">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Server Real-time</p>
            <p className="text-xs font-semibold text-slate-700">Terhubung ke Firebase</p>
          </div>
          <div className="hidden sm:block h-8 w-px bg-slate-200"></div>
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200/50">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Live Feed</span>
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar + Main Content */}
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* Persistent Sidebar on Desktop, horizontal scrolling menu on mobile */}
        <aside className="hidden lg:flex w-[260px] sleek-sidebar p-4 space-y-6 flex-col shrink-0 justify-between border-r border-emerald-950">
          <div className="space-y-6">
            <div className="px-2">
              <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest mb-4">Menu Utama</p>
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('scan')}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'scan'
                      ? 'sleek-active-nav'
                      : 'hover:bg-white/10 text-emerald-100 hover:text-white'
                  }`}
                >
                  <QrCode className="w-5 h-5 text-emerald-300" />
                  <span>Scan Presensi</span>
                </button>

                <button
                  onClick={() => setActiveTab('admin')}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'admin'
                      ? 'sleek-active-nav'
                      : 'hover:bg-white/10 text-emerald-100 hover:text-white'
                  }`}
                >
                  <ClipboardList className="w-5 h-5 text-emerald-300" />
                  <span>Dashboard Admin</span>
                </button>

                <button
                  onClick={() => setActiveTab('students')}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'students'
                      ? 'sleek-active-nav'
                      : 'hover:bg-white/10 text-emerald-100 hover:text-white'
                  }`}
                >
                  <Users className="w-5 h-5 text-emerald-300" />
                  <span>Kelola Siswa</span>
                </button>

                <button
                  onClick={() => setActiveTab('parents')}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'parents'
                      ? 'sleek-active-nav'
                      : 'hover:bg-white/10 text-emerald-100 hover:text-white'
                  }`}
                >
                  <Users className="w-5 h-5 text-emerald-300" />
                  <span>Portal Orang Tua</span>
                </button>

                <button
                  onClick={() => setActiveTab('guide')}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'guide'
                      ? 'sleek-active-nav'
                      : 'hover:bg-white/10 text-emerald-100 hover:text-white'
                  }`}
                >
                  <BookOpen className="w-5 h-5 text-emerald-300" />
                  <span>Panduan Setup</span>
                </button>
              </nav>
            </div>
          </div>

          <div className="p-4 bg-emerald-900/50 rounded-xl border border-emerald-800/30">
            <p className="text-[10px] font-bold text-emerald-400 mb-1">STABILISASI CLOUD</p>
            <p className="text-[10px] text-emerald-200/80">Firebase database aktif dan memantau gerbang presensi.</p>
          </div>
        </aside>

        {/* Mobile Tab Navigation Menu (Only visible on small-to-medium screens) */}
        <div className="lg:hidden bg-emerald-900 text-white border-b border-emerald-950 overflow-x-auto select-none scrollbar-hide shrink-0">
          <div className="flex gap-1 h-12 items-center px-4">
            <button
              onClick={() => setActiveTab('scan')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                activeTab === 'scan'
                  ? 'bg-white/20 text-white'
                  : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              Scan
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                activeTab === 'admin'
                  ? 'bg-white/20 text-white'
                  : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Admin
            </button>

            <button
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                activeTab === 'students'
                  ? 'bg-white/20 text-white'
                  : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Siswa
            </button>

            <button
              onClick={() => setActiveTab('parents')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                activeTab === 'parents'
                  ? 'bg-white/20 text-white'
                  : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Orang Tua
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                activeTab === 'guide'
                  ? 'bg-white/20 text-white'
                  : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Panduan
            </button>
          </div>
        </div>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Sinkronisasi Database Firebase...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 p-6 rounded-2xl max-w-md mx-auto text-center space-y-4 shadow-sm">
              <p className="text-sm font-semibold">{error}</p>
              <p className="text-xs text-slate-400">Pastikan file config database atau kunci Firestore API Anda tidak diblokir.</p>
            </div>
          ) : (
            <div className="animate-fade-in max-w-6xl mx-auto space-y-6">
              {activeTab === 'scan' && (
                <ScannerPanel 
                  students={students} 
                  onRefresh={handleRefresh} 
                  onNewAttendance={handleNewAttendance}
                />
              )}
              {activeTab === 'admin' && (
                <AdminDashboard 
                  attendanceRecords={attendanceRecords} 
                  students={students} 
                  onRefresh={handleRefresh}
                />
              )}
              {activeTab === 'students' && (
                <StudentManager 
                  students={students} 
                  onRefresh={handleRefresh}
                />
              )}
              {activeTab === 'parents' && (
                <ParentPortal 
                  students={students} 
                  attendanceRecords={attendanceRecords}
                />
              )}
              {activeTab === 'guide' && (
                <SetupGuide />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Sleek status bar at the very bottom */}
      <footer className="h-8 bg-slate-800 text-white flex items-center justify-between px-6 shrink-0 select-none z-30">
        <div className="flex items-center gap-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">Admin: MA Al-Achdan v2.4</p>
          <div className="h-3 w-px bg-slate-600"></div>
          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">FIREBASE_DATABASE_CONNECTED</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Total Logs:</span>
          <span className="text-[10px] font-bold font-mono bg-slate-700/60 px-1.5 py-0.5 rounded text-emerald-300">{attendanceRecords.length} Catatan</span>
        </div>
      </footer>
    </div>
  );
}
