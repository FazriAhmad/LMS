import type {
  User, Kelas, Mapel, Student, ScheduleItem, CalendarEvent, CPItem, Course,
  Assignment, Question, Quiz, Exam, GradeRow, AttendanceSummary, AttStatus,
  Announcement, ForumThread, Chat, Notif, FileItem, AuditEntry, LoginEntry,
  ActivityItem, TeacherNote,
} from './types';

export const SCHOOL = {
  name: 'Sakuragaoka Gakuen',
  short: 'SAKURAGAOKA',
  npsn: '20100345',
  address: 'Jl. Pendidikan Raya No. 12, Kota Bandung',
  year: '2024/2025',
  semester: 'Genap',
  email: 'info@sakuragaoka.sch.id',
  phone: '(022) 723-4567',
};

export const PASSWORD = 'demo123';

export const USERS: User[] = [
  { id: 'u-super', name: 'Ir. Bambang Sutrisno', email: 'superadmin@sman1.sch.id', role: 'superadmin', title: 'Super Admin', color: '#0f172a' },
  { id: 'u-admin', name: 'Siti Aminah, S.Pd', email: 'admin@sman1.sch.id', role: 'admin', title: 'Admin Sekolah', color: '#7c3aed' },
  { id: 'u-kepsek', name: 'Dr. Ahmad Wijaya, M.Pd', email: 'kepsek@sman1.sch.id', role: 'kepsek', title: 'Kepala Sekolah', color: '#0ea5e9' },
  { id: 'u-guru', name: 'Dewi Lestari, S.Si', email: 'dewi@sman1.sch.id', role: 'guru', title: 'Guru Matematika', color: '#4f46e5', subjectIds: ['mtk'] },
  { id: 'u-wali', name: 'Rina Kartika, S.Si', email: 'rina@sman1.sch.id', role: 'walikelas', title: 'Wali Kelas XI-IPA-1 · Guru Biologi', color: '#059669', subjectIds: ['bio'], homeroomClassId: 'k3' },
  { id: 'u-siswa', name: 'Andi Pratama', email: 'andi@sman1.sch.id', role: 'siswa', title: 'Siswa · XI-IPA-1', color: '#d97706', classId: 'k3' },
  { id: 'u-ortu', name: 'Hendra Pratama', email: 'hendra@gmail.com', role: 'ortu', title: 'Orang Tua / Wali Murid', color: '#e11d48', childIds: ['s1', 's20'] },
];

export const CLASSES: Kelas[] = [
  { id: 'k1', name: 'X-1', jurusan: 'Fase E (Umum)', studentCount: 36, homeroomId: 't6' },
  { id: 'k2', name: 'X-2', jurusan: 'Fase E (Umum)', studentCount: 36, homeroomId: 't7' },
  { id: 'k3', name: 'XI-IPA-1', jurusan: 'MIPA', studentCount: 34, homeroomId: 'u-wali' },
  { id: 'k4', name: 'XI-IPS-1', jurusan: 'IPS', studentCount: 32, homeroomId: 't5' },
  { id: 'k5', name: 'XII-IPA-1', jurusan: 'MIPA', studentCount: 35, homeroomId: 'u-guru' },
  { id: 'k6', name: 'XII-IPS-1', jurusan: 'IPS', studentCount: 33, homeroomId: 't4' },
];

export const MAPEL: Mapel[] = [
  { id: 'mtk', name: 'Matematika', code: 'MTK', teacherId: 'u-guru', color: '#4f46e5' },
  { id: 'bio', name: 'Biologi', code: 'BIO', teacherId: 'u-wali', color: '#059669' },
  { id: 'fis', name: 'Fisika', code: 'FIS', teacherId: 't3', color: '#7c3aed' },
  { id: 'bin', name: 'Bahasa Indonesia', code: 'BIN', teacherId: 't4', color: '#e11d48' },
  { id: 'big', name: 'Bahasa Inggris', code: 'BIG', teacherId: 't5', color: '#0ea5e9' },
  { id: 'sej', name: 'Sejarah', code: 'SEJ', teacherId: 't6', color: '#d97706' },
  { id: 'inf', name: 'Informatika', code: 'INF', teacherId: 't7', color: '#0891b2' },
  { id: 'ppkn', name: 'PPKn', code: 'PPKN', teacherId: 't8', color: '#0d9488' },
];

export const TEACHERS = [
  { id: 'u-guru', name: 'Dewi Lestari, S.Si', nip: '198503122010012011', subject: 'mtk', homeroom: 'k5' },
  { id: 'u-wali', name: 'Rina Kartika, S.Si', nip: '198807242011012008', subject: 'bio', homeroom: 'k3' },
  { id: 't3', name: 'Joko Susilo, M.Pd', nip: '197912052005011003', subject: 'fis', homeroom: '' },
  { id: 't4', name: 'Maria Ulfa, S.Pd', nip: '198204182006042001', subject: 'bin', homeroom: 'k6' },
  { id: 't5', name: 'Robert Wilson, M.Hum', nip: '198011302008011007', subject: 'big', homeroom: 'k4' },
  { id: 't6', name: 'Sri Handayani, S.Pd', nip: '198609102009022004', subject: 'sej', homeroom: 'k1' },
  { id: 't7', name: 'Andi Nugroho, S.Kom', nip: '199102152015041002', subject: 'inf', homeroom: 'k2' },
  { id: 't8', name: 'Dian Paramita, S.Pd', nip: '198712202010012015', subject: 'ppkn', homeroom: '' },
];

const STUDENT_NAMES: [string, 'L' | 'P'][] = [
  ['Andi Pratama', 'L'], ['Bella Safitri', 'P'], ['Bima Saputra', 'L'], ['Citra Ayu Lestari', 'P'],
  ['Dimas Ramadhan', 'L'], ['Eka Wulandari', 'P'], ['Fajar Nugraha', 'L'], ['Gita Permata', 'P'],
  ['Hafiz Alfarizi', 'L'], ['Intan Nuraini', 'P'], ['Joko Prasetyo', 'L'], ['Kartika Sari', 'P'],
  ['Lutfi Hakim', 'L'], ['Maya Anggraini', 'P'], ['Naufal Rizki', 'L'], ['Putri Maharani', 'P'],
];

export const STUDENTS: Student[] = [
  ...STUDENT_NAMES.map(([name, gender], i) => ({
    id: `s${i + 1}`, name, gender, classId: 'k3', nis: `2023${String(101 + i)}`,
  })),
  { id: 's17', name: 'Raka Firmansyah', gender: 'L', classId: 'k2', nis: '2024101' },
  { id: 's18', name: 'Dinda Lestari', gender: 'P', classId: 'k2', nis: '2024102' },
  { id: 's19', name: 'Yoga Aditya', gender: 'L', classId: 'k2', nis: '2024103' },
  { id: 's20', name: 'Sinta Pratama', gender: 'P', classId: 'k2', nis: '2024104' },
];

