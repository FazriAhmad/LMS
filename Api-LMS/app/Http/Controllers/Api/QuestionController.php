<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Question;
use App\Models\QuizAttemptAnswer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class QuestionController extends Controller
{
    /**
     * Bank soal (modul 09) — dibangun di atas fondasi `questions` dari modul 07.
     * Import massal & tagging kurikulum lanjutan sengaja belum dikerjakan (lihat catatan di bawah).
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
            ->when($request->filled('difficulty'), fn ($q) => $q->where('difficulty', $request->string('difficulty')))
            ->when($request->filled('q'), function ($q) use ($request) {
                $term = '%' . $request->string('q') . '%';
                $q->where(fn ($w) => $w->where('text', 'ilike', $term)->orWhere('kompetensi', 'ilike', $term));
            });

        $questions = $query->latest()->get();

        return response()->json(['data' => $this->withStats($questions)]);
    }

    /**
     * "Dipakai N×" dan "% benar" dihitung on-the-fly dari riwayat pemakaian nyata
     * (jawaban quiz + peserta ujian yang sudah selesai) — bukan kolom tersimpan,
     * supaya selalu akurat tanpa perlu job/trigger buat sinkronisasi.
     */
    private function withStats(Collection $questions): Collection
    {
        $ids = $questions->pluck('id');

        $quizStats = QuizAttemptAnswer::whereIn('question_id', $ids)
            ->selectRaw('question_id, count(*) as used, sum(case when is_correct then 1 else 0 end) as correct, sum(case when is_correct is not null then 1 else 0 end) as graded')
            ->groupBy('question_id')->get()->keyBy('question_id');

        $examRows = DB::table('exam_questions')
            ->join('exam_participants', 'exam_participants.exam_id', '=', 'exam_questions.exam_id')
            ->where('exam_participants.status', 'selesai')
            ->whereIn('exam_questions.question_id', $ids)
            ->select('exam_questions.question_id', 'exam_participants.answers')
            ->get()->groupBy('question_id');

        return $questions->map(function (Question $question) use ($quizStats, $examRows) {
            $used = 0;
            $graded = 0;
            $correct = 0;

            if ($stat = $quizStats->get($question->id)) {
                $used += (int) $stat->used;
                $graded += (int) $stat->graded;
                $correct += (int) $stat->correct;
            }

            foreach ($examRows->get($question->id, collect()) as $row) {
                $used++;
                $answers = json_decode($row->answers, true) ?? [];
                if (array_key_exists($question->id, $answers)) {
                    $result = $question->grade($answers[$question->id]);
                    if ($result !== null) {
                        $graded++;
                        $correct += $result ? 1 : 0;
                    }
                }
            }

            $question->used_count = $used;
            $question->correct_rate = $graded > 0 ? (int) round($correct / $graded * 100) : null;

            return $question;
        });
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
