<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseModule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseModuleController extends Controller
{
    public function store(Request $request, Course $course): JsonResponse
    {
        $this->authorizeTeacher($request, $course);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'pertemuan' => ['nullable', 'string', 'max:50'],
        ]);
        $data['course_id'] = $course->id;
        $data['order'] = $course->modules()->max('order') + 1;

        $module = CourseModule::create($data);

        return response()->json(['data' => $module], 201);
    }

    public function update(Request $request, CourseModule $courseModule): JsonResponse
    {
        $this->authorizeTeacher($request, $courseModule->course);

        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'pertemuan' => ['sometimes', 'nullable', 'string', 'max:50'],
            'order' => ['sometimes', 'integer', 'min:0'],
        ]);
        $courseModule->update($data);

        return response()->json(['data' => $courseModule]);
    }

    public function destroy(Request $request, CourseModule $courseModule): JsonResponse
    {
        $this->authorizeTeacher($request, $courseModule->course);
        $courseModule->delete();

        return response()->json(['message' => 'Modul dihapus.']);
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
        abort(403, 'Hanya guru pengampu atau Admin yang boleh mengubah modul ini.');
    }
}
