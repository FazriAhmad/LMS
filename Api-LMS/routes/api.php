<?php

use App\Http\Controllers\Api\AcademicYearController;
use App\Http\Controllers\Api\AssignmentController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\CourseModuleController;
use App\Http\Controllers\Api\CurriculumController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExamController;
use App\Http\Controllers\Api\ForumController;
use App\Http\Controllers\Api\GradeController;
use App\Http\Controllers\Api\GradeWeightController;
use App\Http\Controllers\Api\MajorController;
use App\Http\Controllers\Api\ParentPortalController;
use App\Http\Controllers\Api\MaterialController;
use App\Http\Controllers\Api\ProgressController;
use App\Http\Controllers\Api\QrAttendanceController;
use App\Http\Controllers\Api\QuestionController;
use App\Http\Controllers\Api\QuizController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ScheduleItemController;
use App\Http\Controllers\Api\SchoolClassController;
use App\Http\Controllers\Api\SchoolSettingController;
use App\Http\Controllers\Api\StorageController;
use App\Http\Controllers\Api\SubjectController;
use App\Http\Controllers\Api\TeacherNoteController;
use App\Http\Controllers\Api\TeachingAssignmentController;
use App\Http\Controllers\Api\TwoFactorController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/login/verify-2fa', [AuthController::class, 'verifyTwoFactor']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/school-setting', [SchoolSettingController::class, 'show']);
    Route::post('/school-setting', [SchoolSettingController::class, 'update']);
    Route::get('/storage/usage', [StorageController::class, 'usage']);
    Route::put('/storage/quota', [StorageController::class, 'updateQuota']);

    // 2FA (modul 18, wajib untuk Super Admin/Admin — lihat AuthController::login untuk soft-enforce).
    Route::post('/2fa/setup', [TwoFactorController::class, 'setup']);
    Route::post('/2fa/confirm', [TwoFactorController::class, 'confirm']);
    Route::post('/2fa/disable', [TwoFactorController::class, 'disable']);

    // Audit log (modul 18) — otomatis terisi lewat model event, lihat AppServiceProvider.
    Route::get('/audit-logs', [AuditLogController::class, 'index']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);

    // Manajemen Akademik (modul 02) — semua peran login boleh baca (perlu tahu nama kelas/mapel).
    Route::get('/academic-years', [AcademicYearController::class, 'index']);
    Route::get('/majors', [MajorController::class, 'index']);
    Route::get('/subjects', [SubjectController::class, 'index']);
    Route::get('/school-classes', [SchoolClassController::class, 'index']);
    Route::get('/school-classes/{schoolClass}', [SchoolClassController::class, 'show']);
    Route::get('/teaching-assignments', [TeachingAssignmentController::class, 'index']);
    Route::get('/schedule-items', [ScheduleItemController::class, 'index']);

    // Kurikulum CP/TP/ATP — baca bebas buat semua peran login, tulis dibatasi guru pengampu/Admin di controller.
    Route::get('/curriculum', [CurriculumController::class, 'index']);
    Route::post('/curriculum', [CurriculumController::class, 'store']);
    Route::put('/curriculum/{capaian}', [CurriculumController::class, 'update']);
    Route::delete('/curriculum/{capaian}', [CurriculumController::class, 'destroy']);
    Route::post('/curriculum/{capaian}/tp', [CurriculumController::class, 'storeTp']);
    Route::put('/tp/{tp}', [CurriculumController::class, 'updateTp']);
    Route::delete('/tp/{tp}', [CurriculumController::class, 'destroyTp']);
    Route::post('/tp/{tp}/atp', [CurriculumController::class, 'storeAtp']);
    Route::put('/atp/{atp}', [CurriculumController::class, 'updateAtp']);
    Route::delete('/atp/{atp}', [CurriculumController::class, 'destroyAtp']);

    // Course & Materi (modul 04-05) — otorisasi kepemilikan/keanggotaan kelas
    // ditegakkan di dalam masing-masing controller, bukan di sini.
    Route::get('/courses', [CourseController::class, 'index']);
    Route::post('/courses', [CourseController::class, 'store']);
    Route::get('/courses/{course}', [CourseController::class, 'show']);
    Route::put('/courses/{course}', [CourseController::class, 'update']);
    Route::delete('/courses/{course}', [CourseController::class, 'destroy']);

    Route::post('/courses/{course}/modules', [CourseModuleController::class, 'store']);
    Route::put('/course-modules/{courseModule}', [CourseModuleController::class, 'update']);
    Route::delete('/course-modules/{courseModule}', [CourseModuleController::class, 'destroy']);

    Route::post('/course-modules/{courseModule}/materials', [MaterialController::class, 'store']);
    Route::put('/materials/{material}', [MaterialController::class, 'update']);
    Route::delete('/materials/{material}', [MaterialController::class, 'destroy']);
    Route::post('/materials/{material}/complete', [MaterialController::class, 'markComplete']);

    // Tugas (modul 06) — otorisasi kepemilikan/keanggotaan kelas ditegakkan di controller.
    Route::get('/courses/{course}/assignments', [AssignmentController::class, 'index']);
    Route::post('/courses/{course}/assignments', [AssignmentController::class, 'store']);
    Route::get('/assignments/{assignment}', [AssignmentController::class, 'show']);
    Route::put('/assignments/{assignment}', [AssignmentController::class, 'update']);
    Route::delete('/assignments/{assignment}', [AssignmentController::class, 'destroy']);
    Route::post('/assignments/{assignment}/submit', [AssignmentController::class, 'submit']);
    Route::post('/assignment-submissions/{submission}/grade', [AssignmentController::class, 'grade']);

    // Presensi (modul 11) — otorisasi wali kelas/Admin ditegakkan di controller.
    Route::get('/school-classes/{schoolClass}/attendance', [AttendanceController::class, 'index']);
    Route::post('/school-classes/{schoolClass}/attendance', [AttendanceController::class, 'store']);
    Route::get('/attendance/summary', [AttendanceController::class, 'summary']);
    Route::post('/school-classes/{schoolClass}/qr-attendance', [QrAttendanceController::class, 'store']);
    Route::get('/qr-attendance/{qrAttendanceSession}', [QrAttendanceController::class, 'show']);
    Route::post('/qr-attendance/{qrAttendanceSession}/scan', [QrAttendanceController::class, 'scan']);

    // Penilaian (modul 10) — otorisasi guru pengampu/Admin ditegakkan di controller.
    Route::get('/courses/{course}/grades', [GradeController::class, 'index']);
    Route::post('/courses/{course}/grades', [GradeController::class, 'store']);
    Route::get('/grades/me', [GradeController::class, 'me']);
    Route::get('/subjects/{subject}/grade-weight', [GradeWeightController::class, 'show']);
    Route::put('/subjects/{subject}/grade-weight', [GradeWeightController::class, 'update']);

    // Progress & Aktivitas (modul 13) — dihitung on-the-fly dari data modul lain, tanpa tabel log baru.
    Route::get('/courses/{course}/progress', [ProgressController::class, 'courseProgress']);
    Route::get('/students/{student}/activity', [ProgressController::class, 'studentActivity']);
    Route::get('/students/inactive', [ProgressController::class, 'inactiveStudents']);

    // Forum diskusi per course (bagian modul 04, komunikasi cukup lewat forum sesuai keputusan produk).
    Route::get('/courses/{course}/forum-threads', [ForumController::class, 'index']);
    Route::post('/courses/{course}/forum-threads', [ForumController::class, 'store']);
    Route::get('/forum-threads/{forumThread}', [ForumController::class, 'show']);
    Route::delete('/forum-threads/{forumThread}', [ForumController::class, 'destroy']);
    Route::post('/forum-threads/{forumThread}/replies', [ForumController::class, 'storeReply']);
    Route::delete('/forum-replies/{forumReply}', [ForumController::class, 'destroyReply']);

    // Portal Orang Tua (modul 15) — nilai & presensi anak sudah lewat endpoint yang ada (?student_id=).
    Route::get('/parent/children', [ParentPortalController::class, 'children']);
    Route::get('/parent/schedule', [ParentPortalController::class, 'schedule']);
    Route::get('/parent/assignments', [ParentPortalController::class, 'assignments']);

    // Catatan guru ke orang tua (bagian modul 15).
    Route::get('/students/{student}/notes', [TeacherNoteController::class, 'index']);
    Route::post('/students/{student}/notes', [TeacherNoteController::class, 'store']);
    Route::delete('/teacher-notes/{teacherNote}', [TeacherNoteController::class, 'destroy']);

    // Laporan (modul 16) — sync, ?format=csv buat export.
    Route::get('/reports/grades', [ReportController::class, 'grades']);
    Route::get('/reports/attendance', [ReportController::class, 'attendance']);
    Route::get('/reports/class-performance', [ReportController::class, 'classPerformance']);

    // Bank Soal dasar (fondasi modul 07 Quiz) — otorisasi guru pengampu mapel/Admin di controller.
    Route::get('/questions', [QuestionController::class, 'index']);
    Route::post('/questions', [QuestionController::class, 'store']);
    Route::put('/questions/{question}', [QuestionController::class, 'update']);
    Route::delete('/questions/{question}', [QuestionController::class, 'destroy']);

    // Quiz (modul 07) — otorisasi guru pengampu/Admin & keanggotaan kelas ditegakkan di controller.
    Route::get('/courses/{course}/quizzes', [QuizController::class, 'index']);
    Route::post('/courses/{course}/quizzes', [QuizController::class, 'store']);
    Route::get('/quizzes/{quiz}', [QuizController::class, 'show']);
    Route::put('/quizzes/{quiz}', [QuizController::class, 'update']);
    Route::delete('/quizzes/{quiz}', [QuizController::class, 'destroy']);
    Route::post('/quizzes/{quiz}/attempts', [QuizController::class, 'submitAttempt']);
    Route::get('/quizzes/{quiz}/attempts', [QuizController::class, 'attempts']);
    Route::get('/quiz-attempts/{attempt}', [QuizController::class, 'showAttempt']);
    Route::post('/quiz-attempts/{attempt}/grade-essay', [QuizController::class, 'gradeEssay']);

    // Ujian Online (modul 08) — otorisasi guru pengampu/Admin & keanggotaan kelas ditegakkan di controller.
    Route::get('/courses/{course}/exams', [ExamController::class, 'index']);
    Route::post('/courses/{course}/exams', [ExamController::class, 'store']);
    Route::get('/exams/{exam}', [ExamController::class, 'show']);
    Route::put('/exams/{exam}', [ExamController::class, 'update']);
    Route::delete('/exams/{exam}', [ExamController::class, 'destroy']);
    Route::post('/exams/{exam}/open', [ExamController::class, 'open']);
    Route::post('/exams/{exam}/close', [ExamController::class, 'close']);
    Route::post('/exams/{exam}/start', [ExamController::class, 'start']);
    Route::patch('/exams/{exam}/progress', [ExamController::class, 'saveProgress']);
    Route::post('/exams/{exam}/submit', [ExamController::class, 'submit']);
    Route::get('/exams/{exam}/participants', [ExamController::class, 'participants']);
    Route::post('/exams/{exam}/lock', [ExamController::class, 'lock']);
    Route::post('/exam-participants/{examParticipant}/unlock', [ExamController::class, 'unlock']);
    Route::post('/exam-participants/{examParticipant}/force-finish', [ExamController::class, 'forceFinish']);

    // Admin & Super Admin: kelola akun pengguna (User & Role — modul 03) dan data akademik.
    Route::middleware('role:superadmin|admin')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::post('/users/{user}/approve', [UserController::class, 'approve']);
        Route::post('/users/{user}/reject', [UserController::class, 'reject']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);

        Route::post('/academic-years', [AcademicYearController::class, 'store']);
        Route::put('/academic-years/{academicYear}', [AcademicYearController::class, 'update']);
        Route::post('/academic-years/{academicYear}/activate', [AcademicYearController::class, 'activate']);
        Route::delete('/academic-years/{academicYear}', [AcademicYearController::class, 'destroy']);

        Route::post('/majors', [MajorController::class, 'store']);
        Route::put('/majors/{major}', [MajorController::class, 'update']);
        Route::delete('/majors/{major}', [MajorController::class, 'destroy']);

        Route::post('/subjects', [SubjectController::class, 'store']);
        Route::put('/subjects/{subject}', [SubjectController::class, 'update']);
        Route::delete('/subjects/{subject}', [SubjectController::class, 'destroy']);

        Route::post('/school-classes', [SchoolClassController::class, 'store']);
        Route::put('/school-classes/{schoolClass}', [SchoolClassController::class, 'update']);
        Route::delete('/school-classes/{schoolClass}', [SchoolClassController::class, 'destroy']);

        Route::post('/teaching-assignments', [TeachingAssignmentController::class, 'store']);
        Route::delete('/teaching-assignments/{teachingAssignment}', [TeachingAssignmentController::class, 'destroy']);

        Route::post('/schedule-items', [ScheduleItemController::class, 'store']);
        Route::put('/schedule-items/{scheduleItem}', [ScheduleItemController::class, 'update']);
        Route::delete('/schedule-items/{scheduleItem}', [ScheduleItemController::class, 'destroy']);
    });
});
