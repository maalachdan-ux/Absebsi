import React, { useState } from 'react';
import { AttendanceRecord, Student } from '../types';
import { 
  Search, 
  Smartphone, 
  Clock, 
  CheckCircle, 
  BookOpen, 
  Activity,
  User,
  ArrowRightLeft,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ParentPortalProps {
  students: Student[];
  attendanceRecords: AttendanceRecord[];
}

export default function ParentPortal({ students, attendanceRecords }: ParentPortalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChild, setSelectedChild] = useState<Student | null>(null);

  // Search filter
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Search by NISN or Name match
    const found = students.find(
      (s) => 
        s.nisn === searchQuery.trim() || 
        s.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );

    if (found) {
      setSelectedChild(found);
    } else {
      setSelectedChild(null);
      alert("Siswa tidak ditemukan. Pastikan NISN atau Nama lengkap sudah benar.");
    }
  };

  // Get child's attendance history (sorted by latest timestamp)
  const childHistory = selectedChild
    ? attendanceRecords
        .filter((rec) => rec.nisn === selectedChild.nisn)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : [];

  // Child statistics
  const childStats = {
    hadir: childHistory.filter(r => r.status === 'Hadir').length,
    sakit: childHistory.filter(r => r.status === 'Sakit').length,
    izin: childHistory.filter(r => r.status === 'Izin').length,
    alfa: childHistory.filter(r => r.status === 'Alfa').length,
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6" id="portal-orang-tua">
      
      {/* Intro Portal */}
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        {/* Background glow shapes */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-12 -translate-y-12 blur-2xl pointer-events-none" />
        
        <div className="relative space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-300" />
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-200">PORTAL WALI SISWA</span>
          </div>
          
          <div className="space-y-1">
            <h3 className="text-xl font-extrabold tracking-tight">Pantau Kehadiran Buah Hati</h3>
            <p className="text-xs text-emerald-100 max-w-md">Layanan pemantauan real-time kedatangan dan kepulangan siswa MA Al-Achdan langsung dari HP Anda.</p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik NISN Anak Anda (Contoh: 12110291)"
                className="w-full bg-white text-slate-800 placeholder-slate-400 rounded-2xl pl-10 pr-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all shadow-inner"
              />
            </div>
            <button
              type="submit"
              className="bg-slate-900 hover:bg-slate-950 text-white font-extrabold px-5 rounded-2xl text-xs transition-all shadow-md shrink-0"
            >
              Cari Anak
            </button>
          </form>
        </div>
      </div>

      {/* Selected Child Portal Card Details */}
      <AnimatePresence mode="wait">
        {selectedChild ? (
          <motion.div
            key={selectedChild.nisn}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Student Profile Card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
              <img
                src={selectedChild.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"}
                alt={selectedChild.name}
                className="w-24 h-24 object-cover rounded-2xl border border-slate-100 shadow-sm"
              />

              <div className="space-y-3 flex-1 text-center sm:text-left">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full inline-block">
                    {selectedChild.class}
                  </span>
                  <h4 className="text-lg font-extrabold text-slate-800 uppercase tracking-wide">{selectedChild.name}</h4>
                  <p className="text-xs text-slate-400 font-mono">NISN: {selectedChild.nisn}</p>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
                  <a
                    href={`https://wa.me/${selectedChild.phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 font-medium transition-all"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-500" />
                    Hubungi Wali Kelas
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Hadir</span>
                <span className="text-xl font-extrabold text-emerald-600">{childStats.hadir}</span>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Sakit</span>
                <span className="text-xl font-extrabold text-amber-500">{childStats.sakit}</span>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Izin</span>
                <span className="text-xl font-extrabold text-blue-500">{childStats.izin}</span>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Alfa</span>
                <span className="text-xl font-extrabold text-rose-500">{childStats.alfa}</span>
              </div>
            </div>

            {/* Live Timeline History */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>Riwayat Deteksi Kehadiran</span>
              </h4>

              <div className="relative pl-6 border-l-2 border-slate-100 space-y-6">
                {childHistory.length > 0 ? (
                  childHistory.map((rec, index) => (
                    <div key={rec.id || index} className="relative">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white ${
                        rec.type === 'Masuk' ? 'bg-emerald-500' : 'bg-blue-500'
                      }`} />

                      <div className="space-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">
                              Mendeteksi Presensi {rec.type}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              rec.status === 'Hadir' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {rec.status}
                            </span>
                          </div>
                          
                          <span className="text-[10px] text-slate-400 font-mono font-medium">
                            {new Date(rec.timestamp).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })} - {new Date(rec.timestamp).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 font-medium">
                          Catatan Gerbang: <strong className={rec.notes === 'Terlambat' ? 'text-amber-600' : 'text-slate-600'}>{rec.notes}</strong>
                        </p>

                        {rec.photoUrl && (
                          <div className="pt-2">
                            <img
                              src={rec.photoUrl}
                              alt="Foto Gerbang"
                              className="w-20 h-20 object-cover rounded-xl border border-slate-100 shadow-sm"
                            />
                            <span className="text-[9px] text-slate-400 block mt-1">Konfirmasi verifikasi wajah</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    Belum ada riwayat aktivitas kehadiran terdeteksi.
                  </div>
                )}
              </div>
            </div>

          </motion.div>
        ) : (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 text-center text-slate-400 text-xs">
            Silakan ketikkan NISN atau Nama lengkap buah hati Anda di atas untuk melihat data presensi real-time.
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
