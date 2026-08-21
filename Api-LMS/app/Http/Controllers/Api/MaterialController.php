<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseModule;
use App\Models\Material;
use App\Models\MaterialProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class MaterialController extends Controller
{
    /**
     * Batas ukuran per tipe file (KB, untuk validasi Laravel) — sesuai PRD:
     * dokumen kecil dibolehkan, video sebaiknya lewat YouTube unlisted (bukan upload).
     */
    private const MAX_KB = [
        'pdf' => 20000,
        'doc' => 20000,
        'ppt' => 20000,
        'image' => 5000,
        'video' => 50000,
    ];

    public function store(Request $request, CourseModule $courseModule): JsonResponse
    {
        $this->authorizeTeacher($request, $courseModule->course);

        $type = $request->input('type');
        $rules = [
            'type' => ['required', Rule::in(['pdf', 'doc', 'ppt', 'image', 'video', 'youtube', 'link'])],
            'title' => ['required', 'string', 'max:255'],
        ];

        if (in_array($type, ['pdf', 'doc', 'ppt', 'image', 'video'], true)) {
            $maxKb = self::MAX_KB[$type] ?? 20000;
            $rules['file'] = ['required', 'file', 'max:' . $maxKb];
        } elseif ($type === 'youtube') {
            $rules['youtube_id'] = ['required', 'string', 'max:20'];
        } elseif ($type === 'link') {
            $rules['url'] = ['required', 'url', 'max:2048'];
        }

        $data = $request->validate($rules);
        $data['course_module_id'] = $courseModule->id;
        $data['order'] = $courseModule->materials()->max('order') + 1;
        $data['uploaded_by'] = $request->user()->id;

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $data['file_path'] = $file->store('materials', 'public');
            $data['file_size'] = $file->getSize();
        }

        $material = Material::create($data);

        return response()->json(['data' => $this->formatMaterial($material)], 201);
    }

    public function update(Request $request, Material $material): JsonResponse
    {
        $this->authorizeTeacher($request, $material->courseModule->course);

        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'order' => ['sometimes', 'integer', 'min:0'],
        ]);
        $material->update($data);

        return response()->json(['data' => $this->formatMaterial($material)]);
    }

    public function destroy(Request $request, Material $material): JsonResponse
    {
        $this->authorizeTeacher($request, $material->courseModule->course);

        if ($material->file_path) {
            Storage::disk('public')->delete($material->file_path);
        }
        $material->delete();

        return response()->json(['message' => 'Materi dihapus.']);
    }

    /** Siswa menandai materi ini sudah dibuka/diselesaikan — dasar Progress Belajar. */
    public function markComplete(Request $request, Material $material): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasRole('siswa')) {
            abort(403, 'Hanya siswa yang bisa menandai materi selesai.');
        }

        $progress = MaterialProgress::updateOrCreate(
            ['material_id' => $material->id, 'student_id' => $user->id],
            ['completed_at' => now()],
        );

        return response()->json(['data' => $progress]);
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
        abort(403, 'Hanya guru pengampu atau Admin yang boleh mengubah materi ini.');
    }

    private function formatMaterial(Material $material): array
    {
        return [
            'id' => $material->id,
            'course_module_id' => $material->course_module_id,
            'type' => $material->type,
            'title' => $material->title,
            'url' => $material->file_path ? $material->fileUrl() : $material->url,
            'youtube_id' => $material->youtube_id,
            'size' => $material->formattedSize(),
            'duration' => $material->formattedDuration(),
            'order' => $material->order,
        ];
    }
}
