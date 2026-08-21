<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\TeachingAssignment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CourseController extends Controller
{
    /**
     * Guru cuma lihat course yang diampu sendiri; siswa cuma lihat course
     * di kelasnya; admin/kepsek lihat semua (opsional filter).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Course::with(['teachingAssignment.teacher:id,name', 'teachingAssignment.subject', 'teachingAssignment.schoolClass'])
            ->withCount('modules');

        if ($user->hasRole('guru') || $user->hasRole('walikelas')) {
            $query->whereHas('teachingAssignment', fn ($q) => $q->where('teacher_id', $user->id));
        } elseif ($user->hasRole('siswa')) {
            $classId = $user->studentProfile?->school_class_id;
            $query->whereHas('teachingAssignment', fn ($q) => $q->where('school_class_id', $classId));
        } else {
            if ($request->filled('school_class_id')) {
                $query->whereHas('teachingAssignment', fn ($q) => $q->where('school_class_id', $request->integer('school_class_id')));
            }
            if ($request->filled('teacher_id')) {
                $query->whereHas('teachingAssignment', fn ($q) => $q->where('teacher_id', $request->integer('teacher_id')));
            }
        }

        return response()->json(['data' => $query->get()]);
    }

    /** Membuat course dari satu penugasan mengajar (satu course per penugasan). */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'teaching_assignment_id' => ['required', 'exists:teaching_assignments,id'],
            'description' => ['nullable', 'string'],
        ]);

        $assignment = TeachingAssignment::findOrFail($data['teaching_assignment_id']);
        $this->authorizeTeacher($request, $assignment->teacher_id);

        if (Course::where('teaching_assignment_id', $assignment->id)->exists()) {
            throw ValidationException::withMessages([
                'teaching_assignment_id' => ['Course untuk penugasan ini sudah ada.'],
            ]);
        }

        $course = Course::create($data);

        return response()->json(['data' => $course->load('teachingAssignment')], 201);
    }

    public function show(Request $request, Course $course): JsonResponse
    {
        $this->authorizeView($request, $course);

        return response()->json([
            'data' => $course->load([
                'teachingAssignment.teacher:id,name',
                'teachingAssignment.subject',
                'teachingAssignment.schoolClass',
                'modules.materials',
            ]),
        ]);
    }

    public function update(Request $request, Course $course): JsonResponse
    {
        $this->authorizeTeacher($request, $course->teachingAssignment->teacher_id);

        $data = $request->validate(['description' => ['nullable', 'string']]);
        $course->update($data);

        return response()->json(['data' => $course]);
    }

    public function destroy(Request $request, Course $course): JsonResponse
    {
        $this->authorizeTeacher($request, $course->teachingAssignment->teacher_id, allowAdminOnly: true);
        $course->delete();

        return response()->json(['message' => 'Course dihapus.']);
    }

    /** Guru pengampu atau Admin/Super Admin boleh mengubah. Guru lain ditolak. */
    private function authorizeTeacher(Request $request, int $teacherId, bool $allowAdminOnly = false): void
    {
        $user = $request->user();
        if ($user->hasRole('superadmin') || $user->hasRole('admin')) {
            return;
        }
        if (! $allowAdminOnly && $user->id === $teacherId) {
            return;
        }
        abort(403, 'Hanya guru pengampu atau Admin yang boleh mengubah course ini.');
    }

    /** Guru pengampu, siswa di kelasnya, atau Admin/Kepsek boleh melihat. */
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