const S = (day: number, start: string, end: string, mapelId: string, teacherId: string, room: string, classId = 'k3', id?: string): ScheduleItem =>
  ({ id: id || `sch-${classId}-${day}-${start}`, classId, day, start, end, mapelId, teacherId, room });

export const SCHEDULE: ScheduleItem[] = [
  // Senin
  S(0, '07:00', '08:30', 'mtk', 'u-guru', 'Lab MIPA 1'),
  S(0, '08:30', '10:00', 'fis', 't3', 'Lab MIPA 1'),
  S(0, '10:15', '11:45', 'bin', 't4', 'R. 11'),
  S(0, '13:00', '14:30', 'big', 't5', 'R. 11'),
  // Selasa
  S(1, '07:00', '08:30', 'bio', 'u-wali', 'Lab Bio'),
  S(1, '08:30', '10:00', 'mtk', 'u-guru', 'R. 11'),
  S(1, '10:15', '11:45', 'inf', 't7', 'Lab Komputer'),
  S(1, '13:00', '14:30', 'ppkn', 't8', 'R. 11'),
  // Rabu
  S(2, '07:00', '08:30', 'fis', 't3', 'Lab Fisika'),
  S(2, '08:30', '10:00', 'big', 't5', 'R. 11'),
  S(2, '10:15', '11:45', 'sej', 't6', 'R. 11'),
  S(2, '13:00', '14:30', 'mtk', 'u-guru', 'R. 11'),
  // Kamis
  S(3, '07:00', '08:30', 'bin', 't4', 'R. 11'),
  S(3, '08:30', '10:00', 'bio', 'u-wali', 'R. 11'),
  S(3, '10:15', '11:45', 'mtk', 'u-guru', 'R. 11'),
  S(3, '13:00', '14:30', 'inf', 't7', 'Lab Komputer'),
  // Jumat — sengaja bentrok: Sejarah & B. Inggris overlap 30 menit
  S(4, '07:00', '08:30', 'ppkn', 't8', 'R. 11'),
  S(4, '08:30', '10:00', 'sej', 't6', 'R. 11'),
  S(4, '09:30', '11:00', 'big', 't5', 'R. Bahasa'),
  // Jadwal kelas lain (untuk deteksi bentrok guru)
  S(0, '07:30', '09:00', 'mtk', 'u-guru', 'R. 21', 'k5', 'sch-k5-0-mtk'),
  S(1, '07:00', '08:30', 'mtk', 'u-guru', 'R. 21', 'k5', 'sch-k5-1-mtk'),
  S(0, '07:00', '08:30', 'bin', 't4', 'R. 01', 'k1', 'sch-k1-0-bin'),
  S(1, '07:00', '08:30', 'bio', 'u-wali', 'Lab Bio', 'k5', 'sch-k5-1-bio'),
];

export const CALENDAR: CalendarEvent[] = [
  { id: 'ev1', date: '2025-01-06', title: 'Hari pertama semester genap', type: 'semester' },
  { id: 'ev2', date: '2025-02-14', title: 'Rapat dinas kurikulum', type: 'rapat' },
  { id: 'ev3', date: '2025-03-03', title: 'Ujian Harian Fungsi Komposisi', type: 'ujian' },
  { id: 'ev4', date: '2025-03-10', title: 'PTS Genap (CBT)', type: 'ujian' },
  { id: 'ev5', date: '2025-03-28', title: 'Libur Hari Raya Nyepi', type: 'libur' },
  { id: 'ev6', date: '2025-03-31', title: 'Libur Idul Fitri (29 Mar–8 Apr)', type: 'libur' },
  { id: 'ev7', date: '2025-04-21', title: 'Study Tour & P5: Proyek Kearifan Lokal', type: 'kegiatan' },
  { id: 'ev8', date: '2025-05-02', title: 'Tryout UTBK Gelombang 1', type: 'ujian' },
  { id: 'ev9', date: '2025-06-02', title: 'PAT / PAS Genap (CBT)', type: 'ujian' },
  { id: 'ev10', date: '2025-06-20', title: 'Pembagian rapor & akhir tahun ajaran', type: 'semester' },
];

export const CURRICULUM: CPItem[] = [
  {
    id: 'cp1', mapelId: 'mtk', elemen: 'Aljabar dan Fungsi',
    text: 'Peserta didik dapat menggeneralisasi sifat-sifat fungsi (termasuk fungsi komposisi dan invers) serta menerapkannya dalam pemodelan masalah kontekstual.',
    tp: [
      {
        id: 'tp1', code: 'TP 1.1', text: 'Menjelaskan konsep fungsi komposisi dan sifat-sifatnya',
        atp: [
          { id: 'atp1', code: 'ATP 1.1.1', text: 'Menentukan hasil komposisi dua fungsi f∘g dan g∘f', courseId: 'c1' },
          { id: 'atp2', code: 'ATP 1.1.2', text: 'Menyelesaikan masalah kontekstual dengan fungsi komposisi', courseId: 'c1' },
        ],
      },
      {
        id: 'tp2', code: 'TP 1.2', text: 'Menentukan invers fungsi dan syarat keberadaannya',
        atp: [
          { id: 'atp3', code: 'ATP 1.2.1', text: 'Menggambar grafik fungsi dan inversnya', courseId: 'c1' },
          { id: 'atp4', code: 'ATP 1.2.2', text: 'Menganalisis syarat fungsi invertibel', courseId: 'c1' },
        ],
      },
    ],
  },
  {
    id: 'cp2', mapelId: 'mtk', elemen: 'Analisis dan Geometri',
    text: 'Peserta didik dapat menganalisis transformasi geometri dan menggunakannya dalam menyelesaikan masalah.',
    tp: [
      {
        id: 'tp3', code: 'TP 2.1', text: 'Menerapkan transformasi geometri pada bidang datar',
        atp: [
          { id: 'atp5', code: 'ATP 2.1.1', text: 'Menentukan bayangan hasil translasi dan refleksi' },
          { id: 'atp6', code: 'ATP 2.1.2', text: 'Menyelesaikan komposisi transformasi' },
        ],
      },
    ],
  },
  {
    id: 'cp3', mapelId: 'bio', elemen: 'Makhluk Hidup dan Lingkungannya',
    text: 'Peserta didik memahami struktur sel serta proses yang terjadi di dalamnya dan mengaitkan dengan fungsi jaringan.',
    tp: [
      {
        id: 'tp4', code: 'TP 1.1', text: 'Mengidentifikasi struktur dan fungsi organel sel',
        atp: [
          { id: 'atp7', code: 'ATP 1.1.1', text: 'Mengamati struktur sel melalui mikroskop dan video', courseId: 'c2' },
          { id: 'atp8', code: 'ATP 1.1.2', text: 'Membuat model sel 3 dimensi', courseId: 'c2' },
        ],
      },
    ],
  },
];

