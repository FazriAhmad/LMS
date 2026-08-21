<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Grade;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GradeController extends Controller
{
    private const FIELDS = ['tugas', 'quiz', 'pts', 'pas'];

    /** Guru/Admin lihat nilai semua siswa di course ini; siswa cuma lihat nilainya sendiri. */
    public function index(Request $request, Course $course): JsonResponse
    {
        $this->authorizeView($request, $course);
        $user = $request->user();

        if ($user->hasRole('siswa')) {
            $grade = Grade::where('course_id', $course->id)->where('student_id', $user->id)->first();

            return response()->json(['data' => $grade ? $this->format($grade) : null]);
        }

        $students = User::role('siswa')
            ->whereHas('studentProfile', fn ($q) => $q->where('school_class_id', $course->teachingAssignment->school_class_id))
            ->get(['id', 'name']);

        $grades = Grade::where('course_id', $course->id)->get()->keyBy('student_id');

        $rows = $students->map(function (User $s) use ($grades, $course) {
            $grade = $grades->get($s->id) ?? new Grade([
                'student_id' => $s->id, 'course_id' => $course->id,
                'tugas' => 0, 'quiz' => 0, 'pts' => 0, 'pas' => 0,
            ]);

            return $this->format($grade, $s->name);
        })->sortByDesc('final')->values();

        return response()->json(['data' => $rows]);
    }

    /** Guru pengampu simpan nilai (upsert per siswa, bisa banyak sekaligus). */
    public function store(Request $request, Course $course): JsonResponse
    {
        $this->authorizeTeacher($request, $course);

        $data = $request->validate([
            'records' => ['required', 'array', 'min:1'],
            'records.*.student_id' => ['required', 'exists:users,id'],
            'records.*.tugas' => ['required', 'integer', 'min:0', 'max:100'],
            'records.*.quiz' => ['required', 'integer', 'min:0', 'max:100'],
            'records.*.pts' => ['required', 'integer', 'min:0', 'max:100'],
            'records.*.pas' => ['required', 'integer', 'min:0', 'max:100'],
            'records.*.feedback' => ['nullable', 'string'],
        ]);

        foreach ($data['records'] as $record) {
            Grade::updateOrCreate(
                ['course_id' => $course->id, 'student_id' => $record['student_id']],
                collect($record)->only([...self::FIELDS, 'feedback'])->all(),
            );
        }

        return $this->index($request, $course);
    }

    /** Nilai siswa (atau anak, untuk ortu) di semua course — dasar "Nilai Saya". */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $studentId = $user->id;

        if ($user->hasRole('ortu')) {
            $studentId = $request->integer('student_id');
            if (! $studentId || ! $user->children()->where('users.id', $studentId)->exists()) {
                abort(403, 'Hanya bisa lihat nilai anak sendiri.');
            }
        } elseif (! $user->hasRole('siswa')) {
            abort(403, 'Endpoint ini khusus siswa/orang tua.');
        }

        $grades = Grade::where('student_id', $studentId)
            ->with('course.teachingAssignment.subject')
            ->get();

        $rows = $grades->map(fn (Grade $g) => $this->format($g) + [
            'subject_name' => $g->course->teachingAssignment->subject->name,
        ]);

        $avg = $rows->isEmpty() ? 0 : (int) round($rows->avg('final'));

        return response()->json(['data' => ['grades' => $rows->values(), 'average' => $avg]]);
    }

    private function format(Grade $grade, ?string $studentName = null): array
    {
        return [
            'student_id' => $grade->student_id,
            'student_name' => $studentName,
            'course_id' => $grade->course_id,
            'tugas' => $grade->tugas,
            'quiz' => $grade->quiz,
            'pts' => $grade->pts,
            'pas' => $grade->pas,
            'final' => $grade->finalScore(),
            'letter' => $grade->gradeLetter(),
            'feedback' => $grade->feedback,
        ];
    }

    private function authorizeTeacher(Request $request, Course $course): void
    {
        $user = $request->user();
        if ($user->hasRole('superadmin') || $user->hasRole('admin')) {
            return;
        }
        if ($user->id === $course->teachingAssignment->teacher_id) {
            return;
        }
        abort(403, 'Hanya guru pengampu atau Admin yang boleh mengubah nilai course ini.');
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
        abort(403, 'Anda tidak punya akses ke nilai course ini.');
    }
}
