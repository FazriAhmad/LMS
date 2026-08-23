<?php

namespace Database\Seeders;

use App\Models\AcademicYear;
use App\Models\AlurTujuanPembelajaran;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\Attendance;
use App\Models\CalendarEvent;
use App\Models\CapaianPembelajaran;
use App\Models\Course;
use App\Models\CourseModule;
use App\Models\Exam;
use App\Models\ExamParticipant;
use App\Models\ForumReply;
use App\Models\ForumThread;
use App\Models\Grade;
use App\Models\Major;
use App\Models\Material;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\QuizAttemptAnswer;
use App\Models\ScheduleItem;
use App\Models\SchoolClass;
use App\Models\StudentProfile;
use App\Models\Subject;
use App\Models\TeacherNote;
use App\Models\TeachingAssignment;
use App\Models\TujuanPembelajaran;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Data dummy buat mockup/demo — bukan data produksi. Aman dijalankan berkali-kali
 * (pakai firstOrCreate/updateOrCreate di titik-titik penting) tapi tetap bikin baris
 * baru buat data transaksional (nilai/presensi/dst) tiap dijalankan ulang.
 * Jalankan: php artisan db:seed --class=DemoDataSeeder
 */
class DemoDataSeeder extends Seeder
{
    private array $studentNames = [
        'Ahmad Fauzi', 'Bintang Ramadhan', 'Cinta Amelia', 'Dimas Prasetyo', 'Elok Faradiba',
        'Farhan Maulana', 'Gita Puspita', 'Hafiz Rahman', 'Indah Permatasari', 'Joko Susilo',
        'Kirana Salsabila', 'Lukman Hakim', 'Mutiara Andini', 'Nabil Alfarizi', 'Oktavia Rahmawati',
        'Putra Wijaya', 'Qonita Zahra', 'Rizky Ananda', 'Salma Az-Zahra', 'Taufik Hidayat',
        'Umar Syahrial', 'Vina Marlina', 'Wahyu Setiawan', 'Yusuf Alamsyah',
    ];

    private array $teacherNames = [
        ['Budi Santoso', 'Bahasa Indonesia'],
        ['Rina Wulandari', 'Bahasa Inggris'],
        ['Agus Prabowo', 'Fisika'],
        ['Sri Handayani', 'Sejarah'],
        ['Doni Kusuma', 'PJOK'],
    ];