export const COURSES: Course[] = [
  {
    id: 'c1', mapelId: 'mtk', classId: 'k3', teacherId: 'u-guru',
    description: 'Fungsi komposisi, invers fungsi, dan aplikasinya dalam pemodelan masalah nyata.',
    modules: [
      {
        id: 'm1', title: 'Konsep Fungsi & Relasi', pertemuan: 'Pertemuan 1–2',
        materials: [
          { id: 'mat1', type: 'pdf', title: 'Modul 1 — Konsep Fungsi (Ringkasan).pdf', size: '1,2 MB' },
          { id: 'mat2', type: 'youtube', title: 'Video: Pengantar Fungsi & Komposisi', duration: '12:40', youtubeId: 'WUvTyaaNkzM' },
          { id: 'mat3', type: 'link', title: 'Latihan Interaktif — GeoGebra Fungsi', url: 'https://www.geogebra.org/graphing' },
        ],
      },
      {
        id: 'm2', title: 'Fungsi Komposisi (f∘g)', pertemuan: 'Pertemuan 3–4',
        materials: [
          { id: 'mat4', type: 'ppt', title: 'Slide: Sifat Fungsi Komposisi.pptx', size: '3,4 MB' },
          { id: 'mat5', type: 'youtube', title: 'Video: Cara Cepat Fungsi Komposisi', duration: '09:15', youtubeId: 'fNk_zzaMoSs' },
          { id: 'mat6', type: 'doc', title: 'Lembar Kerja Peserta Didik (LKPD).docx', size: '480 KB' },
        ],
      },
      {
        id: 'm3', title: 'Invers Fungsi', pertemuan: 'Pertemuan 5–6',
        materials: [
          { id: 'mat7', type: 'pdf', title: 'Modul 3 — Invers Fungsi.pdf', size: '980 KB' },
          { id: 'mat8', type: 'image', title: 'Infografis: Syarat Fungsi Invertibel.png', size: '640 KB' },
          { id: 'mat9', type: 'youtube', title: 'Video: Grafik Fungsi & Inversnya', duration: '14:02', youtubeId: 'aircAruvnKk' },
        ],
      },
    ],
  },
  {
    id: 'c2', mapelId: 'bio', classId: 'k3', teacherId: 'u-wali',
    description: 'Struktur sel, organel, dan proses metabolisme dasar pada makhluk hidup.',
    modules: [
      {
        id: 'm4', title: 'Struktur Sel Prokariotik & Eukariotik', pertemuan: 'Pertemuan 1–2',
        materials: [
          { id: 'mat10', type: 'pdf', title: 'Modul: Struktur Sel.pdf', size: '2,1 MB' },
          { id: 'mat11', type: 'youtube', title: 'Video: Tour Inside a Cell', duration: '10:22', youtubeId: 'aircAruvnKk' },
        ],
      },
      {
        id: 'm5', title: 'Organel & Fungsinya', pertemuan: 'Pertemuan 3–4',
        materials: [
          { id: 'mat12', type: 'ppt', title: 'Slide: Organel Sel.pptx', size: '4,7 MB' },
          { id: 'mat13', type: 'link', title: 'Simulasi: Cell Size and Scale', url: 'https://learn.genetics.utah.edu/content/cells/scale/' },
        ],
      },
    ],
  },
  {
    id: 'c3', mapelId: 'fis', classId: 'k3', teacherId: 't3',
    description: 'Hukum Newton tentang gerak, gaya, dan aplikasinya dalam kehidupan sehari-hari.',
    modules: [
      {
        id: 'm6', title: 'Hukum Newton I–III', pertemuan: 'Pertemuan 1–3',
        materials: [
          { id: 'mat14', type: 'pdf', title: 'Modul: Hukum Newton.pdf', size: '1,8 MB' },
          { id: 'mat15', type: 'youtube', title: 'Video: Hukum Newton dalam Kehidupan', duration: '11:05', youtubeId: 'WUvTyaaNkzM' },
        ],
      },
    ],
  },
  {
    id: 'c4', mapelId: 'inf', classId: 'k3', teacherId: 't7',
    description: 'Dasar algoritma, pemrograman Python, dan literasi data.',
    modules: [
      {
        id: 'm7', title: 'Algoritma & Flowchart', pertemuan: 'Pertemuan 1–2',
        materials: [
          { id: 'mat16', type: 'pdf', title: 'Modul: Berpikir Komputasional.pdf', size: '1,1 MB' },
          { id: 'mat17', type: 'link', title: 'Praktik: Scratch Editor', url: 'https://scratch.mit.edu' },
        ],
      },
    ],
  },
];

