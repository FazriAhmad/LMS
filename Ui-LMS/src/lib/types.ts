export type Role = 'superadmin' | 'admin' | 'kepsek' | 'guru' | 'walikelas' | 'siswa' | 'ortu';

export interface User {
  id: string;
  name: string;
  email: string;
  /** Peran utama — dipakai buat badge & pemilihan dashboard. */
  role: Role;
  /** Semua peran. Guru yang ditunjuk jadi wali kelas punya `guru` DAN `walikelas`. */
  roles?: Role[];
  /** Kelas yang diwalikelasi (wali kelas cuma pegang satu kelas), null kalau bukan wali kelas. */
  homeroomClass?: { id: number; name: string } | null;
  title?: string;
  color: string;
  classId?: string;
  subjectIds?: string[];
  homeroomClassId?: string;
  childIds?: string[];
  twoFactorEnabled?: boolean;
}

export interface Kelas {
  id: string;
  name: string;
  jurusan: string;
  studentCount: number;
  homeroomId: string;
}

export interface Mapel {
  id: string;
  name: string;
  code: string;
  teacherId: string;
  color: string;
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  gender: 'L' | 'P';
  nis: string;
}

export interface ScheduleItem {
  id: string;
  classId: string;
  day: number; // 0 = Senin
  start: string;
  end: string;
  mapelId: string;
  teacherId: string;
  room: string;
}

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  type: 'ujian' | 'libur' | 'kegiatan' | 'rapat' | 'semester';
}

export interface ATPItem { id: string; code: string; text: string; courseId?: string }
export interface TPItem { id: string; code: string; text: string; atp: ATPItem[] }
export interface CPItem { id: string; mapelId: string; elemen: string; text: string; tp: TPItem[] }

export type MaterialType = 'pdf' | 'doc' | 'ppt' | 'image' | 'video' | 'youtube' | 'link';
export interface Material {
  id: string;
  type: MaterialType;
  title: string;
  size?: string;
  duration?: string;
  url?: string;
  youtubeId?: string;
}
export interface Module { id: string; title: string; pertemuan: string; materials: Material[] }
export interface Course {
  id: string;
  mapelId: string;
  classId: string;
  teacherId: string;
  description: string;
  modules: Module[];
}

export interface RubricCriterion { criterion: string; weight: number }
export type SubmissionStatus = 'belum' | 'sudah' | 'dinilai' | 'revisi';
export interface Submission {
  studentId: string;
  status: SubmissionStatus;
  file?: string;
  submittedAt?: string;
  score?: number;
  feedback?: string;
  revisions: number;
}
export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  deadline: string;
  attachments: string[];
  rubric: RubricCriterion[];
  submissions: Submission[];
}

export type QType = 'pg' | 'tf' | 'isian' | 'essay';
export type Difficulty = 'Mudah' | 'Sedang' | 'Sulit';
export interface Question {
  id: string;
  type: QType;
  text: string;
  options?: string[];
  answer: string;
  keywords?: string[];
  points: number;
  mapelId: string;
  difficulty: Difficulty;
  kompetensi: string;
  usedCount: number;
  correctRate: number;
}

export interface Quiz {
  id: string;
  courseId: string;
  title: string;
  durationMin: number;
  maxAttempts: number;
  randomize: boolean;
  questionIds: string[];
}
export interface QuizAttempt {
  quizId: string;
  date: string;
  autoScore: number;
  maxAuto: number;
  essayPending: number;
  totalPoints: number;
}

export interface ExamParticipant {
  studentId: string;
  status: 'belum' | 'sedang' | 'selesai';
  tabSwitches: number;
  score?: number;
  lastSaved?: string;
}
export interface Exam {
  id: string;
  title: string;
  type: 'PTS' | 'PAS' | 'Ujian Harian' | 'Tryout';
  courseId: string;
  classId: string;
  date: string;
  durationMin: number;
  status: 'aktif' | 'selesai' | 'terjadwal';
  questionIds: string[];
  participants: ExamParticipant[];
}

export interface GradeRow {
  studentId: string;
  mapelId: string;
  tugas: number;
  quiz: number;
  pts: number;
  pas: number;
}

export type AttStatus = 'H' | 'I' | 'S' | 'A' | 'T';
export interface AttendanceSummary {
  studentId: string;
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  terlambat: number;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  author: string;
  date: string;
  scope: 'sekolah' | 'kelas';
  classId?: string;
  pinned?: boolean;
}

export interface ForumReply { author: string; role: string; text: string; at: string }
export interface ForumThread {
  id: string;
  courseId: string;
  title: string;
  author: string;
  date: string;
  body: string;
  replies: ForumReply[];
}

export interface ChatMessage { from: string; text: string; at: string }
export interface Chat { id: string; users: string[]; messages: ChatMessage[] }

export interface Notif { id: string; text: string; time: string; read: boolean; kind: string }

export interface FileItem {
  id: string;
  name: string;
  type: string;
  size: string;
  folder: string;
  uploadedBy: string;
  at: string;
}

export interface AuditEntry { id: string; user: string; action: string; detail: string; at: string; ip: string }
export interface LoginEntry { id: string; user: string; role: string; at: string; device: string; ip: string; status: 'sukses' | 'gagal' }
export interface ActivityItem { id: string; user: string; action: string; at: string; icon: string }
export interface TeacherNote { studentId: string; from: string; note: string; at: string }

export interface Job {
  id: string;
  name: string;
  format: string;
  progress: number;
  status: 'antre' | 'proses' | 'selesai';
  at: string;
}
