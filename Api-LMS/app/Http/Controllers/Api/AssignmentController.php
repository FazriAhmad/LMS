<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\AssignmentAnswer;
use App\Models\AssignmentSubmission;
use App\Models\Course;
use App\Models\Question;
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

        return response()->json(['data' => $assignments->map(fn (Assignment $a) => $this->formatAssignment($a, null, true))]);
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
            'attachments.*' => ['file', 'max:'.self::MAX_ATTACHMENT_KB],
            'question_ids' => ['nullable', 'array'],
            'question_ids.*' => ['integer', 'exists:questions,id'],
        ]);

        $questionIds = $data['question_ids'] ?? [];
        unset($data['question_ids']);

        $data['course_id'] = $course->id;
        $data['created_by'] = $request->user()->id;
        $data['attachments'] = $this->storeAttachments($request);

        $assignment = Assignment::create($data);
        $this->syncQuestions($assignment, $questionIds);

        return response()->json(['data' => $this->formatAssignment($assignment, null, true)], 201);
    }

    /**
     * Soal disimpan berurutan sesuai urutan yang dikirim guru. Dipisah jadi helper karena
     * dipakai store & update, dan `sync()` mentah tidak mempertahankan urutan.
     */
    private function syncQuestions(Assignment $assignment, array $questionIds): void
    {
        $assignment->questions()->sync(
            collect($questionIds)->values()->mapWithKeys(fn ($id, $i) => [$id => ['order' => $i]])->all()
        );
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
            'data' => $this->formatAssignment($assignment, null, true) + [
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
            'question_ids' => ['nullable', 'array'],
            'question_ids.*' => ['integer', 'exists:questions,id'],
        ]);

        if (array_key_exists('question_ids', $data)) {
            $this->syncQuestions($assignment, $data['question_ids'] ?? []);
            unset($data['question_ids']);
        }

        $assignment->update($data);

        return response()->json(['data' => $this->formatAssignment($assignment->fresh(), null, true)]);
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

        $hasQuestions = $assignment->questions()->exists();

        // Tugas bersoal dikumpulkan lewat jawaban; tugas biasa lewat unggah berkas.
        // Berkas tetap boleh dilampirkan pada tugas bersoal (mis. lembar kerja pendukung).
        $data = $request->validate([
            'file' => [$hasQuestions ? 'nullable' : 'required', 'file', 'max:'.self::MAX_ATTACHMENT_KB],
            'answers' => [$hasQuestions ? 'required' : 'nullable', 'array'],
        ]);

        $existing = AssignmentSubmission::where('assignment_id', $assignment->id)
            ->where('student_id', $user->id)
            ->first();

        $payload = [
            'submitted_at' => now(),
            'status' => 'sudah',
            'revisions' => $existing && $existing->status === 'revisi' ? $existing->revisions + 1 : ($existing->revisions ?? 0),
        ];

        if ($request->hasFile('file')) {
            if ($existing?->file_path) {
                Storage::disk('public')->delete($existing->file_path);
            }
            $file = $data['file'];
            $payload['file_path'] = $file->store('assignment-submissions', 'public');
            $payload['file_size'] = $file->getSize();
        }

        $submission = AssignmentSubmission::updateOrCreate(
            ['assignment_id' => $assignment->id, 'student_id' => $user->id],
            $payload,
        );

        if ($hasQuestions) {
            $this->gradeAnswers($assignment, $submission, $data['answers'] ?? []);
        }

        return response()->json(['data' => $this->formatSubmission($submission->fresh())]);
    }

    /**
     * Menilai jawaban objektif secara otomatis lewat Question::grade() — logika yang sama
     * persis dipakai Quiz, jadi perilakunya konsisten (pg/tf cocok-persis, isian toleran
     * spasi/huruf besar + keyword alternatif, essay selalu null = manual).
     *
     * Kalau SEMUA soal objektif, nilainya langsung final (0-100, dibobot poin tiap soal) dan
     * status jadi `dinilai`. Kalau ada esai, status tetap `sudah` — guru yang menentukan nilai
     * akhir lewat endpoint grade yang sudah ada, dengan hasil auto-grading sebagai acuan.
     */
    private function gradeAnswers(Assignment $assignment, AssignmentSubmission $submission, array $answers): void
    {
        $earned = 0;
        $totalPoints = 0;
        $hasEssay = false;

        foreach ($assignment->questions as $question) {
            $answer = $answers[$question->id] ?? null;
            $result = $question->grade(is_string($answer) ? $answer : null);

            $totalPoints += $question->points;
            if ($result === null) {
                $hasEssay = true;
            } elseif ($result) {
                $earned += $question->points;
            }

            AssignmentAnswer::updateOrCreate(
                ['assignment_submission_id' => $submission->id, 'question_id' => $question->id],
                ['answer' => $answer, 'is_correct' => $result],
            );
        }

        if (! $hasEssay && $totalPoints > 0) {
            $submission->update([
                'score' => (int) round($earned / $totalPoints * 100),
                'status' => 'dinilai',
            ]);
        }
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

    private function formatAssignment(Assignment $assignment, ?AssignmentSubmission $submission = null, bool $withKey = false): array
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
            'questions' => $this->formatQuestions($assignment, $submission, $withKey),
            'my_submission' => $submission ? $this->formatSubmission($submission) : null,
        ];
    }

    /**
     * Kunci jawaban disembunyikan dari siswa sampai dia mengumpulkan — pola yang sama
     * dengan Quiz (lihat catatan keamanan modul 07 di STATUS.md): di data mock lama kunci
     * selalu ikut terkirim ke browser, di sini tidak.
     */
    private function formatQuestions(Assignment $assignment, ?AssignmentSubmission $submission, bool $withKey): array
    {
        $reveal = $withKey || $submission?->submitted_at !== null;

        return $assignment->questions->map(function (Question $q) use ($reveal) {
            $row = [
                'id' => $q->id,
                'type' => $q->type,
                'text' => $q->text,
                'options' => $q->options,
                'points' => $q->points,
            ];
            if ($reveal) {
                $row['answer'] = $q->answer;
            }

            return $row;
        })->values()->all();
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
            'answers' => $submission->answers->map(fn (AssignmentAnswer $a) => [
                'question_id' => $a->question_id,
                'answer' => $a->answer,
                'is_correct' => $a->is_correct,
            ])->values(),
        ];
    }
}