export const ASSIGNMENTS: Assignment[] = [
  {
    id: 'a1', courseId: 'c1', title: 'Latihan Soal Fungsi Komposisi',
    description: 'Kerjakan 10 soal fungsi komposisi pada modul halaman 24–26. Tulis langkah penyelesaian secara lengkap, scan/foto hasil pekerjaan lalu unggah sebagai PDF atau gambar.',
    deadline: '2025-03-07T23:59', attachments: ['Soal-Latihan-Fungsi-Komposisi.pdf'],
    rubric: [
      { criterion: 'Ketepatan jawaban akhir', weight: 40 },
      { criterion: 'Kelengkapan langkah penyelesaian', weight: 35 },
      { criterion: 'Kerapihan & kejelasan penulisan', weight: 25 },
    ],
    submissions: [
      { studentId: 's1', status: 'dinilai', file: 'andi_latihan_fungsi.pdf', submittedAt: '2025-03-05T19:20', score: 88, feedback: 'Langkah penyelesaian rapi. Perhatikan tanda negatif pada soal no. 7.', revisions: 0 },
      { studentId: 's2', status: 'dinilai', file: 'bella_fungsi.pdf', submittedAt: '2025-03-04T20:11', score: 92, feedback: 'Sangat baik, pertahankan!', revisions: 0 },
      { studentId: 's3', status: 'revisi', file: 'bima_jawaban.pdf', submittedAt: '2025-03-05T08:40', score: 55, feedback: 'Soal 4–8 belum ada langkah penyelesaian. Silakan perbaiki dan kumpulkan ulang.', revisions: 1 },
      { studentId: 's4', status: 'sudah', file: 'citra_latihan.pdf', submittedAt: '2025-03-06T16:02', revisions: 0 },
      { studentId: 's5', status: 'belum', revisions: 0 },
      { studentId: 's6', status: 'sudah', file: 'eka_fungsi_komposisi.pdf', submittedAt: '2025-03-06T21:30', revisions: 0 },
      { studentId: 's7', status: 'belum', revisions: 0 },
      { studentId: 's8', status: 'dinilai', file: 'gita_latihan.pdf', submittedAt: '2025-03-03T10:15', score: 78, feedback: 'Cukup baik, pelajari kembali sifat komposisi tidak komutatif.', revisions: 0 },
      { studentId: 's9', status: 'belum', revisions: 0 },
      { studentId: 's10', status: 'sudah', file: 'intan_jawaban.pdf', submittedAt: '2025-03-06T18:44', revisions: 0 },
      { studentId: 's11', status: 'belum', revisions: 0 },
      { studentId: 's12', status: 'belum', revisions: 0 },
      { studentId: 's13', status: 'sudah', file: 'lutfi_latihan.pdf', submittedAt: '2025-03-06T22:10', revisions: 0 },
      { studentId: 's14', status: 'dinilai', file: 'maya_fungsi.pdf', submittedAt: '2025-03-05T14:30', score: 85, feedback: 'Bagus. No. 9 bisa diselesaikan lebih singkat dengan substitusi.', revisions: 0 },
      { studentId: 's15', status: 'sudah', file: 'naufal_jawaban.pdf', submittedAt: '2025-03-07T07:20', revisions: 0 },
      { studentId: 's16', status: 'sudah', file: 'putri_latihan.pdf', submittedAt: '2025-03-06T19:55', revisions: 0 },
    ],
  },
  {
    id: 'a2', courseId: 'c1', title: 'Proyek Grafik Fungsi & Inversnya',
    description: 'Buat proyek kelompok (2–3 siswa): pilih satu fungsi nyata (misal tarif parkir, pertumbuhan bakteri), gambar grafik fungsi dan inversnya menggunakan GeoGebra, lalu susun laporan singkat 2 halaman.',
    deadline: '2025-03-14T23:59', attachments: ['Panduan-Proyek-Grafik.pdf', 'Template-Laporan.docx'],
    rubric: [
      { criterion: 'Kesesuaian konteks & model fungsi', weight: 30 },
      { criterion: 'Ketepatan grafik (fungsi & invers)', weight: 40 },
      { criterion: 'Kualitas laporan & presentasi visual', weight: 30 },
    ],
    submissions: [
      { studentId: 's1', status: 'belum', revisions: 0 },
      { studentId: 's2', status: 'sudah', file: 'kelompok1_proyek_grafik.pdf', submittedAt: '2025-03-08T20:00', revisions: 0 },
    ],
  },
  {
    id: 'a3', courseId: 'c2', title: 'Laporan Pengamatan Sel',
    description: 'Susun laporan hasil pengamatan video struktur sel: bandingkan sel prokariotik dan eukariotik, minimal 3 organel beserta fungsinya.',
    deadline: '2025-03-10T23:59', attachments: ['Format-Laporan-Sel.pdf'],
    rubric: [
      { criterion: 'Kelengkapan perbandingan', weight: 40 },
      { criterion: 'Ketepatan fungsi organel', weight: 40 },
      { criterion: 'Sistematika penulisan', weight: 20 },
    ],
    submissions: [
      { studentId: 's1', status: 'sudah', file: 'andi_laporan_sel.pdf', submittedAt: '2025-03-06T15:12', revisions: 0 },
      { studentId: 's2', status: 'dinilai', file: 'bella_sel.pdf', submittedAt: '2025-03-05T19:00', score: 90, feedback: 'Perbandingan jelas dan lengkap.', revisions: 0 },
    ],
  },
  {
    id: 'a4', courseId: 'c3', title: 'Soal Cerita Hukum Newton',
    description: 'Selesaikan 5 soal cerita aplikasi Hukum Newton II (F = m·a). Sertakan diagram gaya pada setiap soal.',
    deadline: '2025-03-04T23:59', attachments: [],
    rubric: [
      { criterion: 'Diagram gaya benar', weight: 30 },
      { criterion: 'Perhitungan tepat', weight: 50 },
      { criterion: 'Satuan konsisten', weight: 20 },
    ],
    submissions: [
      { studentId: 's1', status: 'dinilai', file: 'andi_newton.pdf', submittedAt: '2025-03-04T21:40', score: 72, feedback: 'Diagram gaya soal no. 3 kurang lengkap (gaya normal belum digambar).', revisions: 0 },
      { studentId: 's5', status: 'belum', revisions: 0 },
    ],
  },
];

