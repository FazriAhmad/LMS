<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\SchoolClass;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SchoolClassController extends Controller
{
    /**
     * Wali kelas bukan akun terpisah (PRD modul 03) — cuma guru yang ditandai
     * homeroom_teacher_id di satu kelas. Role "walikelas" di-assign/dicabut
     * otomatis di sini, guru tidak pernah memilihnya sendiri.
     */
    private function syncHomeroomRole(?int $previousTeacherId, ?int $newTeacherId): void
    {
        if ($previousTeacherId && $previousTeacherId !== $newTeacherId) {
            $stillHomeroom = SchoolClass::where('homeroom_teacher_id', $previousTeacherId)->exists();
            if (! $stillHomeroom) {
                if ($prevUser = User::find($previousTeacherId)) {
                    $prevUser->removeRole('walikelas');
                    AuditLog::record('role_removed', $prevUser, ['role' => 'walikelas']);
                }
            }
        }
        if ($newTeacherId && ($newUser = User::find($newTeacherId))) {
            $newUser->assignRole('walikelas');
            AuditLog::record('role_assigned', $newUser, ['role' => 'walikelas']);
        }
    }

    public function index(Request $request): JsonResponse
    {
        $query = SchoolClass::with(['major', 'academicYear', 'homeroomTeacher:id,name'])
            ->withCount('students')
            ->orderBy('name');

        if ($request->filled('academic_year_id')) {
            $query->where('academic_year_id', $request->integer('academic_year_id'));
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'major_id' => ['nullable', 'exists:majors,id'],
            'academic_year_id' => ['required', 'exists:academic_years,id'],
            'homeroom_teacher_id' => ['nullable', 'exists:users,id'],
            'capacity' => ['nullable', 'integer', 'min:1'],
        ]);

        $class = SchoolClass::create($data);

        if (! empty($data['homeroom_teacher_id'])) {
            $this->syncHomeroomRole(null, $data['homeroom_teacher_id']);
        }

        return response()->json(['data' => $class->load(['major', 'academicYear', 'homeroomTeacher:id,name'])], 201);
    }

    public function show(SchoolClass $schoolClass): JsonResponse
    {
        return response()->json([
            'data' => $schoolClass->load(['major', 'academicYear', 'homeroomTeacher:id,name', 'students.user:id,name,username']),
        ]);
    }

    public function update(Request $request, SchoolClass $schoolClass): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:50'],
            'major_id' => ['sometimes', 'nullable', 'exists:majors,id'],
            'academic_year_id' => ['sometimes', 'required', 'exists:academic_years,id'],
            'homeroom_teacher_id' => ['sometimes', 'nullable', 'exists:users,id'],
            'capacity' => ['sometimes', 'nullable', 'integer', 'min:1'],
        ]);

        $previousTeacherId = $schoolClass->homeroom_teacher_id;
        $schoolClass->update($data);

        if (array_key_exists('homeroom_teacher_id', $data)) {
            $this->syncHomeroomRole($previousTeacherId, $data['homeroom_teacher_id']);
        }

        return response()->json(['data' => $schoolClass->load(['major', 'academicYear', 'homeroomTeacher:id,name'])]);
    }

    public function destroy(SchoolClass $schoolClass): JsonResponse
    {
        $previousTeacherId = $schoolClass->homeroom_teacher_id;
        $schoolClass->delete();
        $this->syncHomeroomRole($previousTeacherId, null);

        return response()->json(['message' => 'Kelas dihapus.']);
    }

    /** Daftar siswa satu kelas beserta jabatan pengurus kelasnya (kalau ada). */
    public function roster(Request $request, SchoolClass $schoolClass): JsonResponse
    {
        $this->authorizeHomeroom($request, $schoolClass);

        $students = $schoolClass->students()->with('user:id,name,username')->get()
            ->sortBy(fn (StudentProfile $s) => $s->user?->name)
            ->values();

        return response()->json([
            'data' => $students->map(fn (StudentProfile $s) => [
                'student_id' => $s->user_id,
                'name' => $s->user?->name,
                'nis' => $s->nis,
                'class_role' => $s->class_role,
            ]),
            'school_class' => ['id' => $schoolClass->id, 'name' => $schoolClass->name],
        ]);
    }

    /**
     * Menunjuk (atau mencabut, kalau role null) jabatan pengurus kelas seorang siswa.
     * Kalau jabatan itu sedang dipegang siswa lain di kelas yang sama, jabatan lama itu
     * otomatis dilepas dulu — constraint unique di DB tidak mengizinkan dua pemegang sekaligus,
     * dan UX yang wajar buat wali kelas adalah "pilih siswa baru buat jabatan ini", bukan error.
     */
    public function assignRole(Request $request, SchoolClass $schoolClass, User $student): JsonResponse
    {
        $this->authorizeHomeroom($request, $schoolClass);

        $data = $request->validate([
            'class_role' => ['nullable', Rule::in(StudentProfile::CLASS_ROLES)],
        ]);

        $profile = StudentProfile::where('user_id', $student->id)
            ->where('school_class_id', $schoolClass->id)
            ->firstOrFail();

        if ($data['class_role'] !== null) {
            StudentProfile::where('school_class_id', $schoolClass->id)
                ->where('class_role', $data['class_role'])
                ->where('user_id', '!=', $student->id)
                ->update(['class_role' => null]);
        }

        $profile->update(['class_role' => $data['class_role']]);

        return response()->json(['data' => [
            'student_id' => $student->id,
            'name' => $student->name,
            'nis' => $profile->nis,
            'class_role' => $profile->class_role,
        ]]);
    }

    /** Wali kelas kelas ini saja (plus Admin/Super Admin). */
    private function authorizeHomeroom(Request $request, SchoolClass $schoolClass): void
    {
        $user = $request->user();
        if ($user->hasAnyRole(['superadmin', 'admin'])) {
            return;
        }
        if ($schoolClass->homeroom_teacher_id === $user->id) {
            return;
        }
        abort(403, 'Hanya wali kelas kelas ini yang boleh mengatur pengurus kelas.');
    }
}