    public function run(): void
    {
        $year = AcademicYear::where('is_active', true)->first() ?? AcademicYear::first();
        $majorIpa = Major::firstOrCreate(['name' => 'IPA']);
        $majorIps = Major::firstOrCreate(['name' => 'IPS']);

        // --- Mapel ---
        $mtk = Subject::firstOrCreate(['code' => 'MTK'], ['name' => 'Matematika', 'color' => '#6366f1']);
        $subjects = collect([$mtk]);
        $subjectDefs = [
            ['Bahasa Indonesia', 'BIN', '#f59e0b'],
            ['Bahasa Inggris', 'BIG', '#10b981'],
            ['Fisika', 'FIS', '#ef4444'],
            ['Sejarah', 'SEJ', '#8b5cf6'],
            ['PJOK', 'PJK', '#0ea5e9'],
        ];
        foreach ($subjectDefs as [$name, $code, $color]) {
            $subjects->push(Subject::firstOrCreate(['code' => $code], ['name' => $name, 'color' => $color]));
        }

        // --- Kelas ---
        $classXiIpa1 = SchoolClass::firstOrCreate(['name' => 'XI-IPA-1'], ['major_id' => $majorIpa->id, 'academic_year_id' => $year->id, 'capacity' => 36]);
        $classXIpa1 = SchoolClass::firstOrCreate(['name' => 'X-IPA-1'], ['major_id' => $majorIpa->id, 'academic_year_id' => $year->id, 'capacity' => 36]);
        $classXIps1 = SchoolClass::firstOrCreate(['name' => 'X-IPS-1'], ['major_id' => $majorIps->id, 'academic_year_id' => $year->id, 'capacity' => 36]);
        $classXiIps1 = SchoolClass::firstOrCreate(['name' => 'XI-IPS-1'], ['major_id' => $majorIps->id, 'academic_year_id' => $year->id, 'capacity' => 36]);
        $classes = collect([$classXiIpa1, $classXIpa1, $classXIps1, $classXiIps1]);

        // --- Guru ---
        $dewi = User::where('username', 'dewi_lestari')->first();
        $teachers = collect([$dewi]);
        $subjectTeacher = [$mtk->id => $dewi];
        foreach ($this->teacherNames as $i => [$name, $subjectName]) {
            $username = 'guru_' . str($name)->slug('_');
            $teacher = User::firstOrCreate(['username' => $username], [
                'name' => $name, 'email' => strtolower(str($name)->slug('.')) . '@edunusa.sch.id',
                'password' => 'guru12345', 'title' => "Guru {$subjectName}", 'status' => 'approved', 'color' => '#4f46e5',
            ]);
            if (! $teacher->hasRole('guru')) {
                $teacher->assignRole('guru');
            }
            $subject = $subjects->firstWhere('name', $subjectName);
            $subjectTeacher[$subject->id] = $teacher;
            $teachers->push($teacher);
        }
        // Wali kelas: kelas baru dipegang guru baru (kecuali XI-IPA-1 sudah Dewi)
        $homerooms = [$classXIpa1->id => $teachers[1], $classXIps1->id => $teachers[2], $classXiIps1->id => $teachers[3]];
        foreach ($homerooms as $classId => $teacher) {
            $class = $classes->firstWhere('id', $classId);
            if (! $class->homeroom_teacher_id) {
                $class->update(['homeroom_teacher_id' => $teacher->id]);
                $teacher->assignRole('walikelas');
            }
        }

        // --- Siswa ---
        $studentPool = $this->studentNames;
        $studentsByClass = [];
        $nisCounter = 2024100;
        foreach ($classes as $class) {
            $count = $class->id === $classXiIpa1->id ? 5 : 6; // Citra Ayu sudah ada di XI-IPA-1
            $studentsByClass[$class->id] = collect();
            if ($class->id === $classXiIpa1->id) {
                $existing = User::where('username', 'citra_ayu')->first();
                if ($existing) {
                    $studentsByClass[$class->id]->push($existing);
                }
            }
            for ($i = 0; $i < $count; $i++) {
                $name = array_shift($studentPool);
                if (! $name) {
                    break;
                }
                $username = 'siswa_' . str($name)->slug('_');
                $nis = (string) $nisCounter++;
                $student = User::firstOrCreate(['username' => $username], [
                    'name' => $name, 'password' => 'siswa12345', 'status' => 'approved', 'color' => '#4f46e5',
                ]);
                if (! $student->hasRole('siswa')) {
                    $student->assignRole('siswa');
                }
                StudentProfile::firstOrCreate(['user_id' => $student->id], [
                    'nis' => $nis, 'gender' => $i % 2 === 0 ? 'L' : 'P', 'school_class_id' => $class->id,
                ]);
                $studentsByClass[$class->id]->push($student);
            }
        }

        // --- Orang tua ---
        $parentDefs = [
            ['Hendra Wijaya', 0], ['Yuli Astuti', 1], ['Bambang Sutrisno', 2], ['Dewi Anggraini', 3],
        ];
        foreach ($parentDefs as [$name, $classIdx]) {
            $class = $classes[$classIdx];
            $child = $studentsByClass[$class->id]->first();
            if (! $child) {
                continue;
            }
            $parent = User::firstOrCreate(['username' => 'ortu_' . str($name)->slug('_')], [
                'name' => $name, 'password' => 'ortu12345', 'status' => 'approved', 'color' => '#4f46e5',
            ]);
            if (! $parent->hasRole('ortu')) {
                $parent->assignRole('ortu');
            }
            $parent->children()->syncWithoutDetaching([$child->id]);
        }

        // --- Teaching assignments + courses ---
        $courses = collect();
        foreach ($classes as $class) {
            foreach ($subjects as $subject) {
                $teacher = $subjectTeacher[$subject->id];
                $ta = TeachingAssignment::firstOrCreate([
                    'subject_id' => $subject->id, 'school_class_id' => $class->id, 'academic_year_id' => $year->id,
                ], ['teacher_id' => $teacher->id]);
                $course = Course::firstOrCreate(['teaching_assignment_id' => $ta->id], [
                    'description' => "Mata pelajaran {$subject->name} untuk kelas {$class->name}.",
                ]);
                $courses->push(['course' => $course, 'class' => $class, 'subject' => $subject, 'teacher' => $teacher, 'ta' => $ta]);
            }
        }

        // --- Modul & materi (buat mapel Matematika & Bahasa Indonesia tiap kelas) ---
        $richSubjects = [$mtk->id, $subjects->firstWhere('name', 'Bahasa Indonesia')->id];
        $moduleTitles = ['Pengantar & Konsep Dasar', 'Latihan & Penerapan'];
        foreach ($courses as $row) {
            if (! in_array($row['subject']->id, $richSubjects, true)) {
                continue;
            }
            foreach ($moduleTitles as $mi => $title) {
                $module = CourseModule::firstOrCreate([
                    'course_id' => $row['course']->id, 'title' => $title,
                ], ['pertemuan' => 'Pertemuan ' . ($mi + 1), 'order' => $mi + 1]);
                Material::firstOrCreate([
                    'course_module_id' => $module->id, 'title' => "Video Pembelajaran: {$title}",
                ], ['type' => 'youtube', 'youtube_id' => 'dQw4w9WgXcQ', 'order' => 1, 'uploaded_by' => $row['teacher']->id]);
                Material::firstOrCreate([
                    'course_module_id' => $module->id, 'title' => "Rangkuman Materi {$title}.pdf",
                ], ['type' => 'link', 'url' => 'https://example.com/materi.pdf', 'order' => 2, 'uploaded_by' => $row['teacher']->id]);
            }
        }

        // --- Bank soal ---
        $questions = collect();
        foreach ($subjects as $subject) {
            $teacher = $subjectTeacher[$subject->id];
            for ($i = 1; $i <= 4; $i++) {
                $type = ['pg', 'pg', 'tf', 'isian'][($i - 1) % 4];
                $data = match ($type) {
                    'pg' => ['options' => ['A. Opsi Satu', 'B. Opsi Dua', 'C. Opsi Tiga', 'D. Opsi Empat'], 'answer' => 'B. Opsi Dua'],
                    'tf' => ['options' => ['Benar', 'Salah'], 'answer' => 'Benar'],
                    default => ['options' => null, 'answer' => 'jawaban singkat', 'keywords' => ['jawaban', 'singkat']],
                };
                $q = Question::firstOrCreate([
                    'subject_id' => $subject->id, 'text' => "Soal {$subject->name} nomor {$i} — {$type}",
                ], array_merge($data, [
                    'type' => $type, 'points' => 25, 'difficulty' => ['Mudah', 'Sedang', 'Sulit'][$i % 3],
                    'kompetensi' => "Kompetensi Dasar {$i}", 'created_by' => $teacher->id,
                ]));
                $questions->push($q);
            }
        }

        // --- Tugas, quiz, ujian, nilai, presensi, forum, catatan — per course kaya ---
        $richCourses = $courses->filter(fn ($r) => in_array($r['subject']->id, $richSubjects, true));
        foreach ($richCourses as $row) {
            $course = $row['course'];
            $students = $studentsByClass[$row['class']->id];
            $subjQuestions = $questions->where('subject_id', $row['subject']->id)->values();

            // Tugas
            foreach (range(1, 2) as $ai) {
                $assignment = Assignment::firstOrCreate([
                    'course_id' => $course->id, 'title' => "Tugas {$ai}: Latihan {$row['subject']->name}",
                ], [
                    'description' => 'Kerjakan soal latihan berikut dan kumpulkan sebelum tenggat waktu.',
                    'deadline' => now()->addDays(7 * $ai),
                    'rubric' => [['criterion' => 'Ketepatan jawaban', 'weight' => 60], ['criterion' => 'Kerapian', 'weight' => 40]],
                    'created_by' => $row['teacher']->id,
                ]);
                foreach ($students as $si => $student) {
                    $status = ['dinilai', 'sudah', 'belum'][$si % 3];
                    if ($status === 'belum') {
                        continue;
                    }
                    AssignmentSubmission::firstOrCreate([
                        'assignment_id' => $assignment->id, 'student_id' => $student->id,
                    ], [
                        'submitted_at' => now()->subDays(2),
                        'status' => $status,
                        'score' => $status === 'dinilai' ? rand(70, 98) : null,
                        'feedback' => $status === 'dinilai' ? 'Kerja bagus, pertahankan!' : null,
                    ]);
                }
            }

            // Nilai
            foreach ($students as $student) {
                Grade::updateOrCreate(['course_id' => $course->id, 'student_id' => $student->id], [
                    'tugas' => rand(70, 95), 'quiz' => rand(65, 95), 'pts' => rand(60, 90), 'pas' => rand(65, 95),
                    'feedback' => 'Terus tingkatkan partisipasi di kelas.',
                ]);
            }

            // Quiz
            if ($subjQuestions->count() >= 3) {
                $quiz = Quiz::firstOrCreate(['course_id' => $course->id, 'title' => "Quiz {$row['subject']->name}"], [
                    'duration_min' => 20, 'max_attempts' => 2, 'randomize' => true, 'created_by' => $row['teacher']->id,
                ]);
                $quiz->questions()->sync($subjQuestions->take(3)->pluck('id')->mapWithKeys(fn ($id, $i) => [$id => ['order' => $i]]));
                foreach ($students->take(3) as $student) {
                    $attempt = QuizAttempt::firstOrCreate(['quiz_id' => $quiz->id, 'student_id' => $student->id], [
                        'auto_score' => 50, 'max_auto' => 75, 'total_points' => 75, 'essay_pending_count' => 0, 'submitted_at' => now()->subDays(3),
                    ]);
                    foreach ($subjQuestions->take(3) as $q) {
                        QuizAttemptAnswer::firstOrCreate(['quiz_attempt_id' => $attempt->id, 'question_id' => $q->id], [
                            'answer' => $q->answer, 'is_correct' => true,
                        ]);
                    }
                }
            }

            // Ujian
            $pgTfQuestions = $subjQuestions->whereIn('type', ['pg', 'tf'])->values();
            if ($pgTfQuestions->count() >= 2) {
                $exam = Exam::firstOrCreate(['course_id' => $course->id, 'title' => "PTS {$row['subject']->name}"], [
                    'type' => 'PTS', 'scheduled_at' => now()->addDays(14), 'duration_min' => 60, 'status' => 'terjadwal', 'created_by' => $row['teacher']->id,
                ]);
                $exam->questions()->sync($pgTfQuestions->take(2)->pluck('id')->mapWithKeys(fn ($id, $i) => [$id => ['order' => $i]]));
                foreach ($students->take(2) as $student) {
                    ExamParticipant::firstOrCreate(['exam_id' => $exam->id, 'student_id' => $student->id], [
                        'status' => 'selesai', 'answers' => [], 'tab_switches' => 0, 'score' => rand(70, 95),
                        'last_saved_at' => now()->subDays(1), 'submitted_at' => now()->subDays(1),
                    ]);
                }
            }

            // Forum
            $thread = ForumThread::firstOrCreate([
                'course_id' => $course->id, 'title' => "Diskusi {$row['subject']->name}: Ada yang belum paham?",
            ], ['body' => 'Silakan tanya di sini kalau ada materi yang belum dipahami.', 'author_id' => $row['teacher']->id]);
            if ($students->first() && $thread->replies()->count() === 0) {
                ForumReply::create(['thread_id' => $thread->id, 'author_id' => $students->first()->id, 'body' => 'Saya masih bingung di bagian latihan soal, Pak/Bu.']);
                ForumReply::create(['thread_id' => $thread->id, 'author_id' => $row['teacher']->id, 'body' => 'Coba baca ulang rangkuman materi ya, nanti kita bahas di kelas.']);
            }

            // Catatan guru
            if ($students->first()) {
                TeacherNote::firstOrCreate([
                    'student_id' => $students->first()->id, 'teacher_id' => $row['teacher']->id,
                ], ['note' => 'Menunjukkan progres yang baik minggu ini, aktif bertanya di kelas.']);
            }
        }

        // --- Presensi 5 hari terakhir, semua kelas ---
        $statuses = ['H', 'H', 'H', 'H', 'I', 'S', 'A', 'T'];
        foreach ($classes as $class) {
            $recorder = $class->homeroom_teacher_id ?? $dewi->id;
            foreach ($studentsByClass[$class->id] as $si => $student) {
                for ($d = 1; $d <= 5; $d++) {
                    $date = now()->subDays($d)->toDateString();
                    Attendance::firstOrCreate(['student_id' => $student->id, 'date' => $date], [
                        'school_class_id' => $class->id, 'status' => $statuses[($si + $d) % count($statuses)], 'recorded_by' => $recorder,
                    ]);
                }
            }
        }

        // --- Jadwal (2 mapel per hari per kelas, Senin-Jumat) ---
        $times = [['07:00', '08:30'], ['08:30', '10:00'], ['10:15', '11:45']];
        foreach ($classes as $ci => $class) {
            $classCourses = $courses->where('class.id', $class->id)->values();
            for ($day = 0; $day < 5; $day++) {
                $subjIdx = ($day + $ci) % $classCourses->count();
                $ta = $classCourses[$subjIdx]['ta'];
                $time = $times[$day % 3];
                ScheduleItem::firstOrCreate([
                    'teaching_assignment_id' => $ta->id, 'day' => $day,
                ], ['start_time' => $time[0], 'end_time' => $time[1], 'room' => 'Ruang ' . (101 + $ci)]);
            }
        }

        // --- Kalender akademik ---
        $superadmin = User::where('username', 'superadmin')->first();
        $events = [
            ['Libur Hari Kemerdekaan', now()->startOfYear()->addMonths(7)->addDays(16), 'libur'],
            ['Rapat Dinas Guru Bulanan', now()->addDays(5), 'rapat'],
            ['Class Meeting & Pentas Seni', now()->addDays(20), 'kegiatan'],
            ['Awal Semester Genap', now()->addDays(40), 'semester'],
            ['Libur Hari Raya', now()->addDays(60), 'libur'],
            ['Rapat Wali Murid', now()->addDays(10), 'rapat'],
            ['Lomba Cerdas Cermat Antar Kelas', now()->addDays(25), 'kegiatan'],
            ['Pembagian Rapor Semester', now()->addDays(90), 'semester'],
        ];
        foreach ($events as [$title, $date, $type]) {
            CalendarEvent::firstOrCreate(['title' => $title], ['date' => $date, 'type' => $type, 'created_by' => $superadmin->id]);
        }

        // --- Kurikulum CP/TP/ATP ---
        $bindo = $subjects->firstWhere('name', 'Bahasa Indonesia');
        foreach ([$mtk, $bindo] as $subject) {
            $cp = CapaianPembelajaran::firstOrCreate([
                'subject_id' => $subject->id, 'elemen' => 'Elemen Pemahaman & Penerapan',
            ], ['text' => "Peserta didik mampu memahami dan menerapkan konsep dasar {$subject->name} dalam kehidupan sehari-hari.", 'order' => 1]);
            $tp = TujuanPembelajaran::firstOrCreate([
                'capaian_pembelajaran_id' => $cp->id, 'code' => 'TP 1.1',
            ], ['text' => "Menjelaskan konsep dasar {$subject->name} dengan tepat.", 'order' => 1]);
            AlurTujuanPembelajaran::firstOrCreate([
                'tujuan_pembelajaran_id' => $tp->id, 'code' => 'ATP 1.1.1',
            ], ['text' => "Mengidentifikasi dan menerapkan konsep {$subject->name} dalam latihan soal.", 'order' => 1]);
        }

        $this->command?->info('Demo data selesai di-seed: ' . $classes->count() . ' kelas, ' . $teachers->count() . ' guru, ' . collect($studentsByClass)->flatten()->count() . ' siswa, ' . $courses->count() . ' course.');
    }
}
