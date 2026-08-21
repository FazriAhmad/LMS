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
├── Ui-LMS/             (frontend React+TS+Vite, REFERENSI dari user — mock data, belum nyambung API asli)
└── Api-LMS/            (backend Laravel, SEDANG DIBANGUN oleh Claude sesi ini)
```

### Ui-LMS (referensi, jangan diubah struktur besarnya)
- Nama app: "EduNusa LMS — SMA Negeri 1 Nusantara"
- React 19 + TypeScript + Vite + Tailwind v4 + Framer Motion + react-router-dom
- `src/lib/types.ts` — model data lengkap (Role, User, Kelas, Mapel, Student, Course, Module, Material, Assignment, Quiz, Exam, GradeRow, dll) — **ini acuan utama buat desain schema backend**, hampir semua tabel backend saya turunkan dari sini
- `src/lib/data.ts` + `src/lib/store.tsx` — data dummy in-memory, PERLU DIGANTI jadi API call asli begitu backend modul terkait selesai
- `src/pages/Integrasi.tsx` — halaman ini perlu **dihapus/diganti** nanti karena modul Integrasi sudah dicoret dari PRD
- Login demo: 7 tombol quick-login per role, password dummy "demo123" (cuma di frontend, belum nyambung ke backend asli)
- Launch config: `.claude/launch.json` di root portofolio sudah ada entry `"lms-ui"` (port 5173)

### Api-LMS (backend, progress sesi ini)
- Laravel 12 + PostgreSQL, database `LMS` (dibuat user, Postgres lokal Windows — bukan Docker)
- `.env`: `DB_CONNECTION=pgsql`, `DB_DATABASE=LMS`, `DB_USERNAME=postgres`, `DB_PASSWORD=ada512`, host `127.0.0.1:5432`
- Package: `laravel/sanctum` (auth token), `spatie/laravel-permission` (role, guard `web`)
- Launch config belum ditambahkan ke `.claude/launch.json` — kalau mau preview, jalanin manual: `php artisan serve --host=127.0.0.1 --port=8010` dari folder `Api-LMS` (pakai port 8010, BUKAN 8000, karena project lain di portofolio ini sering nyangkut/rebutan port 8000 — lihat catatan "Hati-hati Port" di bawah)

## ✅ Progress Backend (8 dari 19 modul PRD — FASE 1 SELESAI, semua teruji end-to-end)

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

**Belum di-`git init`** — pertimbangkan commit pertama sebelum lanjut ke Fase 2, supaya progress ini tidak cuma ada di working directory.

Fase 2 ke atas (modul 07-09 Quiz/Ujian Online/Bank Soal, dan modul-modul lain di luar 8 ini) belum dikerjakan — cek PRD (link di atas) buat urutan lengkapnya kalau mau lanjut.

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

## Kalau Lanjut Sesi Baru

1. Baca file ini dulu.
2. Baca PRD di link artifact di atas kalau perlu detail modul.
3. **Fase 1 sudah selesai semua** (lihat bagian 🏁 di atas). Pertimbangkan `git init` + commit pertama dulu. Lanjut ke Fase 2 kalau user minta (modul 07-09: Quiz, Ujian Online, Bank Soal — cek PRD buat urutan/detail modul Fase 2 lainnya).
4. Modul 07-09 (Quiz, Ujian Online, Bank Soal) dan modul lain sengaja Fase 2 ke atas, dikerjakan belakangan.
5. Cek `git status` di `Api-LMS/` kalau ada — **sesi ini BELUM sempat `git init`/commit apapun**, semua kerjaan masih di working directory doang.