export const QUESTIONS: Question[] = [
  { id: 'q1', type: 'pg', text: 'Diketahui f(x) = 2x + 3 dan g(x) = x². Nilai (g∘f)(1) adalah…', options: ['16', '25', '7', '10'], answer: '25', points: 10, mapelId: 'mtk', difficulty: 'Sedang', kompetensi: 'Fungsi Komposisi', usedCount: 4, correctRate: 68 },
  { id: 'q2', type: 'pg', text: 'Jika f(x) = 3x − 1 dan g(x) = 2x, maka (f∘g)(x) = …', options: ['6x − 1', '6x − 2', '5x − 1', '3x − 2'], answer: '6x − 1', points: 10, mapelId: 'mtk', difficulty: 'Mudah', kompetensi: 'Fungsi Komposisi', usedCount: 6, correctRate: 84 },
  { id: 'q3', type: 'tf', text: 'Fungsi komposisi bersifat komutatif, yaitu (f∘g)(x) = (g∘f)(x) untuk semua fungsi f dan g.', options: ['Benar', 'Salah'], answer: 'Salah', points: 5, mapelId: 'mtk', difficulty: 'Mudah', kompetensi: 'Sifat Fungsi Komposisi', usedCount: 3, correctRate: 77 },
  { id: 'q4', type: 'isian', text: 'Jika f(x) = 4x + 2, nilai f(3) adalah…', answer: '14', keywords: ['14'], points: 10, mapelId: 'mtk', difficulty: 'Mudah', kompetensi: 'Nilai Fungsi', usedCount: 5, correctRate: 91 },
  { id: 'q5', type: 'essay', text: 'Jelaskan syarat agar suatu fungsi memiliki fungsi invers, dan berikan satu contoh fungsi yang tidak memiliki invers beserta alasannya.', answer: 'Fungsi harus berkorespondensi satu-satu (bijektif); contoh f(x)=x² tidak memiliki invers pada domain ℝ karena dua input berbeda menghasilkan output sama.', points: 15, mapelId: 'mtk', difficulty: 'Sulit', kompetensi: 'Invers Fungsi', usedCount: 2, correctRate: 0 },
  { id: 'q6', type: 'pg', text: 'Organel sel yang berfungsi sebagai tempat respirasi sel untuk menghasilkan energi adalah…', options: ['Ribosom', 'Mitokondria', 'Lisosom', 'Badan Golgi'], answer: 'Mitokondria', points: 10, mapelId: 'bio', difficulty: 'Mudah', kompetensi: 'Organel Sel', usedCount: 7, correctRate: 89 },
  { id: 'q7', type: 'tf', text: 'Sel prokariotik memiliki membran inti yang membungkus materi genetiknya.', options: ['Benar', 'Salah'], answer: 'Salah', points: 5, mapelId: 'bio', difficulty: 'Sedang', kompetensi: 'Struktur Sel', usedCount: 3, correctRate: 71 },
  { id: 'q8', type: 'pg', text: 'Daerah hasil (range) dari f(x) = x² − 4 untuk domain {−2, −1, 0, 1, 2} adalah…', options: ['{0, −3, −4}', '{−4, −3, 0}', '{0, 1, 4}', '{−4, 0, 4}'], answer: '{−4, −3, 0}', points: 10, mapelId: 'mtk', difficulty: 'Sulit', kompetensi: 'Domain & Range', usedCount: 2, correctRate: 43 },
  { id: 'q9', type: 'isian', text: 'Invers dari fungsi f(x) = x + 5 adalah f⁻¹(x) = x − …', answer: '5', keywords: ['5'], points: 10, mapelId: 'mtk', difficulty: 'Mudah', kompetensi: 'Invers Fungsi', usedCount: 4, correctRate: 86 },
  { id: 'q10', type: 'pg', text: 'Sebuah benda bermassa 2 kg diberi gaya 10 N. Percepatan benda tersebut adalah…', options: ['2 m/s²', '5 m/s²', '10 m/s²', '20 m/s²'], answer: '5 m/s²', points: 10, mapelId: 'fis', difficulty: 'Mudah', kompetensi: 'Hukum Newton II', usedCount: 8, correctRate: 90 },
  { id: 'q11', type: 'essay', text: 'Uraikan perbedaan sel hewan dan sel tumbuhan, minimal tiga perbedaan beserta fungsinya.', answer: 'Sel tumbuhan memiliki dinding sel, kloroplas, dan vakuola besar; sel hewan memiliki sentriol dan lisosom.', points: 15, mapelId: 'bio', difficulty: 'Sedang', kompetensi: 'Struktur Sel', usedCount: 1, correctRate: 0 },
  { id: 'q12', type: 'pg', text: 'Diketahui (f∘g)(x) = 4x + 6 dan f(x) = 2x + 2. Fungsi g(x) adalah…', options: ['2x + 2', '2x + 4', '4x + 4', 'x + 2'], answer: '2x + 2', points: 10, mapelId: 'mtk', difficulty: 'Sulit', kompetensi: 'Fungsi Komposisi', usedCount: 1, correctRate: 38 },
];

export const QUIZZES: Quiz[] = [
  { id: 'quiz1', courseId: 'c1', title: 'Quiz Fungsi Komposisi', durationMin: 10, maxAttempts: 2, randomize: true, questionIds: ['q1', 'q2', 'q3', 'q4', 'q5'] },
  { id: 'quiz2', courseId: 'c2', title: 'Quiz Sel & Organel', durationMin: 8, maxAttempts: 1, randomize: false, questionIds: ['q6', 'q7', 'q11'] },
];

export const EXAMS: Exam[] = [
  {
    id: 'e1', title: 'Ujian Harian: Fungsi Komposisi', type: 'Ujian Harian', courseId: 'c1', classId: 'k3',
    date: '2025-03-03T08:00', durationMin: 10, status: 'aktif',
    questionIds: ['q1', 'q2', 'q3', 'q8', 'q9', 'q12'],
    participants: [
      { studentId: 's1', status: 'belum', tabSwitches: 0 },
      { studentId: 's2', status: 'selesai', tabSwitches: 0, score: 92, lastSaved: '2025-03-03T08:42' },
      { studentId: 's3', status: 'selesai', tabSwitches: 2, score: 60, lastSaved: '2025-03-03T08:50' },
      { studentId: 's4', status: 'selesai', tabSwitches: 0, score: 85, lastSaved: '2025-03-03T08:38' },
      { studentId: 's8', status: 'selesai', tabSwitches: 1, score: 78, lastSaved: '2025-03-03T08:47' },
      { studentId: 's14', status: 'selesai', tabSwitches: 0, score: 88, lastSaved: '2025-03-03T08:35' },
    ],
  },
  {
    id: 'e2', title: 'PTS Matematika Genap', type: 'PTS', courseId: 'c1', classId: 'k3',
    date: '2025-03-10T07:30', durationMin: 90, status: 'selesai',
    questionIds: ['q1', 'q2', 'q4', 'q8', 'q9', 'q12'],
    participants: [
      { studentId: 's1', status: 'selesai', tabSwitches: 0, score: 82, lastSaved: '2025-03-10T09:00' },
      { studentId: 's2', status: 'selesai', tabSwitches: 0, score: 95, lastSaved: '2025-03-10T08:52' },
      { studentId: 's3', status: 'selesai', tabSwitches: 3, score: 58, lastSaved: '2025-03-10T09:01' },
      { studentId: 's4', status: 'selesai', tabSwitches: 0, score: 88, lastSaved: '2025-03-10T08:47' },
      { studentId: 's5', status: 'selesai', tabSwitches: 1, score: 64, lastSaved: '2025-03-10T08:58' },
      { studentId: 's6', status: 'selesai', tabSwitches: 0, score: 76, lastSaved: '2025-03-10T08:55' },
      { studentId: 's7', status: 'selesai', tabSwitches: 0, score: 71, lastSaved: '2025-03-10T09:02' },
      { studentId: 's8', status: 'selesai', tabSwitches: 1, score: 80, lastSaved: '2025-03-10T08:49' },
      { studentId: 's9', status: 'selesai', tabSwitches: 0, score: 69, lastSaved: '2025-03-10T09:00' },
      { studentId: 's10', status: 'selesai', tabSwitches: 0, score: 84, lastSaved: '2025-03-10T08:45' },
      { studentId: 's11', status: 'selesai', tabSwitches: 2, score: 62, lastSaved: '2025-03-10T09:03' },
      { studentId: 's12', status: 'selesai', tabSwitches: 0, score: 55, lastSaved: '2025-03-10T08:57' },
      { studentId: 's13', status: 'selesai', tabSwitches: 0, score: 74, lastSaved: '2025-03-10T08:51' },
      { studentId: 's14', status: 'selesai', tabSwitches: 0, score: 90, lastSaved: '2025-03-10T08:40' },
      { studentId: 's15', status: 'selesai', tabSwitches: 1, score: 79, lastSaved: '2025-03-10T08:54' },
      { studentId: 's16', status: 'selesai', tabSwitches: 0, score: 86, lastSaved: '2025-03-10T08:43' },
    ],
  },
  {
    id: 'e3', title: 'PAS Fisika Genap', type: 'PAS', courseId: 'c3', classId: 'k3',
    date: '2025-06-04T07:30', durationMin: 90, status: 'terjadwal',
    questionIds: ['q10'],
    participants: STUDENTS.filter(s => s.classId === 'k3').map(s => ({ studentId: s.id, status: 'belum' as const, tabSwitches: 0 })),
  },
  {
    id: 'e4', title: 'Tryout UTBK Gelombang 1', type: 'Tryout', courseId: 'c1', classId: 'k5',
    date: '2025-05-02T07:00', durationMin: 120, status: 'terjadwal',
    questionIds: ['q1', 'q12'],
    participants: [],
  },
];

