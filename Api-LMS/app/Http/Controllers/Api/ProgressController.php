<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\Course;
use App\Models\CourseModule;
use App\Models\ExamParticipant;
use App\Models\Material;
use App\Models\MaterialProgress;
use App\Models\QuizAttempt;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProgressController extends Controller
{
    /** % materi selesai per siswa di satu course — guru/admin lihat semua, siswa lihat dirinya sendiri. */
    public function courseProgress(Request $request, Course $course): JsonResponse
    {
        $this->authorizeView($request, $course);
        $user = $request->user();

        $materialIds = Material::whereIn('course_module_id', CourseModule::where('course_id', $course->id)->pluck('id'))->pluck('id');
        $total = $materialIds->count();

        $studentsQuery = User::role('siswa')->whereHas('studentProfile', fn ($q) => $q->where('school_class_id', $course->teachingAssignment->school_class_id));
        if ($user->hasRole('siswa')) {
            $studentsQuery->where('id', $user->id);
        }
        $students = $studentsQuery->get(['id', 'name']);

        $done = MaterialProgress::whereIn('student_id', $students->pluck('id'))
            ->whereIn('material_id', $materialIds)
            ->get()->groupBy('student_id')->map->count();

        $rows = $students->map(fn (User $s) => [
            'student_id' => $s->id,
            'student_name' => $s->name,
            'done' => $done->get($s->id, 0),
            'total' => $total,
            'percent' => $total > 0 ? (int) round($done->get($s->id, 0) / $total * 100) : 0,
        ]);

        return response()->json(['data' => $user->hasRole('siswa') ? $rows->first() : $rows->values()]);
    }

    /**
     * Linimasa aktivitas siswa — digabung on-the-fly dari tabel yang sudah ada
     * (materi diselesaikan, tugas dikumpulkan, quiz & ujian dikerjakan), bukan tabel log terpisah.
     */
    public function studentActivity(Request $request, User $student): JsonResponse
    {
        $this->authorizeStudentAccess($request, $student);

        $events = collect();

        MaterialProgress::where('student_id', $student->id)->with('material:id,title')->get()
            ->each(fn (MaterialProgress $p) => $events->push([
                'type' => 'materi_selesai',
                'description' => "Menyelesaikan materi \"{$p->material?->title}\"",
                'at' => $p->completed_at,
            ]));

        AssignmentSubmission::where('student_id', $student->id)->with('assignment:id,title')->get()
            ->each(fn (AssignmentSubmission $s) => $events->push([
                'type' => 'tugas_dikumpulkan',
                'description' => "Mengumpulkan tugas \"{$s->assignment?->title}\"",
                'at' => $s->submitted_at,
            ]));

        QuizAttempt::where('student_id', $student->id)->with('quiz:id,title')->get()
            ->each(fn (QuizAttempt $a) => $events->push([
                'type' => 'quiz_dikerjakan',
                'description' => "Mengerjakan quiz \"{$a->quiz?->title}\"",
                'at' => $a->submitted_at,
            ]));

        ExamParticipant::where('student_id', $student->id)->where('status', 'selesai')->with('exam:id,title')->get()
            ->each(fn (ExamParticipant $p) => $events->push([
                'type' => 'ujian_disubmit',
                'description' => "Menyelesaikan ujian \"{$p->exam?->title}\"",
                'at' => $p->submitted_at,
            ]));

        $sorted = $events->sortByDesc('at')->values()->map(fn ($e) => [
            ...$e,
            'at' => $e['at']?->toIso8601String(),
        ]);

        return response()->json(['data' => $sorted]);
    }

    /** Siswa tanpa aktivitas (materi/tugas/quiz/ujian) dalam N hari terakhir — sinyal awal buat guru/wali kelas. */
    public function inactiveStudents(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(['guru', 'walikelas', 'admin', 'superadmin', 'kepsek'])) {
            abort(403, 'Tidak punya akses.');
        }

        $days = $request->integer('days', 7);
        $cutoff = now()->subDays($days);

        $classId = $request->integer('school_class_id') ?: null;
        $studentsQuery = User::role('siswa');
        if ($classId) {
            $studentsQuery->whereHas('studentProfile', fn ($q) => $q->where('school_class_id', $classId));
        } elseif ($user->hasRole('walikelas') && ! $user->hasAnyRole(['admin', 'superadmin'])) {
            $homeroomId = $user->homeroomClass?->id;
            $studentsQuery->whereHas('studentProfile', fn ($q) => $q->where('school_class_id', $homeroomId));
        }
        $students = $studentsQuery->get(['id', 'name']);

        $lastActivity = collect([
            MaterialProgress::whereIn('student_id', $students->pluck('id'))->selectRaw('student_id, max(completed_at) as at')->groupBy('student_id')->get(),
            AssignmentSubmission::whereIn('student_id', $students->pluck('id'))->selectRaw('student_id, max(submitted_at) as at')->groupBy('student_id')->get(),
            QuizAttempt::whereIn('student_id', $students->pluck('id'))->selectRaw('student_id, max(submitted_at) as at')->groupBy('student_id')->get(),
            ExamParticipant::whereIn('student_id', $students->pluck('id'))->where('status', 'selesai')->selectRaw('student_id, max(submitted_at) as at')->groupBy('student_id')->get(),
        ])->flatten(1)->groupBy('student_id')->map(fn ($rows) => $rows->map(fn ($r) => \Illuminate\Support\Carbon::parse($r->at))->max());

        $inactive = $students->map(fn (User $s) => [
            'student_id' => $s->id,
            'student_name' => $s->name,
            'last_activity_at' => $lastActivity->get($s->id),
        ])->filter(fn ($s) => ! $s['last_activity_at'] || $s['last_activity_at'] < $cutoff)
            ->map(fn ($s) => [...$s, 'last_activity_at' => $s['last_activity_at']?->toIso8601String()])
            ->values();

        return response()->json(['data' => $inactive]);
    }

    private function authorizeStudentAccess(Request $request, User $student): void
    {
        $user = $request->user();
        if ($user->id === $student->id) {
            return;
        }
        if ($user->hasAnyRole(['superadmin', 'admin', 'guru', 'walikelas', 'kepsek'])) {
            return;
        }
        if ($user->hasRole('ortu') && $user->children()->where('users.id', $student->id)->exists()) {
            return;
        }
        abort(403, 'Anda tidak punya akses ke aktivitas siswa ini.');
    }

    private function authorizeView(Request $request, Course $course): void
    {
        $user = $request->user();
        if ($user->hasAnyRole(['superadmin', 'admin', 'kepsek'])) {
            return;
        }
        if ($user->id === $course->teachingAssignment->teacher_id) {
            return;
        }
        if ($user->hasRole('siswa') && $user->studentProfile?->school_class_id === $course->teachingAssignment->school_class_id) {
            return;
        }
        abort(403, 'Anda tidak punya akses ke course ini.');
    }
}
