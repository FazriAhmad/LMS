<?php

use App\Http\Controllers\Api\AcademicYearController;
use App\Http\Controllers\Api\AssignmentController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\CourseModuleController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExamController;
use App\Http\Controllers\Api\GradeController;
use App\Http\Controllers\Api\GradeWeightController;
use App\Http\Controllers\Api\MajorController;
use App\Http\Controllers\Api\MaterialController;
use App\Http\Controllers\Api\ProgressController;
use App\Http\Controllers\Api\QuestionController;
use App\Http\Controllers\Api\QuizController;
use App\Http\Controllers\Api\ScheduleItemController;
use App\Http\Controllers\Api\SchoolClassController;
use App\Http\Controllers\Api\SubjectController;
use App\Http\Controllers\Api\TeachingAssignmentController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/dashboard', [DashboardController::class, 'index']);
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