const rnd = (i: number, salt: number) => {
  let v = 62 + ((i * 13 + salt * 29 + 7) % 34);
  if (i === 5 || i === 11) v -= 14;
  if (i === 2) v -= 8;
  return Math.max(45, Math.min(98, v));
};

export const GRADES: GradeRow[] = STUDENTS.filter(s => s.classId === 'k3').flatMap((s, i) =>
  ['mtk', 'fis', 'bio', 'inf'].map((m, j) => ({
    studentId: s.id,
    mapelId: m,
    tugas: rnd(i, j),
    quiz: rnd(i + 3, j + 1),
    pts: rnd(i + 5, j + 2),
    pas: rnd(i + 7, j + 3),
  }))
);

export const ATTENDANCE_HISTORY: AttendanceSummary[] = STUDENTS.filter(s => s.classId === 'k3').map((s, i) => ({
  studentId: s.id,
  hadir: 104 - (i % 6) - (i === 11 ? 9 : 0),
  izin: (i % 3) + 1,
  sakit: i % 4,
  alpa: i === 11 ? 3 : i % 2,
  terlambat: i % 5,
}));

export const TODAY_ATTENDANCE_INIT: Record<string, AttStatus> = Object.fromEntries(
  STUDENTS.filter(s => s.classId === 'k3').map((s, i) => [
    s.id,
    i === 4 ? 'I' : i === 8 ? 'S' : i === 11 ? 'A' : i === 6 ? 'T' : 'H',
  ])
);

export const ANNOUNCEMENTS: Announcement[] = [
  { id: 'an1', title: 'PTS Genap dilaksanakan CBT penuh', body: 'Penilaian Tengah Semester genap dilaksanakan 10–14 Maret 2025 berbasis komputer (CBT). Siswa wajib membawa akun LMS aktif. Pastikan koneksi dan perangkat siap 15 menit sebelum sesi.', author: 'Siti Aminah, S.Pd', date: '2025-03-01T08:00', scope: 'sekolah', pinned: true },
  { id: 'an2', title: 'Jadwal Tryout UTBK Gelombang 1', body: 'Tryout UTBK untuk kelas XII dilaksanakan Jumat, 2 Mei 2025 pukul 07.00 di lab komputer. Daftar peserta sudah diunggah ke Google Classroom masing-masing.', author: 'Dr. Ahmad Wijaya, M.Pd', date: '2025-02-27T10:30', scope: 'sekolah' },
  { id: 'an3', title: 'Pengumpulan proyek P5: Kearifan Lokal', body: 'Laporan proyek P5 tema Kearifan Lokal dikumpulkan paling lambat 25 April melalui wali kelas. Format laporan bebas (poster/video/makalah).', author: 'Rina Kartika, S.Si', date: '2025-02-25T13:00', scope: 'kelas', classId: 'k3' },
  { id: 'an4', title: 'Libur Idul Fitri 1446 H', body: 'Kegiatan belajar diliburkan 29 Maret – 8 April 2025. Pembelajaran daring asinkron melalui LMS dimulai 9 April.', author: 'Siti Aminah, S.Pd', date: '2025-02-20T09:00', scope: 'sekolah' },
];

export const FORUMS: ForumThread[] = [
  {
    id: 'f1', courseId: 'c1', title: 'Diskusi: Kenapa (f∘g) ≠ (g∘f)?', author: 'Bella Safitri', date: '2025-03-04T19:30',
    body: 'Saya masih bingung kenapa komposisi fungsi tidak komutatif. Padahal kalau perkalian biasa kan boleh dibalik. Ada yang bisa jelaskan dengan contoh sederhana?',
    replies: [
      { author: 'Dewi Lestari, S.Si', role: 'Guru', text: 'Pertanyaan bagus! Coba f(x)=x+1 dan g(x)=x². (g∘f)(x)=(x+1)² tapi (f∘g)(x)=x²+1. Hasilnya berbeda karena urutan proses berubah — seperti memakai kaos kaki lalu sepatu vs sebaliknya 😉', at: '2025-03-04T20:10' },
      { author: 'Andi Pratama', role: 'Siswa', text: 'Analoginya membantu banget, Bu. Terima kasih!', at: '2025-03-04T20:25' },
    ],
  },
  {
    id: 'f2', courseId: 'c1', title: 'Tips mengerjakan soal invers dengan cepat', author: 'Naufal Rizki', date: '2025-03-05T21:00',
    body: 'Sharing cara cepat: ubah f(x)=y, lalu selesaikan untuk x. Untuk fungsi linear ax+b, inversnya langsung (x−b)/a. Ada yang punya cara lain?',
    replies: [
      { author: 'Gita Permata', role: 'Siswa', text: 'Betul! Aku biasanya cek jawaban dengan komposisi f(f⁻¹(x)) harusnya = x.', at: '2025-03-06T07:40' },
    ],
  },
  {
    id: 'f3', courseId: 'c2', title: 'Pertanyaan laporan pengamatan sel', author: 'Intan Nuraini', date: '2025-03-05T16:20',
    body: 'Untuk laporan pengamatan sel, apakah boleh menambahkan gambar hasil screenshot video? Atau harus menggambar manual?',
    replies: [
      { author: 'Rina Kartika, S.Si', role: 'Guru', text: 'Boleh screenshot dari video, cantumkan sumber dan timestamp-nya ya.', at: '2025-03-05T17:00' },
    ],
  },
];

