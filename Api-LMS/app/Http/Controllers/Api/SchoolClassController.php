<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolClass;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
                User::find($previousTeacherId)?->removeRole('walikelas');
            }
        }
        if ($newTeacherId) {
            User::find($newTeacherId)?->assignRole('walikelas');
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
}
