# Status Progress — LMS Sekolah (Checkpoint 2026-08-21, update ke-2)

> File ini dipakai sebagai checkpoint lintas-sesi. Ditulis karena context window sesi sebelumnya sudah ~90% — lanjutkan di sesi chat baru dengan minta Claude baca file ini dulu.

## Ringkasan Proyek

LMS sekolah multi-peran (Admin, Kepala Sekolah, Guru, Wali Kelas, Siswa, Orang Tua, Super Admin) — dikerjakan lewat 3 tahap: PRD → referensi UI (sudah ada) → backend Laravel (sedang dibangun step-by-step sesuai urutan PRD Fase 1).

## 📄 PRD

Dibuat sebagai artifact HTML interaktif (sidebar TOC, 19 modul fitur, tabel peran & akses, tech stack, roadmap 3 fase):
**https://claude.ai/code/artifact/7e2dd8b5-d73d-4818-9469-146013176447**

Sudah direvisi beberapa kali sesuai diskusi:
- Ditambah: alur registrasi butuh approval Super Admin/Admin (modul 03), ujian online default 1x percobaan kecuali diubah Admin/Super Admin (modul 08)
- Dihapus: modul Integrasi (Google Workspace/Drive/Meet/Zoom/WhatsApp/Calendar) — user memutuskan semua komunikasi cukup lewat Forum & Chat internal LMS, YouTube tetap dipakai tapi cuma sebagai bagian modul Materi (05), bukan modul integrasi terpisah. Modul di-renumber jadi 19 (dari 20).

Kalau mau baca PRD lengkap, buka link di atas — jangan re-generate dari nol, artifact-nya masih ada dan sudah final untuk versi saat ini.

## 📁 Struktur Folder

```
C:\Users\Fazri\portofolio\LMS\
├── STATUS.md          (file ini)
├── logo-sklh.jpg       (logo sekolah, buat branding — belum dipakai di kode)
├── Ui-LMS/             (frontend React+TS+Vite — SEDANG disambungkan bertahap ke API asli, lihat bagian 🔌 di bawah)
└── Api-LMS/            (backend Laravel, SEDANG DIBANGUN oleh Claude sesi ini)
```

### Ui-LMS (frontend — sedang disambungkan bertahap ke backend, lihat 🔌 di bawah)
- Nama app: "EduNusa LMS — SMA Negeri 1 Nusantara"
- React 19 + TypeScript + Vite + Tailwind v4 + Framer Motion + react-router-dom
- `src/lib/types.ts` — model data lengkap (Role, User, Kelas, Mapel, Student, Course, Module, Material, Assignment, Quiz, Exam, GradeRow, dll) — **ini acuan utama buat desain schema backend**, hampir semua tabel backend saya turunkan dari sini. **Sengaja belum dirombak** biar halaman yang belum disambungkan tetap jalan pakai mock (lihat strategi migrasi di bagian 🔌).
- `src/lib/api.ts` — **BARU**, klien fetch buat API asli (token di localStorage key `edunusa_token`, wrapper `api.get/post/put/patch/delete`, class `ApiError`)
- `src/lib/data.ts` + `src/lib/store.tsx` — data dummy in-memory, **halaman yang BELUM disambungkan masih pakai ini** — jangan heran kalau sebagian halaman datanya nyata dan sebagian masih dummy, itu memang strategi migrasi bertahap yang disepakati user, bukan kerja setengah jadi yang lupa dirapikan
- `src/pages/Integrasi.tsx` — halaman ini perlu **dihapus/diganti** nanti karena modul Integrasi sudah dicoret dari PRD
- Launch config: `.claude/launch.json` di root portofolio sudah ada entry `"lms-ui"` (port 5173)

### Api-LMS (backend, progress sesi ini)
- Laravel 12 + PostgreSQL, database `LMS` (dibuat user, Postgres lokal Windows — bukan Docker)
- `.env`: `DB_CONNECTION=pgsql`, `DB_DATABASE=LMS`, `DB_USERNAME=postgres`, `DB_PASSWORD=ada512`, host `127.0.0.1:5432`
- Package: `laravel/sanctum` (auth token), `spatie/laravel-permission` (role, guard `web`)
- Launch config belum ditambahkan ke `.claude/launch.json` — kalau mau preview, jalanin manual: `php artisan serve --host=127.0.0.1 --port=8010` dari folder `Api-LMS` (pakai port 8010, BUKAN 8000, karena project lain di portofolio ini sering nyangkut/rebutan port 8000 — lihat catatan "Hati-hati Port" di bawah)

## ✅ Progress Backend (16/19 modul + 4 upgrade — FASE 1, 2 & sebagian FASE 3 SELESAI, semua teruji end-to-end)

### Modul 03 — User & Role
- Login (username, bukan email — keputusan produk karena siswa SD/SMP belum tentu punya email), 7 role via Spatie
- **Alur approval**: registrasi mandiri (`POST /register`, role guru/ortu saja) → status `pending` → gagal login sampai di-approve → Admin/Super Admin approve/reject (`POST /users/{id}/approve|reject`)
- Admin bikin akun langsung (`POST /users`) → status langsung `approved`, dipakai buat bikin akun guru/siswa/kepsek dll
- Ganti password, custom Authenticate middleware (biar API selalu balikin JSON, bukan nyoba redirect ke halaman login yang nggak ada — bug ini pernah kejadian di project money-management, sekarang dicegah dari awal)

### Modul 02 — Manajemen Akademik
- Tahun ajaran (cuma 1 aktif dalam satu waktu, endpoint `/activate`), jurusan, mata pelajaran, kelas, penugasan mengajar (guru+mapel+kelas+tahun ajaran, unique constraint)
- Profil siswa (NIS, gender, kelas) — extension tabel dari `users`, bukan tabel User terpisah
- Relasi orang tua-anak (many-to-many, `parent_student` pivot, mendukung "multiple children")
- **Penting**: Wali Kelas BUKAN role yang dipilih manual saat bikin akun — begitu Admin nunjuk `homeroom_teacher_id` di suatu kelas, role `walikelas` otomatis nempel/lepas sendiri di akun guru itu (`SchoolClassController::syncHomeroomRole`). Ini sesuai PRD ("Wali Kelas adalah peran tambahan di atas Guru, bukan akun terpisah").
  - **Bug yang pernah kejadian & sudah diperbaiki**: urutan operasi salah (cek "masih jadi wali di kelas lain" dijalankan SEBELUM data baru tersimpan ke DB, jadi kelas yang sedang diubah ke-hitung sebagai masih terhubung). Kalau nanti nemuin bug serupa di logic sync role lain, cek urutannya: update dulu ke DB, baru query ulang buat sync.

