<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Question;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class QuestionController extends Controller
{
    /**
     * Bank soal dasar (fondasi buat Quiz modul 07) — CRUD minimal per mapel.
     * Fitur bank soal lengkap (tagging kurikulum lanjutan, statistik usedCount/correctRate,
     * impor massal) sengaja belum dikerjakan, itu scope modul 09 (Fase 2).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Question::query();

        if (! $user->hasRole('superadmin') && ! $user->hasRole('admin')) {
            $subjectIds = $user->teachingAssignments()->pluck('subject_id');
            $query->where(fn ($q) => $q->whereIn('subject_id', $subjectIds)->orWhere('created_by', $user->id));
        }

        $query->when($request->filled('subject_id'), fn ($q) => $q->where('subject_id', $request->integer('subject_id')))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->when($request->filled('difficulty'), fn ($q) => $q->where('difficulty', $request->string('difficulty')));

        return response()->json(['data' => $query->latest()->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $this->authorizeSubject($request, $data['subject_id']);

        $data['created_by'] = $request->user()->id;
        $question = Question::create($data);

        return response()->json(['data' => $question], 201);
    }

    public function update(Request $request, Question $question): JsonResponse
    {
        $this->authorizeOwner($request, $question);

        $data = $this->validated($request);
        $question->update($data);

        return response()->json(['data' => $question]);
    }

    public function destroy(Request $request, Question $question): JsonResponse
    {
        $this->authorizeOwner($request, $question);
        $question->delete();

        return response()->json(['message' => 'Soal dihapus.']);
    }

    private function validated(Request $request): array
    {
        $type = $request->input('type');
        $data = $request->validate([
            'subject_id' => ['required', 'exists:subjects,id'],
            'type' => ['required', Rule::in(['pg', 'tf', 'isian', 'essay'])],
            'text' => ['required', 'string'],
            'options' => ['required_if:type,pg,tf', 'array'],
            'answer' => ['required_if:type,pg,tf,isian', 'nullable', 'string'],
            'keywords' => ['nullable', 'array'],
            'points' => ['required', 'integer', 'min:1', 'max:100'],
            'difficulty' => ['required', Rule::in(['Mudah', 'Sedang', 'Sulit'])],
            'kompetensi' => ['nullable', 'string', 'max:255'],
        ]);

        if ($type === 'pg' && $data['answer'] !== null && ! in_array($data['answer'], $data['options'], true)) {
            throw ValidationException::withMessages(['answer' => ['Kunci jawaban harus salah satu dari opsi.']]);
        }

        return $data;
    }

    private function authorizeSubject(Request $request, int $subjectId): void
    {
        $user = $request->user();
        if ($user->hasRole('superadmin') || $user->hasRole('admin')) {
            return;
        }
        if ($user->teachingAssignments()->where('subject_id', $subjectId)->exists()) {
            return;
        }
        abort(403, 'Anda tidak mengajar mapel ini.');
    }

    private function authorizeOwner(Request $request, Question $question): void
    {
        $user = $request->user();
        if ($user->hasRole('superadmin') || $user->hasRole('admin') || $user->id === $question->created_by) {
            return;
        }
        abort(403, 'Hanya pembuat soal atau Admin yang boleh mengubah soal ini.');
    }
}
