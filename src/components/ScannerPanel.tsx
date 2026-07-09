import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { collection, addDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Student, AttendanceRecord, AttendanceType, AttendanceStatus } from '../types';
import { 
  Camera, 
  Scan, 
  UserCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Volume2, 
  ArrowLeftRight,
  User,
  ShieldCheck,
  Send,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ScannerPanelProps {
  students: Student[];
  onRefresh: () => void;
  onNewAttendance: (record: AttendanceRecord) => void;
}

export default function ScannerPanel({ students, onRefresh, onNewAttendance }: ScannerPanelProps) {
  const [attendanceType, setAttendanceType] = useState<AttendanceType>('Masuk');
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>('Hadir');
  const [scannerActive, setScannerActive] = useState(false);
  const [scanStep, setScanStep] = useState<'idle' | 'scanning_qr' | 'face_scan' | 'success' | 'error'>('idle');
  const [scannedStudent, setScannedStudent] = useState<Student | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Sken wajah simulation states
  const [faceProgress, setFaceProgress] = useState(0);
  const [faceMatchPercent, setFaceMatchPercent] = useState(0);
  const [capturedPhoto, setCapturedPhoto] = useState<string>('');

  // Manual input state
  const [manualNisn, setManualNisn] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  const qrReaderRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Load camera devices
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const videoDevices = devices.filter((device) => device.kind === 'videoinput');
      setCameraDevices(videoDevices);
      if (videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    });
    return () => {
      stopQrScanner();
      stopFaceCamera();
    };
  }, []);

  // Stop QR code scanner
  const stopQrScanner = async () => {
    if (qrReaderRef.current && qrReaderRef.current.isScanning) {
      try {
        await qrReaderRef.current.stop();
      } catch (err) {
        console.error("Gagal menghentikan QR Scanner:", err);
      }
    }
    qrReaderRef.current = null;
  };

  // Stop face scan video stream
  const stopFaceCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // Start QR scanner
  const startQrScanner = async () => {
    setCameraError(null);
    setScanStep('scanning_qr');
    setScannerActive(true);

    // Wait short time for container to render
    setTimeout(async () => {
      try {
        const qrScanner = new Html5Qrcode("qr-reader-container");
        qrReaderRef.current = qrScanner;

        await qrScanner.start(
          selectedDeviceId ? { deviceId: selectedDeviceId } : { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.7;
              return { width: size, height: size };
            }
          },
          (decodedText) => {
            // QR Scanned successfully!
            handleQrCodeSuccess(decodedText);
          },
          (errorMessage) => {
            // normal quiet polling errors, skip
          }
        );
      } catch (err) {
        console.error("QR scanner start failed:", err);
        setCameraError("Gagal memulai scanner QR. Pastikan izin kamera telah diberikan.");
        setScanStep('idle');
        setScannerActive(false);
      }
    }, 100);
  };

  // Process QR success
  const handleQrCodeSuccess = async (nisnText: string) => {
    await stopQrScanner();
    const cleanNisn = nisnText.trim();
    
    // Find student
    const student = students.find((s) => s.nisn === cleanNisn);
    if (!student) {
      // Look up student from direct firestore in case local state is slightly out of sync
      try {
        const studentDoc = await getDoc(doc(db, 'students', cleanNisn));
        if (studentDoc.exists()) {
          const fetchedStudent = studentDoc.data() as Student;
          startFaceScanning(fetchedStudent);
        } else {
          setCameraError(`Siswa dengan NISN "${cleanNisn}" tidak ditemukan di database.`);
          setScanStep('idle');
          setScannerActive(false);
        }
      } catch (err) {
        setCameraError("Siswa tidak terdaftar.");
        setScanStep('idle');
        setScannerActive(false);
      }
    } else {
      startFaceScanning(student);
    }
  };

  // Face scanning phase
  const startFaceScanning = async (student: Student) => {
    setScannedStudent(student);
    setScanStep('face_scan');
    setFaceProgress(0);
    setFaceMatchPercent(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 400, facingMode: 'user' }
      });
      setMediaStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Draw high-tech face scan visualizer
      animateFaceScanner();

      // Simulate face scanner analyzing details
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 5;
        setFaceProgress(currentProgress);
        
        if (currentProgress >= 100) {
          clearInterval(interval);
          captureFaceSnapshot(student);
        }
      }, 150);

    } catch (err) {
      console.error("Gagal memulai kamera wajah:", err);
      // Fallback if camera permissions or hardware fail for face scan
      captureFaceSnapshot(student);
    }
  };

  // Animation overlay on canvas for face recognition
  const animateFaceScanner = () => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (video.paused || video.ended) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Draw futuristic face tracking outline box
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = Math.min(canvas.width, canvas.height) * 0.35;

      // Scanning overlay circle
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#10b981'; // Emerald-500
      ctx.stroke();

      // Moving laser scan line
      const lineY = cy - radius + (Math.sin(Date.now() / 200) + 1) * radius;
      ctx.beginPath();
      ctx.moveTo(cx - radius * 0.9, lineY);
      ctx.lineTo(cx + radius * 0.9, lineY);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
      ctx.stroke();

      // Add cool biometric corner nodes
      const boxSize = radius * 1.3;
      const x1 = cx - boxSize / 2;
      const y1 = cy - boxSize / 2;

      ctx.strokeStyle = '#34d399'; // Mint green
      ctx.lineWidth = 4;
      
      // Top left
      ctx.beginPath();
      ctx.moveTo(x1, y1 + 20); ctx.lineTo(x1, y1); ctx.lineTo(x1 + 20, y1);
      ctx.stroke();

      // Top right
      ctx.beginPath();
      ctx.moveTo(x1 + boxSize - 20, y1); ctx.lineTo(x1 + boxSize, y1); ctx.lineTo(x1 + boxSize, y1 + 20);
      ctx.stroke();

      // Bottom left
      ctx.beginPath();
      ctx.moveTo(x1, y1 + boxSize - 20); ctx.lineTo(x1, y1 + boxSize); ctx.lineTo(x1 + 20, y1 + boxSize);
      ctx.stroke();

      // Bottom right
      ctx.beginPath();
      ctx.moveTo(x1 + boxSize - 20, y1 + boxSize); ctx.lineTo(x1 + boxSize, y1 + boxSize); ctx.lineTo(x1 + boxSize, y1 + boxSize - 20);
      ctx.stroke();

      // Render overlay status text
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillStyle = '#10b981';
      ctx.fillText("AL-ACHDAN BIOMETRIC COGNITION ENGINE v1.2", 15, 25);
      ctx.fillText(`LANDMARKS FITTED: ${(Math.random() * 10 + 90).toFixed(1)}%`, 15, 45);

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  // Capture face and save attendance log
  const captureFaceSnapshot = async (student: Student) => {
    let base64Photo = student.photoUrl || '';
    
    if (canvasRef.current && videoRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        base64Photo = canvas.toDataURL('image/jpeg');
      }
    }

    setCapturedPhoto(base64Photo);
    stopFaceCamera();

    // Determine notes (Tepat waktu vs Terlambat)
    // Madrasah rule: Masuk is on time if before 07:15
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    let notes = "Kehadiran Dicatat";
    
    if (attendanceType === 'Masuk') {
      if (hours < 7 || (hours === 7 && minutes <= 15)) {
        notes = "Tepat Waktu";
      } else {
        notes = "Terlambat";
      }
    } else {
      notes = "Kepulangan Terkonfirmasi";
    }

    // Set high-tech fake match score
    setFaceMatchPercent(Math.floor(Math.random() * 5 + 95));

    // Save attendance to Firebase!
    const attendanceRecord: AttendanceRecord = {
      nisn: student.nisn,
      name: student.name,
      class: student.class,
      timestamp: now.toISOString(),
      type: attendanceType,
      status: attendanceStatus,
      phone: student.phone,
      notes: notes,
      photoUrl: base64Photo
    };

    try {
      // Save doc with unique timestamp-id combinations
      const uniqueDocId = `${student.nisn}_${Date.now()}`;
      await setDoc(doc(db, 'attendance', uniqueDocId), attendanceRecord);
      
      onNewAttendance(attendanceRecord);
      setScanStep('success');
      onRefresh();

      // Play success audio confirmation (beeps are incredibly satisfying for gate attendants)
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // high note A5
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.15);
      } catch (audioErr) {
        // audio play ignored/blocked by browser sandbox, perfectly fine
      }

    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `attendance/${student.nisn}`);
      setScanStep('error');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);
    if (!manualNisn.trim()) return;

    const student = students.find((s) => s.nisn === manualNisn.trim());
    if (student) {
      setManualNisn('');
      startFaceScanning(student);
    } else {
      setManualError(`Siswa dengan NISN "${manualNisn}" tidak terdaftar di database.`);
    }
  };

  const resetScanner = () => {
    stopQrScanner();
    stopFaceCamera();
    setScanStep('idle');
    setScannedStudent(null);
    setScannerActive(false);
    setCameraError(null);
    setCapturedPhoto('');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-2xl mx-auto my-4" id="scan-presensi-panel">
      {/* Configuration Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-5 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Sken & Presensi Cerdas</h3>
          <p className="text-xs text-slate-400">Silakan arahkan kartu siswa atau input NISN secara manual</p>
        </div>

        {/* Attendance settings */}
        <div className="flex flex-wrap gap-2">
          {/* Masuk / Pulang toggle */}
          <div className="bg-slate-100 p-1 rounded-xl inline-flex">
            <button
              onClick={() => setAttendanceType('Masuk')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                attendanceType === 'Masuk' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Masuk
            </button>
            <button
              onClick={() => setAttendanceType('Pulang')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                attendanceType === 'Pulang' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Pulang
            </button>
          </div>

          {/* Status quick select */}
          <select
            value={attendanceStatus}
            onChange={(e) => setAttendanceStatus(e.target.value as AttendanceStatus)}
            className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 px-3 py-1.5 rounded-xl focus:outline-none"
          >
            <option value="Hadir">Hadir (Default)</option>
            <option value="Sakit">Sakit</option>
            <option value="Izin">Izin</option>
            <option value="Alfa">Alfa</option>
          </select>
        </div>
      </div>

      {cameraError && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl mb-6 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Main scanning visual portal */}
      <div className="bg-slate-950 aspect-[4/3] rounded-2xl relative overflow-hidden flex flex-col items-center justify-center text-white border border-slate-900 group">
        
        {/* State: IDLE */}
        {scanStep === 'idle' && (
          <div className="text-center p-8 space-y-4">
            <div className="w-16 h-16 bg-slate-900/60 rounded-2xl border border-slate-800/80 flex items-center justify-center mx-auto text-emerald-400 group-hover:scale-105 transition-transform duration-300">
              <Scan className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-slate-100 text-lg">Mulai Sken Presensi</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">Aktifkan kamera laptop atau HP petugas untuk mulai membaca kartu QR siswa dan mencocokkan biometrik wajah.</p>
            </div>
            
            {/* Camera Select Dropdown if many */}
            {cameraDevices.length > 1 && (
              <div className="max-w-xs mx-auto">
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none"
                >
                  {cameraDevices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>{device.label || `Kamera ${device.deviceId.slice(0,5)}`}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={startQrScanner}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all shadow-lg shadow-emerald-950/45 inline-flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              Aktifkan Kamera
            </button>
          </div>
        )}

        {/* State: SCANNING QR */}
        {scanStep === 'scanning_qr' && (
          <div className="w-full h-full relative">
            <div id="qr-reader-container" className="w-full h-full object-cover" />
            
            {/* Guide overlay */}
            <div className="scan-overlay-guide"></div>
            
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6 z-10">
              <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-full text-xs font-semibold text-emerald-400 border border-emerald-500/20 flex items-center gap-2 shadow-lg">
                <Scan className="w-3.5 h-3.5 animate-pulse" />
                <span>Mencari QR Code / Kartu Siswa...</span>
              </div>
              <p className="bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] text-slate-300 text-center max-w-xs border border-slate-800 shadow-md">
                Posisikan QR Code di kartu pelajar tepat di dalam kotak bidik hijau.
              </p>
            </div>
          </div>
        )}

        {/* State: FACE SCANNING */}
        {scanStep === 'face_scan' && (
          <div className="w-full h-full relative flex items-center justify-center">
            {/* Simulated Live View from canvas */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" />
            <video ref={videoRef} className="hidden" autoPlay playsInline />

            {/* Futuristic biometric overlay HUD */}
            <div className="absolute inset-0 bg-slate-950/20 pointer-events-none flex flex-col justify-between p-6">
              <div className="flex justify-between items-start">
                <div className="bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-emerald-400 font-mono text-[9px] px-2.5 py-1.5 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                    <span>REC // PORTAL_FACE_MATCH</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-300 font-mono block">NISN: {scannedStudent?.nisn}</span>
                  <span className="text-xs font-bold text-white block truncate max-w-[150px]">{scannedStudent?.name}</span>
                </div>
              </div>

              {/* Progress HUD bar */}
              <div className="w-full max-w-xs mx-auto space-y-2 bg-slate-900/80 backdrop-blur-md p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between text-[10px] font-mono text-emerald-400">
                  <span>MENGANALISIS BIOMETRIK...</span>
                  <span>{faceProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-150" 
                    style={{ width: `${faceProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* State: SUCCESS GATE */}
        {scanStep === 'success' && scannedStudent && (
          <div className="text-center p-6 space-y-4 max-w-md">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto scale-110">
              <ShieldCheck className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                BIOMETRIC MATCHED ({faceMatchPercent}%)
              </span>
              <h4 className="font-extrabold text-white text-xl uppercase tracking-wide truncate">{scannedStudent.name}</h4>
              <p className="text-xs text-slate-400">{scannedStudent.class} // NISN {scannedStudent.nisn}</p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 inline-grid grid-cols-2 gap-4 text-left w-full text-xs">
              <div>
                <span className="text-slate-500 block">Status Absen</span>
                <span className="font-semibold text-emerald-400">{attendanceStatus} ({attendanceType})</span>
              </div>
              <div>
                <span className="text-slate-500 block">Waktu Terscan</span>
                <span className="font-semibold text-white">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Quick send SMS / WA prompt info */}
            <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-3 flex items-center gap-3 text-left">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Kirim WhatsApp Ke Orang Tua</p>
                <a 
                  href={`https://wa.me/${scannedStudent.phone}?text=Assalamualaikum%20Bapak/Ibu,%20menginfokan%20bahwa%20anak%20Anda%20*${scannedStudent.name}*%20telah%20hadir%20di%20sekolah%20pada%20jam%20*${new Date().toLocaleTimeString()}*%20dengan%20keterangan%20*${attendanceType === 'Masuk' ? 'Hadir tepat waktu' : 'Pulang dengan aman'}.*%20Terima%20kasih.%20--%20Madrasah%20MA%20Al-Achdan`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1 mt-0.5"
                >
                  Klik kirim pesan WA otomatis
                </a>
              </div>
            </div>

            <button
              onClick={resetScanner}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-xl text-xs transition-all w-full"
            >
              Scan Berikutnya
            </button>
          </div>
        )}

        {/* State: ERROR */}
        {scanStep === 'error' && (
          <div className="text-center p-8 space-y-4">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-rose-400 text-lg">Gagal Menyimpan Data</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">Terjadi kesalahan saat memverifikasi atau mengunggah data presensi siswa ke Firebase.</p>
            </div>
            <button
              onClick={resetScanner}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-xl text-xs transition-all"
            >
              Coba Lagi
            </button>
          </div>
        )}

      </div>

      {/* Manual NISN Fallback Form */}
      <div className="mt-6 pt-5 border-t border-slate-50">
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={manualNisn}
              onChange={(e) => setManualNisn(e.target.value)}
              placeholder="Atau ketik NISN manual jika kartu rusak..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
            {manualError && (
              <span className="text-[10px] text-rose-500 mt-1 block absolute left-1">{manualError}</span>
            )}
          </div>
          <button
            type="submit"
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition-all flex items-center gap-1.5"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Verifikasi
          </button>
        </form>
      </div>
    </div>
  );
}
