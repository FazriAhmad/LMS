<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TeachingAssignment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class TeachingAssignmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = TeachingAssignment::with(['teacher:id,name', 'subject', 'schoolClass', 'academicYear']);

        if ($request->filled('school_class_id')) {
            $query->where('school_class_id', $request->integer('school_class_id'));
        }
        if ($request->filled('teacher_id')) {
            $query->where('teacher_id', $request->integer('teacher_id'));
        }
        if ($request->filled('academic_year_id')) {
            $query->where('academic_year_id', $request->integer('academic_year_id'));
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'teacher_id' => ['required', 'exists:users,id'],
            'subject_id' => ['required', 'exists:subjects,id'],
            'school_class_id' => ['required', 'exists:school_classes,id'],
            'academic_year_id' => ['required', 'exists:academic_years,id'],
        ]);

        $exists = TeachingAssignment::where('subject_id', $data['subject_id'])
            ->where('school_class_id', $data['school_class_id'])
            ->where('academic_year_id', $data['academic_year_id'])
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'subject_id' => ['Mapel ini di kelas & tahun ajaran tersebut sudah punya guru pengampu.'],
            ]);
        }

        $assignment = TeachingAssignment::create($data);

        return response()->json(['data' => $assignment->load(['teacher:id,name', 'subject', 'schoolClass'])], 201);
    }

    public function destroy(TeachingAssignment $teachingAssignment): JsonResponse
    {
        $teachingAssignment->delete();

        return response()->json(['message' => 'Penugasan mengajar dihapus.']);
    }
}
