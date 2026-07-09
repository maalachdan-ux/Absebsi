import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AttendanceRecord, Student } from '../types';
import { 
  FileSpreadsheet, 
  FileText, 
  Trash2, 
  Calendar, 
  Check, 
  Clock, 
  Users, 
  Search,
  Filter,
  CheckCircle,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AdminDashboardProps {
  attendanceRecords: AttendanceRecord[];
  students: Student[];
  onRefresh: () => void;
}

export default function AdminDashboard({ attendanceRecords, students, onRefresh }: AdminDashboardProps) {
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Statistics
  const [stats, setStats] = useState({
    totalHadir: 0,
    totalSakit: 0,
    totalIzin: 0,
    totalAlfa: 0,
    totalTerlambat: 0
  });

  useEffect(() => {
    // Filter records for today/selected date to calculate real-time dashboard metrics
    const dailyRecords = attendanceRecords.filter(rec => rec.timestamp.startsWith(selectedDate));
    
    const hadir = dailyRecords.filter(r => r.status === 'Hadir').length;
    const sakit = dailyRecords.filter(r => r.status === 'Sakit').length;
    const izin = dailyRecords.filter(r => r.status === 'Izin').length;
    const alfa = dailyRecords.filter(r => r.status === 'Alfa').length;
    const terlambat = dailyRecords.filter(r => r.notes === 'Terlambat').length;

    setStats({
      totalHadir: hadir,
      totalSakit: sakit,
      totalIzin: izin,
      totalAlfa: alfa,
      totalTerlambat: terlambat
    });
  }, [attendanceRecords, selectedDate]);

  // Handle deleting an attendance log
  const handleDeleteRecord = async (recordId: string, studentName: string) => {
    if (window.confirm(`Hapus catatan kehadiran untuk ${studentName}?`)) {
      try {
        await deleteDoc(doc(db, 'attendance', recordId));
        onRefresh();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `attendance/${recordId}`);
      }
    }
  };

  // Filter attendance record array
  const filteredRecords = attendanceRecords.filter((rec) => {
    const matchesDate = rec.timestamp.startsWith(selectedDate);
    const matchesClass = filterClass ? rec.class === filterClass : true;
    const matchesStatus = filterStatus ? rec.status === filterStatus : true;
    const matchesType = filterType ? rec.type === filterType : true;
    const matchesSearch = searchQuery
      ? rec.name.toLowerCase().includes(searchQuery.toLowerCase()) || rec.nisn.includes(searchQuery)
      : true;

    return matchesDate && matchesClass && matchesStatus && matchesType && matchesSearch;
  });

  // Export to Excel (.xlsx)
  const exportToExcel = () => {
    const dataToExport = filteredRecords.map((rec, index) => ({
      'No': index + 1,
      'Tanggal': new Date(rec.timestamp).toLocaleDateString('id-ID'),
      'Waktu': new Date(rec.timestamp).toLocaleTimeString('id-ID'),
      'NISN': rec.nisn,
      'Nama Siswa': rec.name,
      'Kelas': rec.class,
      'Status': rec.status,
      'Tipe Scan': rec.type,
      'No. WA Orang Tua': rec.phone,
      'Keterangan': rec.notes
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    
    // Add custom header rows manually
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Kehadiran');

    // Generate sheet file and trigger download
    XLSX.writeFile(workbook, `Laporan_Presensi_MA_Al_Achdan_${selectedDate}.xlsx`);
  };

  // Export to PDF
  const exportToPdf = () => {
    const doc = new jsPDF();
    
    // Title & Madrasah Info
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 124, 65); // Emerald-ish color
    doc.text("YAYASAN AL-ACHDAN", 105, 15, { align: "center" });
    doc.setFontSize(16);
    doc.text("SISTEM PRESENSI PINTAR MADRASAH ALIYAH AL-ACHDAN", 105, 23, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Jl. Raya Al-Achdan No. 12, Jawa Barat | Email: maalachdan@gmail.com", 105, 29, { align: "center" });
    doc.line(15, 33, 195, 33);

    // Document description
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(`LAPORAN REKAPITULASI KEHADIRAN SISWA`, 15, 42);
    doc.setFont("helvetica", "normal");
    doc.text(`Tanggal Laporan: ${new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 15, 48);
    
    // Stats overview in PDF
    doc.text(`Kehadiran: ${stats.totalHadir} | Terlambat: ${stats.totalTerlambat} | Sakit: ${stats.totalSakit} | Izin: ${stats.totalIzin} | Alfa: ${stats.totalAlfa}`, 15, 54);

    // Create printable table array
    const tableBody = filteredRecords.map((rec, index) => [
      index + 1,
      new Date(rec.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      rec.nisn,
      rec.name,
      rec.class,
      rec.type,
      rec.status,
      rec.notes
    ]);

    // Generate table using autotable
    autoTable(doc, {
      startY: 60,
      head: [['No', 'Waktu', 'NISN', 'Nama Siswa', 'Kelas', 'Tipe', 'Status', 'Keterangan']],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] }, // Emerald Green
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 18 },
        2: { cellWidth: 22 },
        3: { cellWidth: 45 },
        4: { cellWidth: 22 },
        5: { cellWidth: 20 },
        6: { cellWidth: 20 },
        7: { cellWidth: 33 }
      }
    });

    // Signatures block
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.text("Mengetahui,", 150, finalY);
    doc.setFont("helvetica", "bold");
    doc.text("Kepala Sekolah MA Al-Achdan", 150, finalY + 6);
    doc.text("DR. H. Achdan, M.Ag", 150, finalY + 30);
    doc.setFont("helvetica", "normal");
    doc.text("NIP. 197802112005011002", 150, finalY + 35);

    doc.save(`Rekap_Presensi_MA_Al_Achdan_${selectedDate}.pdf`);
  };

  return (
    <div className="space-y-6" id="dashboard-admin-panel">
      
      {/* Date filter selector */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-semibold text-slate-700">Tanggal Pemantauan:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Download Buttons */}
        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold py-2 px-4 rounded-xl text-xs transition-all flex items-center gap-2 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel (.xlsx)
          </button>
          <button
            onClick={exportToPdf}
            className="bg-slate-800 text-white hover:bg-slate-900 font-bold py-2 px-4 rounded-xl text-xs transition-all flex items-center gap-2 shadow-sm"
          >
            <FileText className="w-4 h-4" />
            PDF Laporan
          </button>
        </div>
      </div>

      {/* Summary Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Card 1: Present */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center space-y-1">
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle className="w-4 h-4" />
          </div>
          <span className="text-xs text-slate-400 font-semibold block">Hadir</span>
          <span className="text-2xl font-extrabold text-slate-800">{stats.totalHadir}</span>
        </div>

        {/* Card 2: Sakit */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center space-y-1">
          <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <HelpCircle className="w-4 h-4" />
          </div>
          <span className="text-xs text-slate-400 font-semibold block">Sakit</span>
          <span className="text-2xl font-extrabold text-slate-800">{stats.totalSakit}</span>
        </div>

        {/* Card 3: Izin */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center space-y-1">
          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Filter className="w-4 h-4" />
          </div>
          <span className="text-xs text-slate-400 font-semibold block">Izin</span>
          <span className="text-2xl font-extrabold text-slate-800">{stats.totalIzin}</span>
        </div>

        {/* Card 4: Alfa */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center space-y-1">
          <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-4 h-4" />
          </div>
          <span className="text-xs text-slate-400 font-semibold block">Alfa</span>
          <span className="text-2xl font-extrabold text-rose-600">{stats.totalAlfa}</span>
        </div>

        {/* Card 5: Terlambat */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center space-y-1 col-span-2 md:col-span-1">
          <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-xs text-slate-400 font-semibold block">Terlambat</span>
          <span className="text-2xl font-extrabold text-amber-600">{stats.totalTerlambat}</span>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h4 className="font-bold text-slate-800">Pemantauan Gerbang Real-time</h4>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari NISN atau Nama..."
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Filter by Class */}
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 px-3 py-1.5 rounded-xl focus:outline-none"
            >
              <option value="">Semua Kelas</option>
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

            {/* Filter by Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 px-3 py-1.5 rounded-xl focus:outline-none"
            >
              <option value="">Semua Status</option>
              <option value="Hadir">Hadir</option>
              <option value="Sakit">Sakit</option>
              <option value="Izin">Izin</option>
              <option value="Alfa">Alfa</option>
            </select>

            {/* Filter by Scan Type */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 px-3 py-1.5 rounded-xl focus:outline-none"
            >
              <option value="">Semua Tipe Scan</option>
              <option value="Masuk">Masuk (Kedatangan)</option>
              <option value="Pulang">Pulang (Kepulangan)</option>
            </select>
          </div>
        </div>

        {/* Real-time Logs Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">No</th>
                <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Waktu</th>
                <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Foto Kamera</th>
                <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">NISN / ID</th>
                <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Siswa</th>
                <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kelas</th>
                <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipe</th>
                <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Keterangan</th>
                <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record, index) => (
                  <tr key={record.id || index} className="hover:bg-slate-50/55 transition-all text-sm text-slate-700">
                    <td className="p-4 font-semibold text-slate-500">{index + 1}</td>
                    <td className="p-4 font-mono text-slate-500 text-xs">
                      {new Date(record.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="p-4">
                      {record.photoUrl ? (
                        <img
                          src={record.photoUrl}
                          alt="Sken Wajah"
                          className="w-9 h-9 object-cover rounded-lg border border-slate-100"
                        />
                      ) : (
                        <div className="w-9 h-9 bg-slate-100 text-slate-300 rounded-lg flex items-center justify-center">
                          N/A
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-mono font-semibold text-slate-600">{record.nisn}</td>
                    <td className="p-4 font-bold text-slate-800 uppercase">{record.name}</td>
                    <td className="p-4 font-medium">{record.class}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        record.type === 'Masuk' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {record.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        record.status === 'Hadir' ? 'bg-green-100 text-green-800' :
                        record.status === 'Sakit' ? 'bg-amber-100 text-amber-800' :
                        record.status === 'Izin' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-semibold">
                      <span className={record.notes === 'Terlambat' ? 'text-amber-600 font-bold' : 'text-slate-500'}>
                        {record.notes}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => record.id && handleDeleteRecord(record.id, record.name)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 text-xs">
                    Tidak ada catatan kehadiran yang cocok untuk kriteria pencarian Anda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
