<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TeacherNote;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeacherNoteController extends Controller
{
    /** Siswa sendiri, ortu anak sendiri, atau guru/wali kelas/admin. */
    public function index(Request $request, User $student): JsonResponse
    {
        $this->authorizeAccess($request, $student);

        $notes = TeacherNote::where('student_id', $student->id)->with('teacher:id,name')->latest()->get();

        return response()->json(['data' => $notes]);
    }

    /** Guru yang mengajar siswa ini (punya course di kelasnya), wali kelasnya, atau Admin/Super Admin. */
    public function store(Request $request, User $student): JsonResponse
    {
        $user = $request->user();
        $classId = $student->studentProfile?->school_class_id;

        $isTeacherOfClass = $user->teachingAssignments()->where('school_class_id', $classId)->exists();
        if (! $user->hasAnyRole(['superadmin', 'admin']) && ! $isTeacherOfClass) {
            abort(403, 'Hanya guru yang mengajar siswa ini atau Admin yang boleh menambah catatan.');
        }

        $data = $request->validate(['note' => ['required', 'string', 'max:1000']]);
        $note = TeacherNote::create([
            'student_id' => $student->id,
            'teacher_id' => $user->id,
            'note' => $data['note'],
        ]);

        return response()->json(['data' => $note->load('teacher:id,name')], 201);
    }

    public function destroy(Request $request, TeacherNote $teacherNote): JsonResponse
    {
        $user = $request->user();
        if ($user->id !== $teacherNote->teacher_id && ! $user->hasAnyRole(['superadmin', 'admin'])) {
            abort(403, 'Hanya penulis catatan atau Admin yang boleh menghapus.');
        }
        $teacherNote->delete();

        return response()->json(['message' => 'Catatan dihapus.']);
    }

    private function authorizeAccess(Request $request, User $student): void
    {
        $user = $request->user();
        if ($user->id === $student->id || $user->hasAnyRole(['superadmin', 'admin', 'guru', 'walikelas', 'kepsek'])) {
            return;
        }
        if ($user->hasRole('ortu') && $user->children()->where('users.id', $student->id)->exists()) {
            return;
        }
        abort(403, 'Anda tidak punya akses ke catatan siswa ini.');
    }
}
