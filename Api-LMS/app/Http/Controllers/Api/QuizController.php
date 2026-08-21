<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\QuizAttemptAnswer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class QuizController extends Controller
{
    public function index(Request $request, Course $course): JsonResponse
    {
        $this->authorizeView($request, $course);

        return response()->json(['data' => $course->quizzes()->withCount('questions')->get()]);
    }

    public function store(Request $request, Course $course): JsonResponse
    {
        $this->authorizeTeacher($request, $course);
        $data = $this->validated($request, $course);

        $quiz = DB::transaction(function () use ($data, $course, $request) {
            $quiz = Quiz::create([
                'course_id' => $course->id,
                'title' => $data['title'],
                'duration_min' => $data['duration_min'],
                'max_attempts' => $data['max_attempts'],
                'randomize' => $data['randomize'] ?? false,
                'created_by' => $request->user()->id,
            ]);
            $this->syncQuestions($quiz, $data['question_ids']);

            return $quiz;
        });

        return response()->json(['data' => $this->formatQuiz($quiz, includeAnswers: true)], 201);
    }

    /** Siswa lihat soal TANPA kunci jawaban (dipakai sebelum/selama mengerjakan). Guru/Admin lihat lengkap. */
    public function show(Request $request, Quiz $quiz): JsonResponse
    {
        $this->authorizeView($request, $quiz->course);
        $user = $request->user();
        $isStaff = $user->hasAnyRole(['superadmin', 'admin']) || $user->id === $quiz->course->teachingAssignment->teacher_id;

        $data = $this->formatQuiz($quiz, includeAnswers: $isStaff);

        if (! $isStaff) {
            $data['attempts_used'] = QuizAttempt::where('quiz_id', $quiz->id)->where('student_id', $user->id)->count();
        }

        return response()->json(['data' => $data]);
    }

    public function update(Request $request, Quiz $quiz): JsonResponse
    {
        $this->authorizeTeacher($request, $quiz->course);
        $data = $this->validated($request, $quiz->course);

        DB::transaction(function () use ($quiz, $data) {
            $quiz->update([
                'title' => $data['title'],
                'duration_min' => $data['duration_min'],
                'max_attempts' => $data['max_attempts'],
                'randomize' => $data['randomize'] ?? false,
            ]);
            $this->syncQuestions($quiz, $data['question_ids']);
        });

        return response()->json(['data' => $this->formatQuiz($quiz->fresh(), includeAnswers: true)]);
    }

    public function destroy(Request $request, Quiz $quiz): JsonResponse
    {
        $this->authorizeTeacher($request, $quiz->course);
        $quiz->delete();

        return response()->json(['message' => 'Quiz dihapus.']);
    }

    /** Siswa kumpulkan jawaban sekaligus (tidak ada autosave, sama seperti alur di referensi UI). */
    public function submitAttempt(Request $request, Quiz $quiz): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasRole('siswa')) {
            abort(403, 'Hanya siswa yang bisa mengerjakan quiz.');
        }
        if ($user->studentProfile?->school_class_id !== $quiz->course->teachingAssignment->school_class_id) {
            abort(403, 'Anda tidak terdaftar di kelas quiz ini.');
        }

        $usedAttempts = QuizAttempt::where('quiz_id', $quiz->id)->where('student_id', $user->id)->count();
        if ($usedAttempts >= $quiz->max_attempts) {
            throw ValidationException::withMessages(['attempts' => ['Kesempatan mengerjakan quiz ini sudah habis.']]);
        }

        $data = $request->validate(['answers' => ['required', 'array']]);
        $answers = $data['answers'];

        $attempt = DB::transaction(function () use ($quiz, $user, $answers) {
            $autoScore = 0;
            $maxAuto = 0;
            $totalPoints = 0;
            $essayPending = 0;
            $rows = [];

            foreach ($quiz->questions as $question) {
                $totalPoints += $question->points;
                $answer = $answers[$question->id] ?? null;
                $result = $question->grade($answer);

                if ($result === null) {
                    $essayPending++;
                } else {
                    $maxAuto += $question->points;
                    if ($result) {
                        $autoScore += $question->points;
                    }
                }

                $rows[] = [
                    'question_id' => $question->id,
                    'answer' => $answer,
                    'is_correct' => $result,
                ];
            }

            $attempt = QuizAttempt::create([
                'quiz_id' => $quiz->id,
                'student_id' => $user->id,
                'auto_score' => $autoScore,
                'max_auto' => $maxAuto,
                'total_points' => $totalPoints,
                'essay_pending_count' => $essayPending,
                'submitted_at' => now(),
            ]);

            foreach ($rows as $row) {
                QuizAttemptAnswer::create($row + ['quiz_attempt_id' => $attempt->id]);
            }

            return $attempt;
        });

        return response()->json(['data' => $this->formatAttempt($attempt)], 201);
    }

    /** Siswa lihat riwayat percobaannya sendiri; guru/Admin lihat semua percobaan (buat menilai essay). */
    public function attempts(Request $request, Quiz $quiz): JsonResponse
    {
        $this->authorizeView($request, $quiz->course);
        $user = $request->user();

        $query = QuizAttempt::where('quiz_id', $quiz->id)->with('student:id,name');
        if ($user->hasRole('siswa')) {
            $query->where('student_id', $user->id);
        }

        return response()->json(['data' => $query->latest('submitted_at')->get()->map(fn (QuizAttempt $a) => $this->formatAttempt($a, summaryOnly: true))]);
    }

    public function showAttempt(Request $request, QuizAttempt $attempt): JsonResponse
    {
        $this->authorizeView($request, $attempt->quiz->course);
        $user = $request->user();
        if ($user->hasRole('siswa') && $user->id !== $attempt->student_id) {
            abort(403, 'Anda tidak bisa melihat percobaan siswa lain.');
        }

        return response()->json(['data' => $this->formatAttempt($attempt)]);
    }

    /** Guru menilai soal essay dalam satu percobaan siswa. */
    public function gradeEssay(Request $request, QuizAttempt $attempt): JsonResponse
    {
        $this->authorizeTeacher($request, $attempt->quiz->course);

        $data = $request->validate([
            'scores' => ['required', 'array'],
            'scores.*' => ['required', 'integer', 'min:0', 'max:100'],
        ]);

        DB::transaction(function () use ($attempt, $data) {
            foreach ($data['scores'] as $questionId => $score) {
                QuizAttemptAnswer::where('quiz_attempt_id', $attempt->id)
                    ->where('question_id', $questionId)
                    ->update(['essay_score' => $score]);
            }

            $essayTotal = (int) $attempt->answers()->whereNotNull('essay_score')->sum('essay_score');
            $stillPending = $attempt->answers()->whereNull('is_correct')->whereNull('essay_score')->count();

            $attempt->update(['essay_score' => $essayTotal, 'essay_pending_count' => $stillPending]);
        });

        return response()->json(['data' => $this->formatAttempt($attempt->fresh())]);
    }

    private function validated(Request $request, Course $course): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'duration_min' => ['required', 'integer', 'min:1', 'max:300'],
            'max_attempts' => ['required', 'integer', 'min:1', 'max:10'],
            'randomize' => ['boolean'],
            'question_ids' => ['required', 'array', 'min:1'],
            'question_ids.*' => ['required', 'integer', 'exists:questions,id'],
        ]);

        $subjectId = $course->teachingAssignment->subject_id;
        $invalid = Question::whereIn('id', $data['question_ids'])->where('subject_id', '!=', $subjectId)->exists();
        if ($invalid) {
            throw ValidationException::withMessages(['question_ids' => ['Ada soal yang bukan dari mapel course ini.']]);
        }

        return $data;
    }

    private function syncQuestions(Quiz $quiz, array $questionIds): void
    {
        $quiz->questions()->sync(collect($questionIds)->mapWithKeys(fn ($id, $i) => [$id => ['order' => $i]]));
    }

    private function formatQuiz(Quiz $quiz, bool $includeAnswers): array
    {
        return [
            'id' => $quiz->id,
            'course_id' => $quiz->course_id,
            'title' => $quiz->title,
            'duration_min' => $quiz->duration_min,
            'max_attempts' => $quiz->max_attempts,
            'randomize' => $quiz->randomize,
            'questions' => $quiz->questions->map(function (Question $q) use ($includeAnswers) {
                $row = [
                    'id' => $q->id,
                    'type' => $q->type,
                    'text' => $q->text,
                    'options' => $q->options,
                    'points' => $q->points,
                ];
                if ($includeAnswers) {
                    $row['answer'] = $q->answer;
                    $row['keywords'] = $q->keywords;
                }

                return $row;
            })->values(),
        ];
    }

    private function formatAttempt(QuizAttempt $attempt, bool $summaryOnly = false): array
    {
        $base = [
            'id' => $attempt->id,
            'quiz_id' => $attempt->quiz_id,
            'student_id' => $attempt->student_id,
            'student_name' => $attempt->student?->name,
            'auto_score' => $attempt->auto_score,
            'max_auto' => $attempt->max_auto,
            'essay_score' => $attempt->essay_score,
            'total_points' => $attempt->total_points,
            'essay_pending_count' => $attempt->essay_pending_count,
            'final_score' => $attempt->finalScore(),
            'submitted_at' => $attempt->submitted_at->toIso8601String(),
        ];

        if ($summaryOnly) {
            return $base;
        }

        $base['answers'] = $attempt->answers()->with('question')->get()->map(fn (QuizAttemptAnswer $a) => [
            'question_id' => $a->question_id,
            'text' => $a->question->text,
            'type' => $a->question->type,
            'points' => $a->question->points,
            'answer' => $a->answer,
            'correct_answer' => $a->question->answer,
            'is_correct' => $a->is_correct,
            'essay_score' => $a->essay_score,
        ])->values();

        return $base;
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
        abort(403, 'Hanya guru pengampu atau Admin yang boleh mengubah quiz ini.');
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
        abort(403, 'Anda tidak punya akses ke quiz ini.');
    }
}
