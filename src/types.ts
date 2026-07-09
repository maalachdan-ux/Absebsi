export interface Student {
  nisn: string;
  name: string;
  class: string;
  phone: string;
  photoUrl?: string; // Base64 string for student card berfoto
  createdAt: string;
}

export type AttendanceType = 'Masuk' | 'Pulang';
export type AttendanceStatus = 'Hadir' | 'Sakit' | 'Izin' | 'Alfa';

export interface AttendanceRecord {
  id?: string;
  nisn: string;
  name: string;
  class: string;
  timestamp: string; // ISO date string or formatted date
  type: AttendanceType;
  status: AttendanceStatus;
  phone: string;
  notes: string; // "Tepat Waktu", "Terlambat", etc.
  photoUrl?: string; // Captured photo or student photo
}