### Modul 04-05 — Course & Materi
- Course = 1 mapel di 1 kelas, dibangun DI ATAS `teaching_assignment_id` (bukan data duplikat) — jadi guru pengampu course selalu konsisten sama data penugasan mengajar
- Modul per pertemuan, materi tipe pdf/doc/ppt/image/video/youtube/link
- **Upload file beneran** dengan batas ukuran sesuai PRD: dokumen 20MB, gambar 5MB, video 50MB (video upload dibolehkan tapi YouTube tetap direkomendasikan sebagai default)
- Progress belajar: siswa tandai materi selesai (`POST /materials/{id}/complete`)
- Otorisasi ketat per-request (bukan cuma middleware role generik): guru cuma bisa ubah course yang dia ampu, siswa cuma bisa lihat course di kelasnya sendiri — semua dicek langsung di controller

### Modul 06 — Tugas
- `assignments` (1 course → banyak tugas, `rubric` & `attachments` disimpan sebagai JSON column, bukan tabel terpisah — cukup buat data terstruktur kecil yang tak pernah di-query per-baris)
- `assignment_submissions` (1 baris per siswa per tugas, unique constraint) — status `sudah`/`dinilai`/`revisi`, `score`, `feedback`, `revisions` (nambah otomatis kalau siswa submit ulang setelah diminta revisi)
- Endpoint: `GET/POST /courses/{course}/assignments`, `GET/PUT/DELETE /assignments/{id}`, `POST /assignments/{id}/submit` (siswa), `POST /assignment-submissions/{id}/grade` (guru — set status `dinilai`+score atau `revisi`+feedback)
- Otorisasi pola sama seperti Course/Materi: guru pengampu atau Admin/Super Admin buat ubah, siswa di kelas yang sama buat lihat & submit
- **Sudah teruji end-to-end**: guru buat tugas+rubrik+lampiran → siswa lihat & submit → guru nilai → siswa lihat nilai → guru minta revisi → siswa submit ulang (revisions bertambah) → otorisasi negatif (siswa coba hapus/nilai tugas orang → 403)
- **Catatan teknis**: curl.exe versi mingw di environment ini (`curl 8.2.1 x86_64-w64-mingw32`) punya bug — field name yang mengandung `[` `]` (dipakai buat array multipart seperti `rubric[0][criterion]` atau `attachments[]`) selalu gagal dengan exit 26 "Failed to open/read local data", baik pakai backslash-escape atau tidak, ke localhost maupun ke httpbin.org eksternal. **Bukan bug di kode Laravel.** Solusinya waktu testing: pakai PHP+Guzzle (`vendor/autoload.php` sudah ada di project) buat request multipart dengan field array, jangan curl kalau butuh field bracket. Field tanpa bracket (mis. `file=@path`) tetap normal lewat curl.

### Modul 12 — Jadwal
- `schedule_items` dibangun DI ATAS `teaching_assignment_id` (sama seperti Course) — jadi guru/mapel/kelas selalu konsisten sama data penugasan mengajar, bukan data duplikat
- Field: `day` (0=Senin..6=Minggu), `start_time`, `end_time`, `room`
- Endpoint: `GET /schedule-items` (semua role login, hasil difilter otomatis: siswa lihat jadwal kelasnya, guru/walikelas lihat jadwal mengajarnya sendiri kecuali override query `school_class_id`/`teacher_id`), `POST/PUT/DELETE /schedule-items` (Admin/Super Admin saja, sama seperti Manajemen Akademik)
- **Deteksi bentrok otomatis di server** (bukan cuma di UI kayak referensi `Ui-LMS`): waktu overlap di hari yang sama + (kelas sama ATAU guru sama) → ditolak 422 saat create/update. Batas waktu pakai `<`/`>` murni (bukan `<=`/`>=`) jadi jadwal back-to-back (mis. berakhir 08:30, mulai 08:30) TIDAK dianggap bentrok — sudah diverifikasi lewat test.
- **Sudah teruji end-to-end**: buat jadwal → coba buat jadwal bentrok (ditolak) → buat jadwal back-to-back (sukses) → siswa & guru lihat jadwal terfilter sesuai peran → siswa coba buat jadwal (ditolak 403) → update ke waktu sama persis (sukses, exclude diri sendiri dari cek bentrok) → update ke waktu yang beneran bentrok (ditolak) → delete

### Modul 11 — Presensi
- `attendances`: 1 baris per siswa per tanggal (unique constraint), `status` H/I/S/A/T, `school_class_id` sengaja disnapshot (bukan derive dari `student_profiles`) supaya rekap historis tetap benar walau siswa pindah kelas belakangan
- Endpoint: `GET/POST /school-classes/{id}/attendance?date=` (input & lihat presensi 1 kelas 1 hari, upsert per siswa), `GET /attendance/summary` (rekap H/I/S/A/T per siswa, filter `student_id`/`school_class_id`/`from`/`to`)
- **Otorisasi input presensi lebih ketat dari referensi `Ui-LMS`**: cuma wali kelas kelas tsb atau Admin/Super Admin yang boleh input/lihat presensi harian (bukan semua guru, karena presensi harian adalah tanggung jawab wali kelas, bukan per-mapel) — kalau ternyata PRD maksudnya semua guru boleh input, gampang dilonggarkan di `authorizeRecorder()`
- Rekap: siswa cuma bisa lihat rekap sendiri, ortu cuma anak sendiri (dicek lewat relasi `parent_student`), staf (guru/walikelas/admin/superadmin/kepsek) bebas filter
- **Sudah teruji end-to-end**: wali kelas input presensi 2 tanggal beda status → rekap H/I/S/A/T terhitung benar → siswa lihat rekap sendiri (tanpa perlu kirim `student_id`) → siswa dilarang akses endpoint input kelas (403) → status tidak valid ditolak (422)
- **Sengaja BELUM dikerjakan** (di luar scope inti "presensi harian"): QR Attendance dinamis dengan rotasi kode + simulasi scan yang ada di referensi `Ui-LMS/src/pages/Presensi.tsx` — itu fitur self-checkin real-time yang jauh lebih kompleks (perlu session token, rotasi, kemungkinan validasi lokasi), beda level dari "wali kelas input presensi manual". Tambahkan sebagai modul terpisah kalau memang dibutuhkan.

### Modul 10 — Penilaian Dasar
- `grades`: 1 baris per siswa per course (unique constraint), kolom `tugas`/`quiz`/`pts`/`pas` (0-100) + `feedback`. Nilai akhir & grade huruf **dihitung on-the-fly** di model (`Grade::finalScore()`/`gradeLetter()`), bukan disimpan — supaya kalau bobot berubah nanti, data lama otomatis ikut ke-update tanpa migration ulang
- **Bobot & formula disamakan persis dengan referensi `Ui-LMS`** (`src/lib/utils.ts` WEIGHTS): tugas 25% + quiz 25% + PTS 25% + PAS 25%, grade A≥90/B≥80/C≥70/D<70
- Endpoint: `GET/POST /courses/{course}/grades` (guru pengampu/Admin kelola, siswa cuma lihat nilainya sendiri), `GET /grades/me` (siswa lihat semua mapel + rata-rata; ortu lihat nilai anak lewat `?student_id=`)
- **Sudah teruji end-to-end**: guru simpan nilai satu siswa → nilai akhir & grade terhitung benar (85,90,80,95 → 88, "B") → siswa lihat nilai course ini (cuma row dirinya) → siswa lihat rekap semua mapel + rata-rata → siswa dilarang menyimpan nilai (403)
- **Sengaja BELUM dikerjakan**: ranking lintas-mapel per kelas yang ada di referensi `Ui-LMS` (rata-rata semua course sekaligus, badge top-3) — itu agregasi lintas-course yang lebih rumit dan menurut catatan di UI-nya sendiri "opsional, dapat dimatikan admin", jadi ditunda. Kalau dibutuhkan, tinggal query rata-rata `final` semua `grades` milik siswa per kelas.

