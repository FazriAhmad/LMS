<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\Course;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class AssignmentController extends Controller
{
    private const MAX_ATTACHMENT_KB = 20000;

    public function index(Request $request, Course $course): JsonResponse
    {
        $this->authorizeView($request, $course);
        $user = $request->user();

        $assignments = $course->assignments()->latest('deadline')->get();

        if ($user->hasRole('siswa')) {
            $submissions = AssignmentSubmission::whereIn('assignment_id', $assignments->pluck('id'))
                ->where('student_id', $user->id)
                ->get()
                ->keyBy('assignment_id');

            return response()->json(['data' => $assignments->map(
                fn (Assignment $a) => $this->formatAssignment($a, $submissions->get($a->id))
            )]);
        }

        return response()->json(['data' => $assignments->map(fn (Assignment $a) => $this->formatAssignment($a))]);
    }

    public function store(Request $request, Course $course): JsonResponse
    {
        $this->authorizeTeacher($request, $course);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'deadline' => ['required', 'date'],
            'rubric' => ['nullable', 'array'],
            'rubric.*.criterion' => ['required_with:rubric', 'string', 'max:255'],
            'rubric.*.weight' => ['required_with:rubric', 'numeric', 'min:0', 'max:100'],
            'attachments' => ['nullable', 'array'],
            'attachments.*' => ['file', 'max:' . self::MAX_ATTACHMENT_KB],
        ]);

        $data['course_id'] = $course->id;
        $data['created_by'] = $request->user()->id;
        $data['attachments'] = $this->storeAttachments($request);

        $assignment = Assignment::create($data);

        return response()->json(['data' => $this->formatAssignment($assignment)], 201);
    }

    public function show(Request $request, Assignment $assignment): JsonResponse
    {
        $this->authorizeView($request, $assignment->course);
        $user = $request->user();

        if ($user->hasRole('siswa')) {
            $submission = $assignment->submissions()->where('student_id', $user->id)->first();

            return response()->json(['data' => $this->formatAssignment($assignment, $submission)]);
        }

        $submissions = $assignment->submissions()->with('student:id,name')->get();

        return response()->json([
            'data' => $this->formatAssignment($assignment) + [
                'submissions' => $submissions->map(fn (AssignmentSubmission $s) => $this->formatSubmission($s)),
            ],
        ]);
    }

    public function update(Request $request, Assignment $assignment): JsonResponse
    {
        $this->authorizeTeacher($request, $assignment->course);

        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'deadline' => ['sometimes', 'required', 'date'],
            'rubric' => ['nullable', 'array'],
            'rubric.*.criterion' => ['required_with:rubric', 'string', 'max:255'],
            'rubric.*.weight' => ['required_with:rubric', 'numeric', 'min:0', 'max:100'],
        ]);
        $assignment->update($data);

        return response()->json(['data' => $this->formatAssignment($assignment)]);
    }

    public function destroy(Request $request, Assignment $assignment): JsonResponse
    {
        $this->authorizeTeacher($request, $assignment->course);

        foreach ($assignment->attachments ?? [] as $attachment) {
            Storage::disk('public')->delete($attachment['path']);
        }
        foreach ($assignment->submissions as $submission) {
            if ($submission->file_path) {
                Storage::disk('public')->delete($submission->file_path);
            }
        }
        $assignment->delete();

        return response()->json(['message' => 'Tugas dihapus.']);
    }

    /** Siswa mengumpulkan/mengumpulkan ulang jawaban. */
    public function submit(Request $request, Assignment $assignment): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasRole('siswa')) {
            abort(403, 'Hanya siswa yang bisa mengumpulkan tugas.');
        }
        if ($user->studentProfile?->school_class_id !== $assignment->course->teachingAssignment->school_class_id) {
            abort(403, 'Anda tidak terdaftar di kelas tugas ini.');
        }

        $data = $request->validate(['file' => ['required', 'file', 'max:' . self::MAX_ATTACHMENT_KB]]);

        $existing = AssignmentSubmission::where('assignment_id', $assignment->id)
            ->where('student_id', $user->id)
            ->first();

        if ($existing?->file_path) {
            Storage::disk('public')->delete($existing->file_path);
        }

        $file = $data['file'];
        $submission = AssignmentSubmission::updateOrCreate(
            ['assignment_id' => $assignment->id, 'student_id' => $user->id],
            [
                'file_path' => $file->store('assignment-submissions', 'public'),
                'file_size' => $file->getSize(),
                'submitted_at' => now(),
                'status' => 'sudah',
                'revisions' => $existing && $existing->status === 'revisi' ? $existing->revisions + 1 : ($existing->revisions ?? 0),
            ],
        );

        return response()->json(['data' => $this->formatSubmission($submission)]);
    }

    /** Guru pengampu menilai atau meminta revisi. */
    public function grade(Request $request, AssignmentSubmission $submission): JsonResponse
    {
        $this->authorizeTeacher($request, $submission->assignment->course);

        $data = $request->validate([
            'status' => ['required', Rule::in(['dinilai', 'revisi'])],
            'score' => ['required_if:status,dinilai', 'nullable', 'integer', 'min:0', 'max:100'],
            'feedback' => ['nullable', 'string'],
        ]);
        $submission->update($data);

        return response()->json(['data' => $this->formatSubmission($submission)]);
    }

    private function storeAttachments(Request $request): array
    {
        $attachments = [];
        foreach ($request->file('attachments', []) as $file) {
            $attachments[] = [
                'path' => $file->store('assignment-attachments', 'public'),
                'name' => $file->getClientOriginalName(),
                'size' => $file->getSize(),
            ];
        }

        return $attachments;
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
        abort(403, 'Hanya guru pengampu atau Admin yang boleh mengubah tugas ini.');
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
        abort(403, 'Anda tidak punya akses ke tugas ini.');
    }

    private function formatAssignment(Assignment $assignment, ?AssignmentSubmission $submission = null): array
    {
        $attachments = collect($assignment->attachments ?? [])->map(fn ($a) => [
            'name' => $a['name'],
            'url' => Storage::disk('public')->url($a['path']),
            'size' => $a['size'],
        ]);

        return [
            'id' => $assignment->id,
            'course_id' => $assignment->course_id,
            'title' => $assignment->title,
            'description' => $assignment->description,
            'deadline' => $assignment->deadline->toIso8601String(),
            'attachments' => $attachments,
            'rubric' => $assignment->rubric ?? [],
            'my_submission' => $submission ? $this->formatSubmission($submission) : null,
        ];
    }

    private function formatSubmission(AssignmentSubmission $submission): array
    {
        return [
            'id' => $submission->id,
            'student_id' => $submission->student_id,
            'student_name' => $submission->student?->name,
            'status' => $submission->status,
            'file_url' => $submission->fileUrl(),
            'submitted_at' => $submission->submitted_at?->toIso8601String(),
            'score' => $submission->score,
            'feedback' => $submission->feedback,
            'revisions' => $submission->revisions,
        ];
    }
}
