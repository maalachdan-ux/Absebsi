import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, addDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Student } from '../types';
import { 
  UserPlus, 
  Search, 
  Trash2, 
  Camera, 
  Upload, 
  Printer, 
  X, 
  Check, 
  AlertCircle,
  FileImage,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StudentManagerProps {
  students: Student[];
  onRefresh: () => void;
}

export default function StudentManager({ students, onRefresh }: StudentManagerProps) {
  const [nisn, setNisn] = useState('');
  const [name, setName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [phone, setPhone] = useState('');
  const [photo, setPhoto] = useState<string>(''); // Base64
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Camera capture modal states
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Student Card Modal state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Bulk Selection & Printing States
  const [selectedNisns, setSelectedNisns] = useState<Set<string>>(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [cardTheme, setCardTheme] = useState<'emerald' | 'indigo' | 'slate' | 'amber'>('emerald');
  const [printQueue, setPrintQueue] = useState<Student[]>([]);

  // Drag and drop states
  const [isDragging, setIsDragging] = useState(false);

  // Helper to resolve card design themes
  const getThemeClasses = (theme: 'emerald' | 'indigo' | 'slate' | 'amber') => {
    switch (theme) {
      case 'indigo':
        return {
          gradient: 'from-indigo-50/60 via-white to-indigo-50/30',
          bg: 'bg-indigo-700',
          border: 'border-indigo-500/25',
          textPrimary: 'text-indigo-800',
          textSecondary: 'text-indigo-600',
          borderColorValue: 'rgba(99, 102, 241, 0.25)',
          buttonBg: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10'
        };
      case 'slate':
        return {
          gradient: 'from-slate-100/60 via-white to-slate-100/30',
          bg: 'bg-slate-700',
          border: 'border-slate-500/25',
          textPrimary: 'text-slate-800',
          textSecondary: 'text-slate-600',
          borderColorValue: 'rgba(100, 116, 139, 0.25)',
          buttonBg: 'bg-slate-600 hover:bg-slate-700 shadow-slate-600/10'
        };
      case 'amber':
        return {
          gradient: 'from-amber-50/60 via-white to-amber-50/30',
          bg: 'bg-amber-700',
          border: 'border-amber-500/25',
          textPrimary: 'text-amber-800',
          textSecondary: 'text-amber-600',
          borderColorValue: 'rgba(245, 158, 11, 0.25)',
          buttonBg: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/10'
        };
      case 'emerald':
      default:
        return {
          gradient: 'from-emerald-50/60 via-white to-emerald-50/30',
          bg: 'bg-emerald-700',
          border: 'border-emerald-500/25',
          textPrimary: 'text-emerald-800',
          textSecondary: 'text-emerald-600',
          borderColorValue: 'rgba(16, 185, 129, 0.25)',
          buttonBg: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10'
        };
    }
  };

  const toggleSelectStudent = (nisn: string) => {
    const next = new Set(selectedNisns);
    if (next.has(nisn)) {
      next.delete(nisn);
    } else {
      next.add(nisn);
    }
    setSelectedNisns(next);
  };

  const toggleSelectAllFiltered = (filteredList: Student[]) => {
    const isAllSelected = filteredList.length > 0 && filteredList.every(s => selectedNisns.has(s.nisn));
    const next = new Set(selectedNisns);
    if (isAllSelected) {
      filteredList.forEach(s => next.delete(s.nisn));
    } else {
      filteredList.forEach(s => next.add(s.nisn));
    }
    setSelectedNisns(next);
  };

  const handlePrintSingle = (student: Student) => {
    setPrintQueue([student]);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintBulk = (studentsToPrint: Student[]) => {
    if (studentsToPrint.length === 0) {
      alert("Silakan pilih minimal 1 siswa.");
      return;
    }
    setPrintQueue(studentsToPrint);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleBulkDelete = async () => {
    const count = selectedNisns.size;
    if (window.confirm(`Apakah Anda yakin ingin menghapus ${count} data siswa terdaftar sekaligus?`)) {
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        const promises: Promise<any>[] = [];
        selectedNisns.forEach((nisn) => {
          promises.push(deleteDoc(doc(db, 'students', nisn)));
        });
        await Promise.all(promises);
        setSuccess(`${count} data siswa berhasil dihapus.`);
        setSelectedNisns(new Set());
        onRefresh();
      } catch (err) {
        console.error("Gagal menghapus data masal:", err);
        setError("Gagal menghapus beberapa data siswa.");
      } finally {
        setLoading(false);
      }
    }
  };

  // Open camera for snapshot
  const startCamera = async () => {
    setIsCameraOpen(true);
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 400, height: 400, facingMode: 'user' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      setError("Gagal mengakses kamera. Pastikan izin kamera telah diberikan.");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const captureSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  // Drag and Drop files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError("Hanya file gambar yang didukung.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPhoto(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Save student to Firestore
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nisn.trim() || !name.trim() || !studentClass.trim() || !phone.trim()) {
      setError("Semua kolom bertanda bintang (*) wajib diisi.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const cleanNisn = nisn.trim().replace(/[^a-zA-Z0-9-]/g, '');
    const phoneClean = phone.trim().replace(/[^0-9]/g, ''); // standard digits only

    const newStudent: Student = {
      nisn: cleanNisn,
      name: name.trim(),
      class: studentClass.trim(),
      phone: phoneClean,
      photoUrl: photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
      createdAt: new Date().toISOString()
    };

    try {
      // Store using NISN as document ID for easier references
      await setDoc(doc(db, 'students', cleanNisn), newStudent);
      setSuccess(`Siswa ${name} dengan NISN ${cleanNisn} berhasil didaftarkan!`);
      
      // Clear form
      setNisn('');
      setName('');
      setStudentClass('');
      setPhone('');
      setPhoto('');
      
      onRefresh();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `students/${cleanNisn}`);
      setError("Gagal menyimpan data ke database. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // Delete student
  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus siswa ${studentName}?`)) {
      try {
        await deleteDoc(doc(db, 'students', studentId));
        setSuccess(`Data siswa ${studentName} berhasil dihapus.`);
        onRefresh();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `students/${studentId}`);
        setError("Gagal menghapus data siswa.");
      }
    }
  };

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.nisn.includes(searchQuery) ||
    student.class.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8" id="kelola-siswa-panel">
      {/* Alert Messages */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-3 animate-pulse">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3">
          <Check className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Form: Add Student */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:col-span-1">
          <div className="flex items-center gap-2 mb-6">
            <UserPlus className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-slate-800">Daftar Siswa Baru</h3>
          </div>

          <form onSubmit={handleAddStudent} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                NISN / ID Siswa *
              </label>
              <input
                type="text"
                required
                value={nisn}
                onChange={(e) => setNisn(e.target.value)}
                placeholder="Contoh: 12110291"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Nama Lengkap Siswa *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Lengkap Siswa"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Kelas *
              </label>
              <select
                required
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              >
                <option value="">Pilih Kelas</option>
                <option value="X MIPA 1">X MIPA 1</option>
                <option value="X MIPA 2">X MIPA 2</option>
                <option value="X IPS 1">X IPS 1</option>
                <option value="XI MIPA 1">XI MIPA 1</option>
                <option value="XI MIPA 2">XI MIPA 2</option>
                <option value="XI IPS 1">XI IPS 1</option>
                <option value="XII MIPA 1">XII MIPA 1</option>
                <option value="XII MIPA 2">XII MIPA 2</option>
                <option value="XII IPS 1">XII IPS 1</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                WhatsApp Orang Tua *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 62812345678"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Diawali dengan 62 tanpa spasi atau tanda hubung.</span>
            </div>

            {/* Photo Upload Options */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Kartu Berfoto *
              </label>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium py-2 px-3 rounded-xl text-xs transition-all border border-emerald-200/50"
                >
                  <Camera className="w-4 h-4" />
                  Kamera HP/PC
                </button>
                <label className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium py-2 px-3 rounded-xl text-xs transition-all border border-slate-200 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Pilih File
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              </div>

              {/* Photo preview / Drag & drop */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-4 text-center transition-all flex flex-col items-center justify-center min-h-[140px] ${
                  isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                {photo ? (
                  <div className="relative group w-24 h-24">
                    <img
                      src={photo}
                      alt="Pratinjau Siswa"
                      className="w-full h-full object-cover rounded-xl border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => setPhoto('')}
                      className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-md hover:bg-rose-600 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <FileImage className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-xs text-slate-500 font-medium">Seret foto siswa ke sini</p>
                    <p className="text-[10px] text-slate-400 mt-1">Format: JPG, PNG maksimal 2MB</p>
                  </>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Mendaftarkan...
                </>
              ) : (
                'Simpan Data Siswa'
              )}
            </button>
          </form>
        </div>

        {/* Right Panel: Student List Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Database Siswa Terdaftar</h3>
              <p className="text-xs text-slate-400">Total: {students.length} siswa</p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {students.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const allNisns = new Set(students.map(s => s.nisn));
                    setSelectedNisns(allNisns);
                    setIsBulkModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2 px-4.5 text-xs font-bold transition-all shadow-md shadow-emerald-600/10"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Kartu Massal
                </button>
              )}

              {/* Search Bar */}
              <div className="relative max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari NISN, nama, kelas..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-55 border-b border-slate-100">
                  <th className="p-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filteredStudents.length > 0 && filteredStudents.every(s => selectedNisns.has(s.nisn))}
                      onChange={() => toggleSelectAllFiltered(filteredStudents)}
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Foto</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">NISN</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nama</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Kelas</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">No. WA Orang Tua</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => {
                    const isSelected = selectedNisns.has(student.nisn);
                    return (
                      <tr 
                        key={student.nisn} 
                        className={`hover:bg-slate-50/50 transition-all ${isSelected ? 'bg-emerald-50/25' : ''}`}
                      >
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectStudent(student.nisn)}
                            className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-4">
                          <img
                            src={student.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"}
                            alt={student.name}
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                          />
                        </td>
                        <td className="p-4 text-sm font-semibold text-slate-700">{student.nisn}</td>
                        <td className="p-4 text-sm text-slate-700 font-medium">{student.name}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                            {student.class}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-slate-500 font-mono">+{student.phone}</td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => setSelectedStudent(student)}
                            className="inline-flex items-center gap-1 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 text-slate-600 rounded-lg py-1.5 px-3 text-xs font-semibold transition-all"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Kartu
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(student.nisn, student.name)}
                            className="text-rose-600 hover:text-white hover:bg-rose-600 border border-transparent rounded-lg p-1.5 inline-flex items-center transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 text-sm">
                      Belum ada data siswa terdaftar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Snapshot Camera Modal */}
      <AnimatePresence>
        {isCameraOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-100"
            >
              <button
                onClick={stopCamera}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <h4 className="text-lg font-bold text-slate-800 mb-4">Ambil Foto Siswa</h4>
              
              <div className="relative rounded-xl overflow-hidden bg-black aspect-square mb-4 border border-slate-100">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <div className="absolute inset-0 border-4 border-dashed border-emerald-500/50 rounded-full m-8 pointer-events-none" />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="flex-1 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={captureSnapshot}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md"
                >
                  Ambil Foto
                </button>
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action Bar for Bulk Selection */}
      <AnimatePresence>
        {selectedNisns.size > 0 && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md border border-slate-800 text-white rounded-2xl py-3 px-6 shadow-2xl flex items-center gap-6 z-40 print:hidden"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-xs font-bold font-mono text-slate-200">
                {selectedNisns.size} Siswa Terpilih
              </p>
            </div>
            
            <div className="h-4 w-px bg-slate-800" />
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(true)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-xl text-xs transition-all shadow-md shadow-emerald-600/15"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Kartu Massal
              </button>
              
              <button
                type="button"
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 font-bold py-1.5 px-3 rounded-xl text-xs transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus
              </button>
              
              <button
                type="button"
                onClick={() => setSelectedNisns(new Set())}
                className="text-slate-400 hover:text-white font-medium py-1.5 px-2 text-xs transition-all"
              >
                Batal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Print Configuration Modal */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative border border-slate-100 flex flex-col md:flex-row gap-8"
            >
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Left Column: Settings and Selection Overview */}
              <div className="flex-1 space-y-6">
                <div>
                  <h4 className="text-xl font-extrabold text-slate-800">Cetak Kartu Massal</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Konfigurasi desain kartu tanda pengenal ukuran KTP (ID-1 standar: 85.6mm x 53.98mm)
                  </p>
                </div>

                {/* Theme Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Pilih Tema Warna Kartu
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'emerald', label: 'Emerald Green', color: 'bg-emerald-600' },
                      { id: 'indigo', label: 'Midnight Indigo', color: 'bg-indigo-600' },
                      { id: 'slate', label: 'Slate Gray', color: 'bg-slate-600' },
                      { id: 'amber', label: 'Honey Amber', color: 'bg-amber-500' }
                    ].map((themeOpt) => (
                      <button
                        key={themeOpt.id}
                        type="button"
                        onClick={() => setCardTheme(themeOpt.id as any)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all text-xs font-semibold ${
                          cardTheme === themeOpt.id 
                            ? 'border-slate-800 bg-slate-50' 
                            : 'border-slate-200 hover:bg-slate-50/50'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full ${themeOpt.color}`} />
                        <span>{themeOpt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected List Summary */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                  <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex justify-between">
                    <span>Siswa Terpilih ({selectedNisns.size})</span>
                    <button 
                      type="button"
                      onClick={() => setSelectedNisns(new Set(students.map(s => s.nisn)))}
                      className="text-[10px] text-emerald-600 hover:underline font-bold lowercase"
                    >
                      Pilih Semua
                    </button>
                  </h5>
                  
                  <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 pr-1 scrollbar-hide">
                    {students.filter(s => selectedNisns.has(s.nisn)).map((student) => (
                      <div key={student.nisn} className="py-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <img 
                            src={student.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"} 
                            className="w-6 h-6 rounded object-cover border border-slate-200" 
                            alt=""
                          />
                          <div>
                            <span className="font-semibold text-slate-700 block">{student.name}</span>
                            <span className="text-[10px] text-slate-400">{student.class} • {student.nisn}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = new Set(selectedNisns);
                            next.delete(student.nisn);
                            setSelectedNisns(next);
                          }}
                          className="text-slate-400 hover:text-rose-600 transition-all p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {selectedNisns.size === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4">Belum ada siswa terpilih untuk dicetak.</p>
                    )}
                  </div>
                </div>

                {/* Print Layout Info */}
                <div className="text-slate-500 text-[11px] leading-relaxed border-t border-slate-100 pt-4">
                  💡 <strong>Informasi Cetak:</strong> Sistem secara otomatis melayout kartu dalam grid 2-kolom pada lembar A4 (maksimal 10 kartu per halaman). Pastikan opsi <em>"Background Graphics"</em> dicentang pada dialog cetak browser Anda untuk hasil terbaik.
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsBulkModalOpen(false)}
                    className="flex-1 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={selectedNisns.size === 0}
                    onClick={() => {
                      const toPrint = students.filter(s => selectedNisns.has(s.nisn));
                      handlePrintBulk(toPrint);
                    }}
                    className={`flex-1 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 ${
                      getThemeClasses(cardTheme).buttonBg
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Printer className="w-4 h-4" />
                    Mulai Cetak ({selectedNisns.size} Kartu)
                  </button>
                </div>
              </div>

              {/* Right Column: Live Interactive Preview */}
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 border border-slate-100 rounded-2xl p-6 min-h-[300px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Pratinjau Kartu (KTP Size)</span>

                {/* Simulated KTP card on screen */}
                {(() => {
                  const previewStudent = students.find(s => selectedNisns.has(s.nisn)) || students[0];
                  if (!previewStudent) return <p className="text-xs text-slate-400">Belum ada data siswa.</p>;
                  
                  const themeClasses = getThemeClasses(cardTheme);
                  return (
                    <div 
                      className="ktp-card bg-white border relative flex flex-col p-[3mm] select-none shadow-xl scale-110 sm:scale-125 transition-all"
                      style={{ 
                        width: '85.6mm', 
                        height: '53.98mm',
                        borderColor: themeClasses.borderColorValue,
                        borderWidth: '1px'
                      }}
                    >
                      {/* Secure pattern overlay */}
                      <div className={`absolute inset-0 bg-gradient-to-tr ${themeClasses.gradient} pointer-events-none z-0`} />
                      
                      {/* Header */}
                      <div className={`flex items-center gap-1.5 border-b pb-1 mb-1.5 relative z-10 shrink-0 ${themeClasses.border}`}>
                        <div className={`w-5 h-5 ${themeClasses.bg} text-white rounded flex items-center justify-center text-[10px] font-black shadow-xs`}>A</div>
                        <div className="leading-tight">
                          <h5 className={`font-extrabold text-[8px] tracking-wider uppercase leading-none ${themeClasses.textPrimary}`}>YAYASAN AL-ACHDAN</h5>
                          <p className={`text-[6px] font-bold tracking-normal uppercase leading-none mt-0.5 ${themeClasses.textSecondary}`}>MA AL-ACHDAN • KARTU PELAJAR</p>
                        </div>
                      </div>

                      {/* Body Content */}
                      <div className="flex gap-2.5 relative z-10 flex-1 overflow-hidden items-start">
                        {/* Left: Photo */}
                        <div className="flex flex-col items-center justify-between w-[20mm] h-full shrink-0">
                          <img
                            src={previewStudent.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"}
                            alt={previewStudent.name}
                            className="w-[18mm] h-[22mm] object-cover rounded border border-slate-200 shadow-xs"
                          />
                          <span className="text-[5.5px] font-mono text-slate-400 font-bold mt-1">NISN {previewStudent.nisn}</span>
                        </div>

                        {/* Center: Details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
                          <div className="space-y-1.5">
                            <div>
                              <span className="text-[4.5px] font-bold text-slate-400 uppercase block leading-none">Nama Lengkap</span>
                              <span className="text-[7.5px] font-extrabold text-slate-800 uppercase block truncate leading-tight mt-0.5">{previewStudent.name}</span>
                            </div>
                            <div>
                              <span className="text-[4.5px] font-bold text-slate-400 uppercase block leading-none">Kelas</span>
                              <span className={`text-[7px] font-bold block leading-tight mt-0.5 ${themeClasses.textPrimary}`}>{previewStudent.class}</span>
                            </div>
                            <div>
                              <span className="text-[4.5px] font-bold text-slate-400 uppercase block leading-none">WhatsApp Wali</span>
                              <span className="text-[6.5px] font-mono text-slate-600 block leading-tight mt-0.5">+{previewStudent.phone}</span>
                            </div>
                          </div>
                          
                          {/* Small school footnote */}
                          <span className="text-[4.5px] text-slate-400 font-bold italic uppercase tracking-wider">MA AL-ACHDAN SMART ABSENSI</span>
                        </div>

                        {/* Right: QR Code + Signature */}
                        <div className="w-[18mm] h-full shrink-0 flex flex-col justify-between items-end pb-0.5">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=80&data=${previewStudent.nisn}`}
                            alt="QR Absen"
                            className="w-[14mm] h-[14mm] border border-slate-100 p-0.5 rounded bg-white shadow-xs"
                          />
                          <div className="text-right leading-none select-none">
                            <span className="text-[4px] text-slate-400 block font-bold uppercase tracking-wide">Mengetahui,</span>
                            <span className="text-[4px] text-slate-700 font-extrabold block mt-2 leading-none">Kepala Madrasah</span>
                            <span className="text-[3.5px] text-slate-400 block mt-0.5 leading-none">DR. H. Achdan, M.Ag</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Student Card Modal / Individual Preview */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-100 flex flex-col items-center"
            >
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <h4 className="text-base font-bold text-slate-800 mb-6 w-full text-left">Pratinjau Kartu Siswa</h4>

              {/* The Beautiful Printed Card Preview */}
              {(() => {
                const themeClasses = getThemeClasses(cardTheme);
                return (
                  <div 
                    className="ktp-card bg-white border relative flex flex-col p-[3mm] select-none shadow-lg scale-105 sm:scale-110 mb-6 transition-all"
                    style={{ 
                      width: '85.6mm', 
                      height: '53.98mm',
                      borderColor: themeClasses.borderColorValue,
                      borderWidth: '1px'
                    }}
                  >
                    {/* Secure pattern overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-tr ${themeClasses.gradient} pointer-events-none z-0`} />
                    
                    {/* Header */}
                    <div className={`flex items-center gap-1.5 border-b pb-1 mb-1.5 relative z-10 shrink-0 ${themeClasses.border}`}>
                      <div className={`w-5 h-5 ${themeClasses.bg} text-white rounded flex items-center justify-center text-[10px] font-black shadow-xs`}>A</div>
                      <div className="leading-tight">
                        <h5 className={`font-extrabold text-[8px] tracking-wider uppercase leading-none ${themeClasses.textPrimary}`}>YAYASAN AL-ACHDAN</h5>
                        <p className={`text-[6px] font-bold tracking-normal uppercase leading-none mt-0.5 ${themeClasses.textSecondary}`}>MA AL-ACHDAN • KARTU PELAJAR</p>
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="flex gap-2.5 relative z-10 flex-1 overflow-hidden items-start">
                      {/* Left: Photo */}
                      <div className="flex flex-col items-center justify-between w-[20mm] h-full shrink-0">
                        <img
                          src={selectedStudent.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"}
                          alt={selectedStudent.name}
                          className="w-[18mm] h-[22mm] object-cover rounded border border-slate-200 shadow-xs"
                        />
                        <span className="text-[5.5px] font-mono text-slate-400 font-bold mt-1">NISN {selectedStudent.nisn}</span>
                      </div>

                      {/* Center: Details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
                        <div className="space-y-1.5">
                          <div>
                            <span className="text-[4.5px] font-bold text-slate-400 uppercase block leading-none">Nama Lengkap</span>
                            <span className="text-[7.5px] font-extrabold text-slate-800 uppercase block truncate leading-tight mt-0.5">{selectedStudent.name}</span>
                          </div>
                          <div>
                            <span className="text-[4.5px] font-bold text-slate-400 uppercase block leading-none">Kelas</span>
                            <span className={`text-[7px] font-bold block leading-tight mt-0.5 ${themeClasses.textPrimary}`}>{selectedStudent.class}</span>
                          </div>
                          <div>
                            <span className="text-[4.5px] font-bold text-slate-400 uppercase block leading-none">WhatsApp Wali</span>
                            <span className="text-[6.5px] font-mono text-slate-600 block leading-tight mt-0.5">+{selectedStudent.phone}</span>
                          </div>
                        </div>
                        
                        {/* Small school footnote */}
                        <span className="text-[4.5px] text-slate-400 font-bold italic uppercase tracking-wider">MA AL-ACHDAN SMART ABSENSI</span>
                      </div>

                      {/* Right: QR Code + Signature */}
                      <div className="w-[18mm] h-full shrink-0 flex flex-col justify-between items-end pb-0.5">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=80&data=${selectedStudent.nisn}`}
                          alt="QR Absen"
                          className="w-[14mm] h-[14mm] border border-slate-100 p-0.5 rounded bg-white shadow-xs"
                        />
                        <div className="text-right leading-none select-none">
                          <span className="text-[4px] text-slate-400 block font-bold uppercase tracking-wide">Mengetahui,</span>
                          <span className="text-[4px] text-slate-700 font-extrabold block mt-2 leading-none">Kepala Madrasah</span>
                          <span className="text-[3.5px] text-slate-400 block mt-0.5 leading-none">DR. H. Achdan, M.Ag</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Printable buttons */}
              <div className="w-full mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="flex-1 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-all"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintSingle(selectedStudent)}
                  className={`flex-1 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 ${
                    getThemeClasses(cardTheme).buttonBg
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  Cetak / Unduh
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unified High-Fidelity Printable Area - Hidden on Screen, Visible on Print */}
      <div id="print-area" className="hidden print:block bg-white p-0">
        <div 
          className="grid grid-cols-2 gap-x-[8mm] gap-y-[10mm] justify-center items-center bg-white p-[10mm]"
          style={{ width: '210mm', minHeight: '297mm', margin: '0 auto' }}
        >
          {printQueue.map((student) => {
            const themeClasses = getThemeClasses(cardTheme);
            return (
              <div 
                key={student.nisn} 
                className="card-print-item ktp-card bg-white border relative flex flex-col p-[3mm] select-none overflow-hidden"
                style={{ 
                  width: '85.6mm', 
                  height: '53.98mm', 
                  borderWidth: '1px', 
                  borderColor: themeClasses.borderColorValue,
                  pageBreakInside: 'avoid',
                  breakInside: 'avoid'
                }}
              >
                {/* Secure pattern overlay */}
                <div className={`absolute inset-0 bg-gradient-to-tr ${themeClasses.gradient} pointer-events-none z-0`} />
                
                {/* Header */}
                <div className={`flex items-center gap-1.5 border-b pb-1 mb-1.5 relative z-10 shrink-0 ${themeClasses.border}`}>
                  <div className={`w-5 h-5 ${themeClasses.bg} text-white rounded flex items-center justify-center text-[10px] font-black shadow-xs`}>A</div>
                  <div className="leading-tight">
                    <h5 className={`font-extrabold text-[8px] tracking-wider uppercase leading-none ${themeClasses.textPrimary}`}>YAYASAN AL-ACHDAN</h5>
                    <p className={`text-[6px] font-bold tracking-normal uppercase leading-none mt-0.5 ${themeClasses.textSecondary}`}>MA AL-ACHDAN • KARTU PELAJAR</p>
                  </div>
                </div>

                {/* Body Content */}
                <div className="flex gap-2.5 relative z-10 flex-1 overflow-hidden items-start">
                  {/* Left: Photo */}
                  <div className="flex flex-col items-center justify-between w-[20mm] h-full shrink-0">
                    <img
                      src={student.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"}
                      alt={student.name}
                      className="w-[18mm] h-[22mm] object-cover rounded border border-slate-200 shadow-xs"
                    />
                    <span className="text-[5.5px] font-mono text-slate-400 font-bold mt-1">NISN {student.nisn}</span>
                  </div>

                  {/* Center: Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
                    <div className="space-y-1.5">
                      <div>
                        <span className="text-[4.5px] font-bold text-slate-400 uppercase block leading-none">Nama Lengkap</span>
                        <span className="text-[7.5px] font-extrabold text-slate-800 uppercase block truncate leading-tight mt-0.5">{student.name}</span>
                      </div>
                      <div>
                        <span className="text-[4.5px] font-bold text-slate-400 uppercase block leading-none">Kelas</span>
                        <span className={`text-[7px] font-bold block leading-tight mt-0.5 ${themeClasses.textPrimary}`}>{student.class}</span>
                      </div>
                      <div>
                        <span className="text-[4.5px] font-bold text-slate-400 uppercase block leading-none">WhatsApp Wali</span>
                        <span className="text-[6.5px] font-mono text-slate-600 block leading-tight mt-0.5">+{student.phone}</span>
                      </div>
                    </div>
                    
                    {/* Small school footnote */}
                    <span className="text-[4.5px] text-slate-400 font-bold italic uppercase tracking-wider">MA AL-ACHDAN SMART ABSENSI</span>
                  </div>

                  {/* Right: QR Code + Signature */}
                  <div className="w-[18mm] h-full shrink-0 flex flex-col justify-between items-end pb-0.5">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=80&data=${student.nisn}`}
                      alt="QR Absen"
                      className="w-[14mm] h-[14mm] border border-slate-100 p-0.5 rounded bg-white shadow-xs"
                    />
                    <div className="text-right leading-none select-none">
                      <span className="text-[4px] text-slate-400 block font-bold uppercase tracking-wide">Mengetahui,</span>
                      <span className="text-[4px] text-slate-700 font-extrabold block mt-2 leading-none">Kepala Madrasah</span>
                      <span className="text-[3.5px] text-slate-400 block mt-0.5 leading-none">DR. H. Achdan, M.Ag</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