export const CHATS: Chat[] = [
  {
    id: 'ch1', users: ['u-siswa', 'u-guru'],
    messages: [
      { from: 'u-siswa', text: 'Selamat siang Bu, saya mau bertanya untuk tugas fungsi komposisi no. 7, apakah hasilnya boleh desimal?', at: '2025-03-05T12:30' },
      { from: 'u-guru', text: 'Selamat siang Andi. Boleh desimal, tapi utamakan bentuk pecahan eksak ya.', at: '2025-03-05T12:45' },
      { from: 'u-siswa', text: 'Baik Bu, terima kasih 🙏', at: '2025-03-05T12:47' },
      { from: 'u-guru', text: 'Sama-sama. Nilai tugas kamu sudah masuk, cek menu Nilai ya.', at: '2025-03-06T08:10' },
    ],
  },
  {
    id: 'ch2', users: ['u-ortu', 'u-wali'],
    messages: [
      { from: 'u-ortu', text: 'Selamat pagi Bu Rina, saya orang tua Andi. Apakah benar minggu depan ada PTS?', at: '2025-03-02T08:00' },
      { from: 'u-wali', text: 'Selamat pagi Pak Hendra. Benar, PTS dimulai 10 Maret. Jadwal lengkap bisa dilihat di menu Jadwal. Andi juga tercatat rajin, kehadirannya 96%.', at: '2025-03-02T08:20' },
      { from: 'u-ortu', text: 'Terima kasih infonya, Bu.', at: '2025-03-02T08:22' },
    ],
  },
  {
    id: 'ch3', users: ['u-guru', 'u-wali'],
    messages: [
      { from: 'u-guru', text: 'Bu Rina, ada 4 siswa XI-IPA-1 yang belum mengumpulkan tugas fungsi komposisi. Mohon diingatkan saat jam wali kelas.', at: '2025-03-06T14:00' },
      { from: 'u-wali', text: 'Siap Bu Dewi, akan saya sampaikan besok pagi. Daftar namanya sudah terlihat di dashboard.', at: '2025-03-06T14:12' },
    ],
  },
];

export const NOTIFS_INIT: Notif[] = [
  { id: 'n1', text: 'Tugas "Latihan Soal Fungsi Komposisi" mendekati deadline (7 Mar)', time: '2025-03-06T07:00', read: false, kind: 'tugas' },
  { id: 'n2', text: 'Nilai tugas Matematika kamu sudah keluar: 88', time: '2025-03-06T09:30', read: false, kind: 'nilai' },
  { id: 'n3', text: 'PTS Genap dimulai 10 Maret — cek menu Ujian', time: '2025-03-05T08:00', read: false, kind: 'ujian' },
  { id: 'n4', text: 'Pengumuman baru: Libur Idul Fitri 1446 H', time: '2025-03-04T09:00', read: true, kind: 'pengumuman' },
  { id: 'n5', text: 'Ibu Dewi membalas chat kamu', time: '2025-03-05T12:45', read: true, kind: 'chat' },
];

export const FILES: FileItem[] = [
  { id: 'fl1', name: 'Modul 1 — Konsep Fungsi.pdf', type: 'pdf', size: '1,2 MB', folder: 'XI-IPA-1/Matematika', uploadedBy: 'Dewi Lestari', at: '2025-02-10T08:00' },
  { id: 'fl2', name: 'Slide Sifat Fungsi Komposisi.pptx', type: 'ppt', size: '3,4 MB', folder: 'XI-IPA-1/Matematika', uploadedBy: 'Dewi Lestari', at: '2025-02-17T09:15' },
  { id: 'fl3', name: 'LKPD Fungsi Komposisi.docx', type: 'doc', size: '480 KB', folder: 'XI-IPA-1/Matematika', uploadedBy: 'Dewi Lestari', at: '2025-02-18T10:00' },
  { id: 'fl4', name: 'Modul Struktur Sel.pdf', type: 'pdf', size: '2,1 MB', folder: 'XI-IPA-1/Biologi', uploadedBy: 'Rina Kartika', at: '2025-02-11T07:30' },
  { id: 'fl5', name: 'Video Praktikum Mikroskop.mp4', type: 'video', size: '18,6 MB', folder: 'XI-IPA-1/Biologi', uploadedBy: 'Rina Kartika', at: '2025-02-12T13:20' },
  { id: 'fl6', name: 'Modul Hukum Newton.pdf', type: 'pdf', size: '1,8 MB', folder: 'XI-IPA-1/Fisika', uploadedBy: 'Joko Susilo', at: '2025-02-13T08:45' },
  { id: 'fl7', name: 'Soal PTS Genap — Paket A.pdf', type: 'pdf', size: '760 KB', folder: 'Sekolah/Ujian', uploadedBy: 'Siti Aminah', at: '2025-03-01T15:00' },
  { id: 'fl8', name: 'Panduan P5 Kearifan Lokal.pdf', type: 'pdf', size: '1,4 MB', folder: 'Sekolah/P5', uploadedBy: 'Ahmad Wijaya', at: '2025-02-20T11:00' },
  { id: 'fl9', name: 'Infografis Fungsi Invertibel.png', type: 'image', size: '640 KB', folder: 'XI-IPA-1/Matematika', uploadedBy: 'Dewi Lestari', at: '2025-02-24T09:30' },
  { id: 'fl10', name: 'Modul Berpikir Komputasional.pdf', type: 'pdf', size: '1,1 MB', folder: 'XI-IPA-1/Informatika', uploadedBy: 'Andi Nugroho', at: '2025-02-15T10:10' },
];

export const STORAGE = { usedGB: 3.2, quotaGB: 10 };