### Modul 01 — Dashboard per Role
- **Tidak ada tabel baru** — murni agregasi query dari 7 modul yang sudah ada (Akademik, Course/Materi, Tugas, Jadwal, Presensi, Nilai, User/Role). Satu endpoint `GET /dashboard`, isinya beda sesuai role login (dispatch di `DashboardController::index` mirip switch-by-role di referensi `Ui-LMS/src/pages/Dashboard.tsx`):
  - **Siswa**: rata-rata nilai, % kehadiran, jumlah tugas belum dikumpulkan, progress materi (selesai/total), jadwal hari ini, 5 deadline tugas terdekat, nilai terbaru per mapel
  - **Guru/Wali Kelas**: daftar kelas diampu, jumlah pengumpulan tugas menunggu dinilai, jadwal mengajar hari ini; kalau wali kelas ada tambahan ringkasan kelas wali (jumlah siswa, rata-rata nilai, % kehadiran hari ini)
  - **Orang Tua**: per anak — rata-rata nilai, % kehadiran, jumlah tugas aktif
  - **Kepala Sekolah**: total siswa/guru, rata-rata nilai per kelas, daftar siswa performa rendah (<75), rekap presensi sekolah hari ini
  - **Admin/Super Admin**: total siswa/guru/kelas/mapel, % kehadiran hari ini, statistik tugas (total/terkumpul/menunggu dinilai)
- **Sudah teruji end-to-end** dengan data nyata (bukan cuma cek "tidak error"): dibuat jadwal hari-ini + nilai + presensi, lalu diverifikasi angkanya match persis di dashboard siswa, guru/walikelas, kepsek (rata-rata kelas), dan admin (% kehadiran)
- **Sengaja BELUM dikerjakan** karena bergantung pada modul yang belum ada (Fase 2+): Pengumuman, Log Aktivitas LMS, Ujian/CBT, Bank Soal, Storage monitoring — semua field ini ada di referensi `Ui-LMS/src/pages/Dashboard.tsx` tapi datanya butuh modul yang belum dibangun. Tambahkan ke `DashboardController` begitu modulnya ada.

---

## 🏁 FASE 1 SELESAI

Semua 8 modul PRD Fase 1 sudah dikerjakan & teruji end-to-end: User & Role (03), Manajemen Akademik (02), Course & Materi (04-05), Tugas (06), Jadwal (12), Presensi (11), Penilaian Dasar (10), Dashboard per Role (01).

