<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GradeWeight;
use App\Models\Subject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class GradeWeightController extends Controller
{
    public function show(Subject $subject): JsonResponse
    {
        return response()->json(['data' => GradeWeight::forSubject($subject->id)]);
    }

    /** Guru pengampu mapel ini atau Admin/Super Admin boleh atur ulang bobot. */
    public function update(Request $request, Subject $subject): JsonResponse
    {
        $user = $request->user();
        $isTeacherOfSubject = $user->teachingAssignments()->where('subject_id', $subject->id)->exists();
        if (! $user->hasAnyRole(['superadmin', 'admin']) && ! $isTeacherOfSubject) {
            abort(403, 'Hanya guru pengampu mapel ini atau Admin yang boleh mengubah bobot nilai.');
        }

        $data = $request->validate([
            'tugas' => ['required', 'integer', 'min:0', 'max:100'],
            'quiz' => ['required', 'integer', 'min:0', 'max:100'],
            'pts' => ['required', 'integer', 'min:0', 'max:100'],
            'pas' => ['required', 'integer', 'min:0', 'max:100'],
        ]);

        if (array_sum($data) !== 100) {
            throw ValidationException::withMessages(['weights' => ['Total bobot keempat komponen harus 100%.']]);
        }

        $weight = GradeWeight::updateOrCreate(['subject_id' => $subject->id], $data);

        return response()->json(['data' => [
            'tugas' => $weight->tugas, 'quiz' => $weight->quiz, 'pts' => $weight->pts, 'pas' => $weight->pas,
        ]]);
    }
}