export const AUDIT_LOG: AuditEntry[] = [
  { id: 'au1', user: 'Dewi Lestari', action: 'INPUT NILAI', detail: 'Menilai 6 pengumpulan tugas "Latihan Soal Fungsi Komposisi"', at: '2025-03-06T10:20', ip: '10.10.4.21' },
  { id: 'au2', user: 'Siti Aminah', action: 'UPLOAD FILE', detail: 'Mengunggah Soal PTS Genap — Paket A.pdf (760 KB)', at: '2025-03-01T15:00', ip: '10.10.4.10' },
  { id: 'au3', user: 'Andi Pratama', action: 'MULAI UJIAN', detail: 'Memulai PTS Matematika Genap (CBT)', at: '2025-03-10T07:32', ip: '10.20.8.114' },
  { id: 'au4', user: 'Bima Saputra', action: 'PERINGATAN UJIAN', detail: 'Terdeteksi pindah tab 2× saat PTS Matematika', at: '2025-03-10T08:15', ip: '10.20.8.122' },
  { id: 'au5', user: 'Rina Kartika', action: 'PRESENSI', detail: 'Input presensi XI-IPA-1 (34 siswa)', at: '2025-03-06T07:15', ip: '10.10.4.33' },
  { id: 'au6', user: 'Ahmad Wijaya', action: 'EXPORT LAPORAN', detail: 'Export rekap nilai kelas XI (PDF, background job)', at: '2025-03-05T14:40', ip: '10.10.4.2' },
  { id: 'au7', user: 'Super Admin', action: 'RESET PASSWORD', detail: 'Reset password siswa Joko Prasetyo', at: '2025-03-04T09:12', ip: '10.10.4.1' },
  { id: 'au8', user: 'Dewi Lestari', action: 'CHAT', detail: 'Percakapan chat dengan Andi Pratama (tersimpan di audit trail)', at: '2025-03-05T12:45', ip: '10.10.4.21' },
];

export const LOGIN_HISTORY: LoginEntry[] = [
  { id: 'lh1', user: 'Andi Pratama', role: 'Siswa', at: '2025-03-07T06:45', device: 'Chrome · Android', ip: '182.10.x.x', status: 'sukses' },
  { id: 'lh2', user: 'Dewi Lestari', role: 'Guru', at: '2025-03-07T06:30', device: 'Edge · Windows 11', ip: '10.10.4.21', status: 'sukses' },
  { id: 'lh3', user: 'Joko Prasetyo', role: 'Siswa', at: '2025-03-06T23:12', device: 'Chrome · Android', ip: '36.85.x.x', status: 'gagal' },
  { id: 'lh4', user: 'Joko Prasetyo', role: 'Siswa', at: '2025-03-06T23:14', device: 'Chrome · Android', ip: '36.85.x.x', status: 'gagal' },
  { id: 'lh5', user: 'Siti Aminah', role: 'Admin', at: '2025-03-06T07:02', device: 'Firefox · Ubuntu', ip: '10.10.4.10', status: 'sukses' },
  { id: 'lh6', user: 'Hendra Pratama', role: 'Orang Tua', at: '2025-03-05T20:30', device: 'Safari · iPhone', ip: '114.10.x.x', status: 'sukses' },
  { id: 'lh7', user: 'Ahmad Wijaya', role: 'Kepala Sekolah', at: '2025-03-05T07:15', device: 'Chrome · Windows 11', ip: '10.10.4.2', status: 'sukses' },
  { id: 'lh8', user: 'Rina Kartika', role: 'Wali Kelas', at: '2025-03-04T06:55', device: 'Chrome · Windows 10', ip: '10.10.4.33', status: 'sukses' },
];

export const ACTIVITIES: ActivityItem[] = [
  { id: 'ac1', user: 'Bella Safitri', action: 'menyelesaikan materi "Video: Cara Cepat Fungsi Komposisi"', at: '2025-03-07T06:50', icon: 'check' },
  { id: 'ac2', user: 'Andi Pratama', action: 'mengumpulkan tugas "Laporan Pengamatan Sel"', at: '2025-03-06T15:12', icon: 'upload' },
  { id: 'ac3', user: 'Dewi Lestari', action: 'menilai 6 pengumpulan tugas Latihan Fungsi Komposisi', at: '2025-03-06T10:20', icon: 'star' },
  { id: 'ac4', user: 'Naufal Rizki', action: 'membuat thread forum "Tips mengerjakan soal invers"', at: '2025-03-05T21:00', icon: 'message' },
  { id: 'ac5', user: 'Gita Permata', action: 'menyelesaikan Quiz Fungsi Komposisi (skor 80)', at: '2025-03-05T19:40', icon: 'quiz' },
  { id: 'ac6', user: 'Kartika Sari', action: 'tidak aktif selama 7 hari di LMS', at: '2025-03-05T00:00', icon: 'alert' },
  { id: 'ac7', user: 'Rina Kartika', action: 'mengunggah Modul Struktur Sel.pdf ke File Management', at: '2025-02-11T07:30', icon: 'upload' },
  { id: 'ac8', user: 'Hafiz Alfarizi', action: 'login pertama dalam 5 hari', at: '2025-03-04T16:20', icon: 'login' },
];

export const TEACHER_NOTES: TeacherNote[] = [
  { studentId: 's1', from: 'Dewi Lestari, S.Si', note: 'Andi aktif bertanya di forum dan konsisten mengumpulkan tugas tepat waktu. Perlu latihan soal tipe HOTS (level sulit).', at: '2025-03-05' },
  { studentId: 's1', from: 'Rina Kartika, S.Si', note: 'Sopan dan kooperatif saat kerja kelompok. Kehadiran sangat baik.', at: '2025-03-01' },
  { studentId: 's20', from: 'Andi Nugroho, S.Kom', note: 'Sinta cepat memahami materi Informatika, namun beberapa kali terlambat masuk jam pertama.', at: '2025-03-03' },
];

export const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin', admin: 'Admin', kepsek: 'Kepala Sekolah', guru: 'Guru',
  walikelas: 'Wali Kelas', siswa: 'Siswa', ortu: 'Orang Tua',
};

export const ROLE_COLORS: Record<string, string> = {
  superadmin: 'bg-slate-900 text-white',
  admin: 'bg-violet-100 text-violet-700',
  kepsek: 'bg-sky-100 text-sky-700',
  guru: 'bg-indigo-100 text-indigo-700',
  walikelas: 'bg-emerald-100 text-emerald-700',
  siswa: 'bg-amber-100 text-amber-700',
  ortu: 'bg-rose-100 text-rose-700',
};

export const getMapel = (id: string) => MAPEL.find(m => m.id === id)!;
export const getClass = (id: string) => CLASSES.find(c => c.id === id)!;
export const getStudent = (id: string) => STUDENTS.find(s => s.id === id)!;
export const getCourse = (id: string) => COURSES.find(c => c.id === id)!;
export const getTeacherName = (id: string) => {
  const u = USERS.find(u => u.id === id);
  if (u) return u.name;
  const t = TEACHERS.find(t => t.id === id);
  return t ? t.name : '-';
};