**Sudah di-`git init` & push** ke [github.com/FazriAhmad/LMS](https://github.com/FazriAhmad/LMS), branch `main`. `.env`/`vendor`/`node_modules`/`database.sqlite` semua ter-exclude lewat `.gitignore` masing-masing folder — dicek manual sebelum push pertama, aman.

## 🚀 FASE 2 — SEDANG BERJALAN

### Modul 07 — Quiz
- **Bank soal dasar (`questions`) dibangun sebagai fondasi bersama** buat Quiz (07), nanti dipakai juga oleh Ujian Online (08) dan diperluas jadi Bank Soal penuh (09) — bukan tabel terpisah per modul, karena soal memang harus reusable lintas quiz/ujian. Soal terikat ke `subject_id` (bukan `course_id`) supaya bisa dipakai ulang guru yang sama di kelas paralel manapun untuk mapel itu.
- Tipe soal: `pg`/`tf` (opsi + kunci), `isian` (kunci + keyword alternatif buat fuzzy match), `essay` (tanpa kunci, dinilai manual). Otorisasi: guru pengampu mapel tsb (dicek dari `teaching_assignments`) atau Admin/Super Admin boleh buat; ubah/hapus cuma pembuat soal atau Admin.
- `quizzes` + `quiz_questions` (pivot berurutan) + `quiz_attempts` + `quiz_attempt_answers` (jawaban per soal per percobaan, buat basis grading essay manual)
- **Keamanan yang sengaja diperbaiki dari referensi `Ui-LMS`**: di reference, jawaban benar (`Question.answer`) selalu ada di data client meski quiz belum dikerjakan (karena semua data mock ada di browser). Di backend ini, `GET /quizzes/{id}` **menyembunyikan kunci jawaban dari siswa** sampai mereka submit attempt — endpoint attempt result baru mengungkap kunci setelah dikumpulkan. Guru/Admin selalu lihat kunci lengkap.
- Auto-grading: pg/tf exact match, isian match kunci ATAU salah satu keyword (case-insensitive, whitespace-insensitive), essay selalu `is_correct=null` (butuh nilai manual guru lewat `POST /quiz-attempts/{id}/grade-essay`)
- Endpoint: `GET/POST /courses/{course}/quizzes`, `GET/PUT/DELETE /quizzes/{id}`, `POST /quizzes/{id}/attempts` (siswa submit, validasi `max_attempts` & keanggotaan kelas), `GET /quizzes/{id}/attempts` (riwayat — siswa lihat punya sendiri, guru/admin lihat semua buat antrean grading), `GET /quiz-attempts/{id}` (detail + kunci), `POST /quiz-attempts/{id}/grade-essay`
- Bank soal: `GET/POST/PUT/DELETE /questions` (filter `subject_id`/`type`/`difficulty`)
- **Sudah teruji end-to-end**: buat 3 soal (pg/isian/essay) → buat quiz → siswa lihat quiz TANPA kunci jawaban → submit attempt (pg benar, isian match keyword "pi r^2", essay diisi) → auto_score 25/25 benar, essay_pending_count 1 → guru lihat antrean grading → guru nilai essay (20) → final_score jadi 45 (25+20), essay_pending_count jadi 0 → percobaan ke-2 terekam (attempts_used naik) → percobaan ke-3 ditolak (max_attempts=2) → siswa dilarang buat quiz (403) → validasi soal beda mapel ditolak saat buat quiz (422)
- **Sengaja BELUM dikerjakan**: statistik `usedCount`/`correctRate` per soal di referensi `Ui-LMS` (analitik bank soal, cocoknya masuk modul 09 nanti) — bisa dihitung on-the-fly dari `quiz_attempt_answers` kalau dibutuhkan, tidak perlu kolom tersimpan.

### Modul 08 — Ujian Online (CBT)
- **Ternyata cukup beda dari Quiz buat jadi tabel sendiri** (bukan cuma nambah kolom di `quizzes` seperti dugaan awal): Ujian cuma 1x percobaan per siswa (bukan multi-attempt), punya state machine `terjadwal → aktif → selesai` yang dikontrol guru (`POST /exams/{id}/open|close`), butuh auto-save progress berkala (bukan submit sekali di akhir), dan skor dihitung dalam skala 0-100 (persentase), bukan jumlah poin mentah kayak Quiz.
- `exams` + `exam_questions` (pivot, reuse bank soal `questions` yang sama dengan Quiz) + `exam_participants` (1 baris per siswa per ujian — nyimpen draft jawaban `answers` JSON yang ditimpa tiap auto-save, `tab_switches`, `score`, `last_saved_at`)
- **Soal essay ditolak saat ujian dibuat** — beda dari Quiz, Ujian Online di referensi `Ui-LMS` sama sekali tidak punya alur grading manual essay, jadi validasi server menolak kalau ada soal essay ikut dipilih (403/422 duluan daripada nyimpen data yang gak pernah bisa dinilai)
- **Ujian yang sudah dibuka (`aktif`) tidak bisa diedit lagi** (`PUT /exams/{id}` ditolak kalau status bukan `terjadwal`) — mencegah guru mengubah soal di tengah ujian berlangsung
- Endpoint: `GET/POST /courses/{course}/exams`, `GET/PUT/DELETE /exams/{id}`, `POST /exams/{id}/open|close` (guru/admin), `POST /exams/{id}/start` (siswa masuk ruang ujian, cuma sekali), `PATCH /exams/{id}/progress` (auto-save berkala, kirim `answers` + `tab_switches`), `POST /exams/{id}/submit` (final, hitung skor), `GET /exams/{id}/participants` (monitoring guru: status/tab-switch/skor semua siswa)
- **2 bug ditemukan & diperbaiki saat testing end-to-end** (bukan cuma "tidak error" — dicek nilai aktualnya): `status` exam dan `tab_switches` peserta sempat balik `null` bukan default seharusnya (`terjadwal`/`0`) karena Eloquent `create()` gak otomatis nge-refresh default kolom dari Postgres ke instance in-memory — sekarang di-set eksplisit di controller. **Kalau nemu pola serupa di controller lain** (field dengan `->default()` di migration tapi gak diisi eksplisit saat `create()`), curiga dulu ke bug yang sama.
- **Sudah teruji end-to-end**: siswa dilarang mulai sebelum ujian dibuka (422) → guru buka ujian → siswa mulai (1x, percobaan kedua ditolak) → auto-save progress → submit final (1 benar dari 2 soal @ 50 poin → skor 50, sesuai skala 0-100) → siswa dilarang submit/save lagi setelah selesai (403) → guru lihat monitoring (tab_switches & skor akurat) → guru dilarang edit ujian yang sudah dibuka (422) → soal essay ditolak saat buat ujian (422) → guru tutup ujian (`selesai`)
- **Sengaja BELUM dikerjakan**: proctoring webcam (referensi `Ui-LMS` sendiri menandainya "fase lanjutan, perlu persetujuan orang tua") — di luar scope CBT dasar.

### Modul 09 — Bank Soal (lengkap)
- **Tidak ada tabel baru** — memperluas `QuestionController` yang sudah ada dari modul 07 dengan 2 fitur nyata yang di referensi `Ui-LMS` (`BankSoal.tsx`) sebelumnya cuma dummy: filter pencarian (`?q=` di teks/kompetensi, pakai `ilike`) dan statistik `used_count`/`correct_rate` per soal.
- **Statistik dihitung on-the-fly**, bukan kolom tersimpan yang perlu disinkronkan — `used_count` = jumlah kemunculan soal di jawaban quiz (`quiz_attempt_answers`) + peserta ujian yang sudah `selesai` (decode JSON `exam_participants.answers`); `correct_rate` = % jawaban benar dari yang **bisa dinilai otomatis** (pg/tf/isian), `null` buat soal essay atau soal yang belum pernah dipakai (bukan `0`, biar beda jelas sama "pernah dipakai tapi semua salah")
- **Sudah teruji end-to-end** dengan skenario gabungan lintas modul: 1 soal PG dipakai di quiz (2×, 1 benar 1 salah) + ujian (1×, benar) → `used_count: 3`, `correct_rate: 67` (2 dari 3 benar) — dihitung benar gabungan dari dua sumber data yang strukturnya beda (quiz pakai tabel jawaban per-soal, ujian pakai JSON blob per-peserta). Soal essay dipakai 2× tapi `correct_rate: null` (sesuai — essay gak bisa dinilai otomatis). Filter pencarian `?q=` teruji cari di teks maupun kompetensi.
- **Sengaja BELUM dikerjakan**: import Excel massal & export — di referensi `Ui-LMS` ini cuma tombol dummy yang munculin toast "(demo)", bukan fitur nyata yang perlu direplikasi persis; export sebenarnya bisa dikerjakan client-side dari hasil `GET /questions` tanpa endpoint backend terpisah. Tagging kurikulum lanjutan (di luar field `kompetensi` yang sudah ada) juga belum — PRD belum spesifik soal ini butuh struktur apa.

### Modul 10 upgrade — Penilaian: bobot custom per mapel
- Tabel baru `grade_weights` (1 baris per `subject_id`, kolom `tugas`/`quiz`/`pts`/`pas` dalam persen, harus total 100). Kalau sekolah belum atur, fallback ke default 25/25/25/25 (perilaku Fase 1 tetap jalan tanpa perlu migrasi data).
- `Grade::finalScore()` diubah dari konstanta hardcode jadi baca `GradeWeight::forSubject()` — **nilai lama otomatis ikut ke-update begitu bobot diubah**, gak perlu recalculate/migrate data existing (sudah diverifikasi: nilai tugas=100/lainnya=0 → final 25 di bobot default → ubah bobot tugas jadi 70% → final langsung jadi 70 tanpa sentuh baris `grades`).
- Endpoint: `GET/PUT /subjects/{subject}/grade-weight` — guru pengampu mapel tsb atau Admin/Super Admin boleh atur, total wajib 100% (422 kalau tidak)
- **Sudah teruji end-to-end**: bobot default 25/25/25/25 → simpan nilai → ubah bobot → nilai lama ikut berubah otomatis → validasi total≠100 ditolak → siswa dilarang ubah bobot (403)

## 🚀 Sisa Fase 2 (dari roadmap resmi PRD)

PRD dibuka & dibaca lengkap (bukan tebakan) — daftar modul per fase dari section `#roadmap`:
- ✅ **07 Quiz**, **08 Ujian Online** (tanpa monitoring lanjutan — itu Fase 3), **09 Bank Soal** — selesai
- ✅ **10 Penilaian lengkap (bobot)** — selesai (baru saja, lihat di atas)
- ✅ **13 Progress & Aktivitas** — selesai (lihat detail di bawah)
- ✅ **14 Komunikasi → dipersempit jadi Forum saja** (keputusan produk user: "tidak usah ada modul komunikasi, komunikasi lewat forum saja") — Pengumuman, Chat guru-siswa+audit trail, dan Notifikasi **sengaja tidak dikerjakan**, bukan kelupaan. Forum diskusi per course (sebenarnya bagian modul 04, Fase 1, tapi belum sempat dikerjakan waktu itu) yang dibangun sebagai gantinya.
- ✅ **15 Portal Orang Tua** — selesai (lihat detail di bawah)
- ✅ **16 Laporan & Export** — selesai, **diproses sync** (keputusan produk, bukan Laravel Queue seperti disarankan PRD — lihat detail di bawah)
- ✅ **19 Admin Sistem → dipersempit ke profil/branding sekolah** — konfigurasi notifikasi & trigger backup **sengaja tidak dikerjakan** (lihat alasan di bawah)

### Modul 13 — Progress & Aktivitas
- **Tidak ada tabel log baru** — linimasa aktivitas digabung on-the-fly dari 4 tabel yang sudah punya timestamp relevan (`material_progress.completed_at`, `assignment_submissions.submitted_at`, `quiz_attempts.submitted_at`, `exam_participants.submitted_at`), bukan event-logging terpisah yang perlu disinkronkan
- Endpoint: `GET /courses/{course}/progress` (% materi selesai per siswa; guru/admin lihat semua, siswa lihat dirinya), `GET /students/{student}/activity` (linimasa gabungan, terurut terbaru; guru/walikelas/admin/kepsek/ortu-anak-sendiri/siswa-diri-sendiri), `GET /students/inactive?days=N&school_class_id=` (siswa tanpa aktivitas N hari — wali kelas otomatis dibatasi ke kelas walinya sendiri kecuali override)
- **Bug ditemukan & diperbaiki saat testing**: query `selectRaw('max(...) as at')` di Postgres balik sebagai string mentah, bukan otomatis ke-cast Carbon (beda dari akses attribute biasa yang kena `$casts` model) — perbandingan tanggal (`<`, `max()`) jadi salah kalau dibiarkan string. Diperbaiki dengan `Carbon::parse()` eksplisit sebelum dibandingkan.
- **Sengaja BELUM dikerjakan**: "durasi belajar" (estimasi waktu di dalam course) — PRD sendiri bilang ini "berdasar aktivitas sesi, bukan pengukuran presisi", tapi tetap butuh mekanisme tracking baru (heartbeat/session ping) yang belum ada infrastrukturnya sama sekali di project ini, beda dari 3 fitur lain yang bisa dihitung murni dari data existing. Perlu keputusan desain terpisah (interval ping, apa yang dihitung sebagai "aktif").
- **Sudah teruji end-to-end**: siswa selesaikan materi → progress course 1/1 (100%) → aktivitas muncul di linimasa guru → `students/inactive?days=365` kosong (siswa baru aktif) → `days=0` menampilkan siswa (aktivitas "kemarin" terhadap cutoff sekarang) → siswa dilarang akses daftar siswa tidak aktif (403)

### Modul 04 (susulan) — Forum Diskusi
- `forum_threads` + `forum_replies`, terikat ke `course_id` — siapapun yang punya akses lihat course (guru pengampu, siswa di kelasnya, admin/kepsek) boleh buat thread & balas
- Moderasi hapus: penulis sendiri, guru pengampu course, atau Admin/Super Admin
- **Sudah teruji end-to-end**: guru buat thread → siswa lihat & balas → siswa hapus balasannya sendiri (boleh) → siswa coba hapus thread guru (ditolak 403)

### Modul 15 — Portal Orang Tua
- **Celah keamanan nyata ditemukan & ditutup**: sebelum modul ini, role `ortu` **sama sekali tidak punya jalur akses** ke jadwal & tugas anaknya — `authorizeView()` di `AssignmentController`/`ScheduleItemController`/`QuizController`/dst cuma cek admin/kepsek/guru-pengampu/siswa-di-kelasnya, tidak ada cabang buat ortu. Nilai (`grades/me`) & presensi (`attendance/summary`) sudah lebih dulu punya dukungan `?student_id=` dari modul-modul itu, jadi tidak diduplikasi.
- **Pendekatan yang dipilih**: bukan menambal `authorizeView()` di 4-5 controller berbeda (risiko regresi lebih besar), tapi bikin `ParentPortalController` terpisah yang query data yang sama dengan otorisasi ketat "anak ini harus terhubung ke akun ortu yang login" (`$user->children()->where('users.id', $studentId)`)
- Endpoint: `GET /parent/children`, `GET /parent/schedule?student_id=`, `GET /parent/assignments?student_id=` — semua 403 kalau `student_id` bukan anak sendiri atau tidak dikirim
- **Catatan guru** (fitur baru, beda dari feedback tugas biasa): tabel `teacher_notes`, guru yang mengajar siswa itu (atau wali kelasnya) bisa tulis catatan kualitatif, ortu & siswa bisa baca, cuma penulis/admin yang bisa hapus. Endpoint `GET/POST /students/{id}/notes`, `DELETE /teacher-notes/{id}`.
- **Sudah teruji end-to-end**: ortu lihat daftar anak → lihat jadwal & tugas anak (data match dengan yang dibuat) → **ortu dilarang akses data siswa lain** (403, termasuk kalau `student_id` tidak dikirim sama sekali) → guru tulis catatan → ortu baca → ortu dilarang menulis catatan (403, cuma guru/admin)

### Modul 16 — Laporan & Export
- **Keputusan produk: sync, bukan Laravel Queue** seperti disarankan PRD — user pilih ini karena untuk skala satu sekolah proses langsung cukup cepat, dan queue worker terpisah (`php artisan queue:work`) nambah proses yang harus di-manage di luar web server. Gampang dipindah ke queue job asli nanti kalau laporan mulai berat/lambat, tanpa ubah query intinya.
- **Export CSV native PHP** (`fputcsv`), bukan library `maatwebsite/excel`/`dompdf` — CSV buka mulus di Excel, jadi cukup buat kebutuhan "export ke Excel" tanpa nambah dependency baru. Export PDF asli (rapor dengan layout) tidak dikerjakan — beda kebutuhan dari CSV tabular, butuh dompdf + template desain.
- 3 laporan: `GET /reports/grades` (nilai per siswa, filter kelas/mapel), `GET /reports/attendance` (rekap H/I/S/A/T + %, filter kelas/rentang tanggal), `GET /reports/class-performance` (rata-rata nilai + kehadiran per kelas — buat kebutuhan Kepala Sekolah). Semua terima `?format=csv` buat download langsung.
- Otorisasi: staf sekolah saja (guru/walikelas/admin/superadmin/kepsek), siswa/ortu ditolak — laporan ini level operasional/manajerial, beda dari data pribadi yang sudah dibuka di modul lain
- **Bug ditemukan & diperbaiki saat testing**: `$request->string('format') !== 'csv'` selalu `true` (Laravel `Request::string()` balikin objek `Stringable`, bukan string biasa, jadi perbandingan `!==` dengan string literal gagal terus) — akibatnya `?format=csv` diam-diam balik JSON, bukan file CSV. Diperbaiki pakai `$request->query('format')` yang balikin string mentah. **Kalau nemu `$request->string(...)` dibandingkan langsung pakai `===`/`!==` di controller lain, curiga dulu ke bug yang sama.**
- **Sudah teruji end-to-end**: nilai & presensi tercatat → laporan nilai & performa kelas JSON akurat → export CSV beneran jadi file (`Content-Disposition: attachment`, bukan JSON) → siswa ditolak akses laporan (403)

### Modul 19 — Admin Sistem (dipersempit)
- **Cuma profil/branding sekolah** yang dikerjakan: `school_settings` tabel singleton (selalu 1 baris, `firstOrCreate` otomatis kalau belum ada), field nama/nama-singkat/NPSN/alamat/email/telepon/logo. `GET /school-setting` (semua role login, buat ditampilkan di header), `POST /school-setting` (Admin/Super Admin saja, terima upload logo)
- **"Konfigurasi notifikasi" sengaja di-skip**: gak ada channel notifikasi buat dikonfigurasi, karena modul Komunikasi (14) sengaja tidak dikerjakan (komunikasi cukup lewat Forum, keputusan produk)
- **"Trigger backup manual" sengaja di-skip**: backup database sungguhan butuh akses shell (`pg_dump`) di luar scope endpoint API biasa — tombol "backup" yang cuma pura-pura sukses tanpa benar-benar melakukan apa pun lebih berbahaya daripada berguna (memberi rasa aman palsu). Kalau dibutuhkan, ini pantasnya jadi scheduled command (`php artisan schedule`) yang jalan di server, bukan endpoint HTTP.
- **Sudah teruji end-to-end**: siswa lihat profil sekolah (default singleton) → siswa dilarang ubah (403) → admin update profil → data tersimpan & terbaca benar

---

## 🏁 FASE 1 & FASE 2 SELESAI

16 dari 19 modul PRD sudah dikerjakan (semua Fase 1 + semua Fase 2 yang applicable, dengan beberapa penyesuaian scope by design lewat keputusan produk eksplisit — bukan kelupaan):
- **Fase 1** (8 modul): User & Role, Manajemen Akademik, Course & Materi, Tugas, Jadwal, Presensi, Penilaian dasar, Dashboard per role
- **Fase 2** (8 modul + 1 upgrade + 1 susulan Fase 1): Quiz, Ujian Online, Bank Soal, Penilaian lengkap (bobot), Progress & Aktivitas, Forum (pengganti Komunikasi penuh), Portal Orang Tua, Laporan & Export, Admin Sistem (dipersempit)

**3 modul PRD sengaja tidak dikerjakan** (bukan lupa, ada alasan produk/teknis eksplisit — cek detail di masing-masing bagian modul di atas):
- Komunikasi (14) versi penuh — dipersempit jadi Forum saja atas keputusan user
- Bagian "konfigurasi notifikasi" & "trigger backup" dari Admin Sistem (19)
- Fase 3 seluruhnya (proctoring webcam, QR attendance, storage monitoring, AI essay scoring, 2FA) — PRD sendiri menandainya "butuh kematangan operasional/keputusan kebijakan dulu"

Semua sudah di-push ke [github.com/FazriAhmad/LMS](https://github.com/FazriAhmad/LMS), branch `main`.

**Fase 3 — progress (checkpoint 2026-08-22):**
- ✅ QR Attendance dinamis (modul 11 upgrade) — selesai
- ✅ Storage Monitoring (modul 17 upgrade) — selesai
- ✅ 2FA & Audit Log (modul 18 upgrade) — selesai
- ⬜ Proctoring webcam — **di-skip atas keputusan user** ("skip dulu, kerjakan yang lain")
- ⬜ AI-assisted essay scoring — **di-skip atas keputusan user** (butuh API key/biaya provider AI eksternal, bukan wewenang saya putuskan sendiri)

### Modul 11 upgrade — QR Attendance Dinamis
- `qr_attendance_sessions`: wali kelas/Admin buka sesi (default berlaku 10 menit), server generate `secret` random 40 karakter yang **tidak pernah dikirim ke client** — cuma kode turunannya
- **Kode dihitung, bukan disimpan per-rotasi**: `kode = HMAC-SHA256(secret, floor(waktu/30)) dipotong 6 karakter` — jadi tidak perlu job/cron buat generate kode baru tiap 30 detik, tinggal dihitung ulang tiap kali di-request. Toleransi 1 jendela ke belakang buat jeda scan/network.
- Endpoint: `POST /school-classes/{id}/qr-attendance` (buka sesi), `GET /qr-attendance/{id}` (kode saat ini + sisa detik — dipoll layar guru), `POST /qr-attendance/{id}/scan` (siswa submit kode, otomatis bikin/update `Attendance` status H hari itu, `notes: "Scan QR"`)
- **Beda dari referensi `Ui-LMS`**: di sana kode QR pure random client-side yang gak pernah divalidasi server (screenshot lama tetap "valid" selamanya di mata UI). Di sini kode benar-benar rotate & diverifikasi server — screenshot kode basi otomatis ditolak begitu jendela 30 detik lewat.
- **Sudah teruji end-to-end**: buka sesi → kode konsisten dalam jendela yang sama → siswa scan kode salah (422) → scan kode benar → presensi H tercatat otomatis dgn notes "Scan QR" → **tunggu 35 detik nyata, verifikasi kode BENERAN berubah** (bukan cuma dicek logikanya) → kode jendela sebelumnya masih diterima (toleransi) → siswa dilarang buka sesi (403)

### Modul 17 upgrade — Storage Monitoring
- `school_settings.storage_quota_mb` (default 5120 = 5GB, bisa diubah Admin). `GET /storage/usage` hitung total dari kolom `file_size` yang sudah ditrack Materi & Pengumpulan Tugas + `size` dari JSON lampiran Tugas — **bukan scan filesystem** (lambat kalau file banyak)
- Breakdown per kategori (materi/pengumpulan tugas/lampiran tugas) + `percent_used` + flag `warning` (≥80%)
- **Sudah teruji end-to-end**: upload materi 1MB nyata → `used_mb: 1`, `percent_used` akurat sesuai kuota → validasi kuota minimum ditolak → siswa dilarang akses (403)

### Modul 18 upgrade — 2FA & Audit Log Diperluas
- **2FA: TOTP (RFC 6238) native**, bukan Laravel Fortify — Fortify itu paket auth berbasis session/views yang arsitekturnya beda dari API token (Sanctum) kita, motong yang gak perlu. Implementasi `app/Support/Totp.php` (~100 baris, HMAC-SHA1 + base32, stdlib PHP doang) **diverifikasi cocok persis dengan test vector resmi RFC 6238** (kunci `"12345678901234567890"`, T=59 → kode `287082`) — jadi kompatibel dengan Google Authenticator/Authy sungguhan, bukan skema custom yang cuma konsisten sama dirinya sendiri. Ada test permanen di `tests/Unit/TotpTest.php`.
- Alur: `POST /2fa/setup` (generate secret + otpauth URL buat QR code) → `POST /2fa/confirm` (verifikasi kode pertama, baru aktif, dapat 8 recovery code sekali-pakai di-hash) → login selanjutnya balikin `{requires_2fa:true, challenge}` bukan token langsung → `POST /login/verify-2fa` (kode TOTP atau recovery code) baru keluarin token asli. Challenge disimpan di cache (5 menit) bukan tabel.
- **Wajib buat Super Admin/Admin di-soft-enforce**: field `must_setup_2fa` muncul di response login kalau role admin/superadmin belum aktifkan 2FA — tetap bisa login (gak dikunci total), tapi frontend "disuruh" paksa ke halaman setup. Keputusan sadar: hard-lock berisiko mengunci akun testing/produksi tanpa jalan keluar kalau ada masalah setup.
- **Audit log dipasang lewat model event di SATU tempat** (`AppServiceProvider::boot()`), bukan ditambal manual ke tiap `->update()`/`->destroy()` di 15+ controller — auto-cover semua `deleted` pada model akademik inti (User, SchoolClass, Subject, TeachingAssignment, Course, Assignment, Quiz, Exam, Question, ScheduleItem, AcademicYear) dan `updated` pada Grade & User. Perubahan role (`assignRole`/`removeRole`) diaudit manual di 3 titik (`UserController`, `AuthController::register`, `SchoolClassController` sinkronisasi walikelas) karena itu tabel pivot Spatie, gak lewat event model User langsung.
- **Kolom sensitif di-redact eksplisit dari log** (`password`, `two_factor_secret`, `two_factor_recovery_codes`) — ditemukan & diperbaiki SEBELUM sempat bocor lewat testing manual, bukan insiden nyata: waktu nulis hook awal saya sadar `getChanges()` bakal ikut nyeret secret TOTP mentah ke `audit_logs.changes` kalau gak di-exclude.
- `GET /audit-logs` (Admin/Super Admin, filter `model`/`action`/`user_id`)
- **Sudah teruji end-to-end**: login admin tanpa 2FA → `must_setup_2fa:true` → setup+confirm 2FA (kode TOTP dihitung manual, cocok) → login berikutnya wajib 2FA (`requires_2fa`) → kode salah ditolak (422) → kode benar berhasil → recovery code berhasil login sekali → recovery code sama dipakai lagi ditolak → aksi sensitif (buat akun+assign role, hapus akun, ubah nilai) semua otomatis tercatat di audit log dengan detail benar → guru non-admin dilarang lihat audit log (403)
- **2FA superadmin di-reset ke nonaktif setelah testing** (biar sesi selanjutnya bisa login normal tanpa perlu kode TOTP) — kalau mau coba lagi, tinggal ulang alur setup di atas.

### Modul 08 upgrade — Ujian Online: Kunci Fullscreen (permintaan user langsung, di luar PRD asli)
- **Batasan teknis yang perlu dipahami**: website TIDAK BISA benar-benar mencegah siswa pindah tab/buka tab baru — browser sengaja tidak mengizinkan halaman web mengontrol itu. Yang bisa: Fullscreen API (minta browser masuk layar penuh) + deteksi kalau siswa KELUAR dari fullscreen (`fullscreenchange` event, ini kerjaan frontend, belum ada karena UI belum disambungkan). Backend di bawah ini menyediakan endpoint buat konsekuensi sisi server begitu frontend mendeteksi keluar fullscreen.
- **Alur (permintaan user)**: siswa keluar fullscreen → status `ExamParticipant` jadi `terkunci` (BUKAN otomatis selesai) → siswa gak bisa autosave/submit lagi selama terkunci → guru pengampu/Admin/Super Admin pilih salah satu: **buka kunci** (`unlock`, siswa lanjut) atau **selesaikan paksa** (`force-finish`, dinilai dari jawaban terakhir yang ke-auto-save, gak perlu siswa submit ulang)
- Endpoint: `POST /exams/{id}/lock` (siswa lapor sendiri), `POST /exam-participants/{id}/unlock`, `POST /exam-participants/{id}/force-finish` (keduanya guru pengampu/Admin/Super Admin)
- Refactor kecil: logika hitung skor di `submit()` dipisah ke method `calculateScore()` biar dipakai bareng `forceFinish()` — gak nulis ulang.
- **Sudah teruji end-to-end**: siswa mulai ujian → lock (keluar fullscreen) → autosave ditolak selama terkunci (403) → guru lihat status "terkunci" di monitoring → guru unlock → siswa lanjut autosave (sukses) → siswa lock lagi → guru force-finish pakai jawaban tersimpan terakhir (skor terhitung akurat, diverifikasi 100 buat jawaban benar) → siswa dilarang unlock diri sendiri (403) → guru dilarang unlock peserta yang statusnya bukan terkunci (422)
- **Belum ada di frontend** (karena UI belum disambungkan ke backend sama sekali) — bagian yang perlu ditambahkan nanti: `requestFullscreen()` saat mulai ujian, listener `fullscreenchange` yang panggil `POST /exams/{id}/lock` begitu keluar, dan UI buat guru pilih unlock/force-finish dari layar monitoring.

## 🔑 Akun & Data yang Sudah Ada di Database

Data ini nyata ada di DB `LMS` sekarang (bukan cuma dummy test yang dihapus lagi):

| Username | Password | Role | Catatan |
|---|---|---|---|
| `superadmin` | `admin12345` | superadmin | Akun awal, dibuat manual lewat tinker |
| `dewi_lestari` | `guru12345` | guru, walikelas | Wali kelas XI-IPA-1, ngajar Matematika |
| `citra_ayu` | `siswa12345` | siswa | NIS 2024001, kelas XI-IPA-1 |

Data akademik: tahun ajaran "2024/2025" semester genap (aktif), jurusan "IPA", mapel "Matematika" (MTK), kelas "XI-IPA-1", 1 course Matematika dengan 1 modul "Fungsi Komposisi" berisi 1 materi YouTube.

**Nama-nama ini sengaja disamakan dengan data dummy di `Ui-LMS/src/lib/data.ts`** (Dewi Lestari = guru Matematika, Citra Ayu Lestari = siswa yang ngumpulin tugas) — biar nanti gampang bikin seeder yang konsisten sama tampilan referensi UI.

## ⚠️ Catatan Penting Buat Sesi Lanjutan

1. **Hati-hati soal port bentrok.** Portofolio ini punya BANYAK project lain yang jalan bareng (money-management pakai Docker di port 8000/5432/5173, hotel_2 pernah nyangkut di port 8000/5180 karena proses lupa di-kill). Kalau backend LMS aneh/dapet data yang salah, curiga dulu ke port bentrok — cek `netstat -ano | grep ":8010"` dulu sebelum debug lebih jauh. **Selalu pakai port 8010 buat Api-LMS**, jangan 8000 (udah kepake project lain).
2. **Selalu `pkill -f "artisan serve"` setelah selesai testing** — sesi sebelumnya pernah kejadian proses `php artisan serve` numpuk nggak ke-kill dan bikin project lain (money-management) kelihatan "data hilang" padahal cuma nyasar ke server yang salah.
3. **Migration pakai `->change()` akan gagal** — `doctrine/dbal` belum terinstall di project ini. Kalau perlu ubah kolom existing, pakai `DB::statement('ALTER TABLE ... ALTER COLUMN ...')` raw SQL, atau edit migration asli langsung kalau project masih fresh/belum ada data penting (lihat pola di migration `0001_01_01_000000_create_users_table.php` yang sudah diedit langsung dari bawaan Laravel).
4. **Password akun yang dibuat via `POST /users` (admin bikin akun) itu RANDOM** kalau field `password` nggak dikirim eksplisit — jangan lupa set manual lewat tinker kalau mau testing login, atau kirim password eksplisit di request.
5. **`$request->string('x') !== 'y'` SELALU `true`** — `Request::string()` balikin objek `Stringable`, bukan string biasa, jadi perbandingan langsung pakai `===`/`!==` gagal terus (bug nyata yang kejadian di `ReportController`, sudah diperbaiki). Kalau perlu bandingkan query param persis, pakai `$request->query('x')` yang balikin string mentah.
6. **Eloquent `create()` gak otomatis refresh kolom yang punya `->default()` di migration** — field yang gak diisi eksplisit di array `create()` balik `null` di instance in-memory (bukan default DB-nya), meski di database beneran keisi default. Selalu isi eksplisit kolom dengan default di `create()`/`updateOrCreate()`, jangan andalkan default migration buat instance yang langsung dipakai di response.

## 🔌 Menyambungkan Ui-LMS ke Api-LMS (dimulai 2026-08-22, SEDANG BERJALAN)

**Keputusan user (jangan diubah tanpa konfirmasi ulang)**: sambungkan **satu-per-satu**, halaman yang belum kebagian giliran **tetap pakai mock data** — bukan rombak semua sekaligus. Ini strategi yang sengaja dipilih karena skalanya besar (19 halaman, semua baca dari satu `store.tsx` raksasa dengan ID mock string `'s1'`/`'g1'` yang beda total dari ID numerik asli Postgres).

### Sudah tersambung nyata (bukan mock lagi)
- **Login/Logout** (`AuthController::login/logout` asli) — form ganti dari email jadi username (backend pakai username, bukan email), tombol "quick-login" lama (bypass password) diganti "isi otomatis" yang cuma ngisi form, tetap lewat POST /login sungguhan
- **Sesi tervalidasi ulang tiap load** — kalau ada token tersimpan, di-cek ke `GET /me` dulu (bukan percaya cache `localStorage` mentah-mentah); kalau gak ada token, user lama di cache **dihapus otomatis** (bug nyata yang ketemu & diperbaiki pas testing: tanpa ini, user basi dari sebelum penyambungan ini bisa lolos ke Dashboard lalu semua API call gagal 401)
- **Dashboard** (`GET /dashboard`, kelima varian per role: siswa/guru-walikelas/ortu/kepsek/admin) — bagian yang gak ada padanannya di backend (Aktivitas Terbaru LMS, Pengumuman, Ujian Aktif count, Storage card di admin) **sengaja dihilangkan dari tampilan**, bukan dibiarkan nunjuk ke data kosong/salah
- File baru: `src/lib/api.ts` (klien fetch + token management), diverifikasi lewat browser sungguhan (bukan cuma `tsc --noEmit`) — login 3 role beda (wali kelas, siswa, superadmin), logout, kredensial salah, semua nunjukin angka asli dari database yang beda jauh dari mock (mis. mock selalu bilang "7 pengumpulan menunggu", punya asli nunjuk "0" karena datanya emang kosong)

### Belum tersambung (masih 100% mock, nunggu giliran)
Semua halaman lain: Akademik, Kurikulum, Jadwal, Kalender, Courses/CourseDetail, Tugas/TugasDetail, Ujian/QuizPlayer/ExamPlayer, BankSoal, Nilai, Presensi, Progress, Komunikasi, OrangTua, Laporan, Files, Pengaturan. **Halaman-halaman ini akan tampil dengan data dummy seperti biasa** — itu memang scope yang disepakati, bukan bug.

### Yang perlu diwaspadai pas nyambungin halaman berikutnya
1. **`user` object sekarang gak punya field mock** kayak `classId`/`subjectIds`/`homeroomClassId`/`childIds` (backend `AuthController::formatUser` gak balikin itu). Halaman yang masih baca `user.classId` dkk bakal dapet `undefined` — perlu diganti ambil dari API asli (mis. `GET /me`... tapi itu juga gak punya classId; classId siswa ada di `studentProfile` yang perlu endpoint terpisah atau ditambahkan ke response `/me` kalau memang dibutuhkan banyak halaman).
2. **ID mismatch**: mock pakai id string custom (`'a1'`, `'q3'`), backend pakai integer auto-increment. Setiap halaman yang disambungkan, cek semua tempat yang compare/lookup by ID.
3. **Field yang gak ada padanan di backend** (ACTIVITIES, ANNOUNCEMENTS, Chat guru-siswa, dll — karena modul Komunikasi di-skip) — halaman yang butuh ini harus disesuaikan tampilannya, bukan dipaksa manggil endpoint yang gak ada.
4. **Selalu jalankan `npx tsc --noEmit`** di `Ui-LMS/` sebelum test browser — sudah kepakai sesi ini, langsung nangkep kalau ada type mismatch tanpa perlu buka browser dulu.
5. **CORS backend sudah `allowed_origins: ['*']`** (lihat `Api-LMS/config/cors.php`) — gak perlu proxy Vite, fetch langsung `localhost:5173` → `localhost:8010` jalan.

## Kalau Lanjut Sesi Baru

1. Baca file ini dulu.
2. Baca PRD di link artifact di atas kalau perlu detail modul (section `#roadmap` punya daftar modul per fase resmi).
3. **Fase 1 & Fase 2 backend sudah selesai semua** (16/19 modul PRD). **Fase 3**: 3 dari 5 area selesai (QR Attendance, Storage Monitoring, 2FA & Audit Log) + fitur tambahan kunci fullscreen ujian; proctoring webcam & AI essay scoring di-skip atas keputusan user.
4. **Penyambungan Ui-LMS↔Api-LMS SEDANG BERJALAN** (lihat 🔌 di atas) — baru Login+Dashboard, 18 halaman lain masih mock. Ini kemungkinan besar kerjaan lanjutan sesi berikutnya — tanya user mau lanjut ke halaman mana.
5. **Sudah `git init` + push** ke [github.com/FazriAhmad/LMS](https://github.com/FazriAhmad/LMS) branch `main`. Commit tiap modul/fase/halaman selesai — bukan nunggu numpuk banyak dulu baru commit sekali.
6. Kalau user minta fitur yang butuh infra baru (WebSocket/queue/dsb) atau di luar PRD, **tanya dulu** — beberapa keputusan besar sesi-sesi sebelumnya (skip Komunikasi/Reverb, skip Queue buat Laporan, strategi migrasi UI satu-per-satu) datang dari user langsung, bukan diputuskan sepihak.
