import React from 'react';
import { BookOpen, Key, CheckCircle, FileText, Camera } from 'lucide-react';

export default function SetupGuide() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 md:p-8 max-w-4xl mx-auto my-6" id="panduan-setup">
      <div className="flex items-center gap-3 border-b border-emerald-50 pb-4 mb-6">
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Panduan Penggunaan MA Al-Achdan</h2>
          <p className="text-sm text-slate-500">Petunjuk praktis untuk mengoperasikan sistem absensi tanpa keahlian IT</p>
        </div>
      </div>

      <div className="space-y-6 text-slate-600 leading-relaxed">
        {/* Step 1 */}
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
            1
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-lg mb-1">Menambah Data Siswa Baru</h3>
            <p className="text-sm">
              Masuk ke tab <strong>"Kelola Siswa"</strong>. Isi nama lengkap, NISN, kelas, dan nomor WhatsApp orang tua (diawali dengan kode negara, contoh: <code>628123456789</code>). Ambil foto langsung dari kamera HP/laptop petugas atau upload foto siswa untuk dicetak ke kartu identitas berfoto.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
            2
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-lg mb-1">Mencetak Kartu Siswa & QR Code</h3>
            <p className="text-sm">
              Setelah siswa didaftarkan, sistem akan otomatis membuat <strong>QR Code unik</strong> untuk setiap siswa. Klik tombol <strong>"Cetak Kartu"</strong> pada baris data siswa untuk mengunduh kartu siswa berfoto lengkap dengan QR Code yang siap dicetak di kertas tebal atau ID Card.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
            3
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-lg mb-1">Melakukan Scan QR & Deteksi Wajah</h3>
            <p className="text-sm">
              Gunakan kamera HP atau laptop petugas di gerbang sekolah melalui tab <strong>"Scan Presensi"</strong>. Sistem akan membuka kamera:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-slate-500">
              <li>Pilih opsi scan <strong>Masuk</strong> atau <strong>Pulang</strong>.</li>
              <li>Arahkan QR Code siswa ke kamera.</li>
              <li>Sistem akan mendeteksi wajah di dalam lingkaran panduan hijau untuk konfirmasi presensi pintar, lalu mencatat data kehadiran secara real-time.</li>
            </ul>
          </div>
        </div>

        {/* Step 4 */}
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
            4
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-lg mb-1">Pemantauan Orang Tua & Pengiriman WhatsApp</h3>
            <p className="text-sm">
              Orang tua dapat memantau kehadiran anak mereka dari HP masing-masing di tab <strong>"Portal Orang Tua"</strong> dengan mengetikkan NISN atau Nama Anak. Sistem juga memuat tombol pengiriman notifikasi WhatsApp otomatis ke nomor orang tua saat anak mereka terabsen.
            </p>
          </div>
        </div>

        {/* Firebase Config Section */}
        <div className="mt-8 bg-slate-50 border border-slate-100 rounded-xl p-5">
          <div className="flex items-center gap-2 text-slate-800 font-semibold mb-3">
            <Key className="w-5 h-5 text-amber-500" />
            <span>Bagaimana dengan Database Firebase Anda?</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Aplikasi presensi ini <strong>sudah terhubung secara otomatis</strong> ke database Firebase cloud yang aman yang disediakan oleh sistem AI Studio. Anda tidak perlu mengatur apa pun sekarang untuk melihat sistem ini bekerja secara live!
          </p>
          <div className="text-xs text-slate-500 space-y-2">
            <p className="font-medium text-slate-700">Jika nanti Anda ingin memindahkan aplikasi ini ke akun Firebase pribadi Anda:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Buat akun gratis di <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-emerald-600 underline">Firebase Console</a>.</li>
              <li>Buat proyek baru, lalu pilih <strong>Add App (Web)</strong> untuk mendapatkan kode konfigurasi Firebase.</li>
              <li>Aktifkan <strong>Cloud Firestore</strong> database di tab Build.</li>
              <li>Buka file <code>firebase-applet-config.json</code> di folder aplikasi ini dan gantilah nilainya dengan kunci API pribadi Anda.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
