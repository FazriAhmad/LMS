<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Exam;
use App\Models\ExamParticipant;
use App\Models\Question;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ExamController extends Controller
{
    public function index(Request $request, Course $course): JsonResponse
    {
        $this->authorizeView($request, $course);

        return response()->json(['data' => $course->exams()->withCount('questions')->orderBy('scheduled_at')->get()]);
    }

    public function store(Request $request, Course $course): JsonResponse
    {
        $this->authorizeTeacher($request, $course);
        $data = $this->validated($request, $course);

        $exam = DB::transaction(function () use ($data, $course, $request) {
            $exam = Exam::create([
                'course_id' => $course->id,
                'title' => $data['title'],
                'type' => $data['type'],
                'scheduled_at' => $data['scheduled_at'],
                'duration_min' => $data['duration_min'],
                'status' => 'terjadwal',
                'created_by' => $request->user()->id,
            ]);
            $this->syncQuestions($exam, $data['question_ids']);

            return $exam;
        });

        return response()->json(['data' => $this->formatExam($exam, includeAnswers: true)], 201);
    }

    public function show(Request $request, Exam $exam): JsonResponse
    {
        $this->authorizeView($request, $exam->course);
        $user = $request->user();
        $isStaff = $user->hasAnyRole(['superadmin', 'admin']) || $user->id === $exam->course->teachingAssignment->teacher_id;

        $data = $this->formatExam($exam, includeAnswers: $isStaff);

        if (! $isStaff) {
            $participant = ExamParticipant::where('exam_id', $exam->id)->where('student_id', $user->id)->first();
            $data['my_participation'] = $participant ? $this->formatParticipant($participant) : null;
        }

        return response()->json(['data' => $data]);
    }

    /** Cuma boleh diubah selama masih terjadwal — begitu dibuka, soal tidak boleh berubah lagi. */
    public function update(Request $request, Exam $exam): JsonResponse
    {
        $this->authorizeTeacher($request, $exam->course);
        if ($exam->status !== 'terjadwal') {
            throw ValidationException::withMessages(['status' => ['Ujian yang sudah dibuka/selesai tidak bisa diubah.']]);
        }

        $data = $this->validated($request, $exam->course);
        DB::transaction(function () use ($exam, $data) {
            $exam->update([
                'title' => $data['title'],
                'type' => $data['type'],
                'scheduled_at' => $data['scheduled_at'],
                'duration_min' => $data['duration_min'],
            ]);
            $this->syncQuestions($exam, $data['question_ids']);
        });

        return response()->json(['data' => $this->formatExam($exam->fresh(), includeAnswers: true)]);
    }

    public function destroy(Request $request, Exam $exam): JsonResponse
    {
        $this->authorizeTeacher($request, $exam->course);
        $exam->delete();

        return response()->json(['message' => 'Ujian dihapus.']);
    }

    public function open(Request $request, Exam $exam): JsonResponse
    {
        $this->authorizeTeacher($request, $exam->course);
        if ($exam->status !== 'terjadwal') {
            throw ValidationException::withMessages(['status' => ['Cuma ujian berstatus terjadwal yang bisa dibuka.']]);
        }
        $exam->update(['status' => 'aktif']);

        return response()->json(['data' => $this->formatExam($exam, includeAnswers: true)]);
    }

    public function close(Request $request, Exam $exam): JsonResponse
    {
        $this->authorizeTeacher($request, $exam->course);
        if ($exam->status !== 'aktif') {
            throw ValidationException::withMessages(['status' => ['Cuma ujian yang sedang aktif yang bisa ditutup.']]);
        }
        $exam->update(['status' => 'selesai']);

        return response()->json(['data' => $this->formatExam($exam, includeAnswers: true)]);
    }

    /** Siswa masuk ruang ujian — cuma sekali, tidak seperti Quiz yang boleh berkali-kali. */
    public function start(Request $request, Exam $exam): JsonResponse
    {
        $user = $request->user();
        $this->authorizeStudent($request, $exam);

        if ($exam->status !== 'aktif') {
            throw ValidationException::withMessages(['status' => ['Ujian belum dibuka atau sudah ditutup.']]);
        }
        if (ExamParticipant::where('exam_id', $exam->id)->where('student_id', $user->id)->exists()) {
            throw ValidationException::withMessages(['exam' => ['Anda sudah pernah memulai ujian ini.']]);
        }

        $participant = ExamParticipant::create([
            'exam_id' => $exam->id,
            'student_id' => $user->id,
            'status' => 'sedang',
            'answers' => [],
            'tab_switches' => 0,
            'last_saved_at' => now(),
        ]);

        return response()->json(['data' => $this->formatParticipant($participant)], 201);
    }

    /** Auto-save berkala — dipanggil client tiap ~10 detik selama mengerjakan. */
    public function saveProgress(Request $request, Exam $exam): JsonResponse
    {
        $participant = $this->ownRunningParticipant($request, $exam);

        $data = $request->validate([
            'answers' => ['required', 'array'],
            'tab_switches' => ['required', 'integer', 'min:0'],
        ]);

        $participant->update([
            'answers' => $data['answers'],
            'tab_switches' => $data['tab_switches'],
            'last_saved_at' => now(),
        ]);

        return response()->json(['data' => $this->formatParticipant($participant)]);
    }

    /** Submit akhir — dihitung otomatis (skala 0-100), dipanggil manual atau auto saat waktu habis. */
    public function submit(Request $request, Exam $exam): JsonResponse
    {
        $participant = $this->ownRunningParticipant($request, $exam);

        $data = $request->validate([
            'answers' => ['required', 'array'],
            'tab_switches' => ['required', 'integer', 'min:0'],
        ]);

        $score = $this->calculateScore($exam, $data['answers']);

        $participant->update([
            'answers' => $data['answers'],
            'tab_switches' => $data['tab_switches'],
            'status' => 'selesai',
            'score' => $score,
            'last_saved_at' => now(),
            'submitted_at' => now(),
        ]);

        return response()->json(['data' => $this->formatParticipant($participant)]);
    }

    /** Guru/Admin monitoring — status, deteksi pindah tab, skor tiap siswa. */
    public function participants(Request $request, Exam $exam): JsonResponse
    {
        $this->authorizeTeacher($request, $exam->course);
        $participants = $exam->participants()->with('student:id,name')->get();

        return response()->json(['data' => $participants->map(fn (ExamParticipant $p) => $this->formatParticipant($p))]);
    }

    /**
     * Siswa lapor keluar dari mode fullscreen selama ujian berlangsung — dikunci
     * (bukan otomatis selesai), harus dibuka lagi oleh guru/admin (unlock) atau
     * diselesaikan paksa (forceFinish) memakai jawaban terakhir yang ke-auto-save.
     */
    public function lock(Request $request, Exam $exam): JsonResponse
    {
        $participant = $this->ownRunningParticipant($request, $exam);
        $participant->update(['status' => 'terkunci']);

        return response()->json(['data' => $this->formatParticipant($participant)]);
    }

    /** Guru pengampu/Admin buka kembali siswa yang terkunci — siswa lanjut mengerjakan. */
    public function unlock(Request $request, ExamParticipant $examParticipant): JsonResponse
    {
        $this->authorizeTeacher($request, $examParticipant->exam->course);
        if ($examParticipant->status !== 'terkunci') {
            throw ValidationException::withMessages(['status' => ['Peserta ini tidak sedang terkunci.']]);
        }
        $examParticipant->update(['status' => 'sedang']);

        return response()->json(['data' => $this->formatParticipant($examParticipant)]);
    }

    /** Guru pengampu/Admin selesaikan paksa — dinilai dari jawaban terakhir yang tersimpan (auto-save). */
    public function forceFinish(Request $request, ExamParticipant $examParticipant): JsonResponse
    {
        $this->authorizeTeacher($request, $examParticipant->exam->course);
        if (! in_array($examParticipant->status, ['terkunci', 'sedang'], true)) {
            throw ValidationException::withMessages(['status' => ['Peserta ini tidak sedang mengerjakan atau terkunci.']]);
        }

        $score = $this->calculateScore($examParticipant->exam, $examParticipant->answers ?? []);
        $examParticipant->update(['status' => 'selesai', 'score' => $score, 'submitted_at' => now()]);

        return response()->json(['data' => $this->formatParticipant($examParticipant)]);
    }

    private function calculateScore(Exam $exam, array $answers): int
    {
        $earned = 0;
        $total = 0;
        foreach ($exam->questions as $question) {
            $total += $question->points;
            if ($question->grade($answers[$question->id] ?? null)) {
                $earned += $question->points;
            }
        }

        return $total > 0 ? (int) round($earned / $total * 100) : 0;
    }

    private function ownRunningParticipant(Request $request, Exam $exam): ExamParticipant
    {
        $user = $request->user();
        $participant = ExamParticipant::where('exam_id', $exam->id)->where('student_id', $user->id)->first();

        if (! $participant || $participant->status !== 'sedang') {
            abort(403, 'Anda tidak sedang mengerjakan ujian ini.');
        }

        return $participant;
    }

    private function validated(Request $request, Course $course): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(['PTS', 'PAS', 'Ujian Harian', 'Tryout'])],
            'scheduled_at' => ['required', 'date'],
            'duration_min' => ['required', 'integer', 'min:1', 'max:300'],
            'question_ids' => ['required', 'array', 'min:1'],
            'question_ids.*' => ['required', 'integer', 'exists:questions,id'],
        ]);

        $subjectId = $course->teachingAssignment->subject_id;
        $questions = Question::whereIn('id', $data['question_ids'])->get();

        if ($questions->contains(fn (Question $q) => $q->subject_id !== $subjectId)) {
            throw ValidationException::withMessages(['question_ids' => ['Ada soal yang bukan dari mapel course ini.']]);
        }
        if ($questions->contains(fn (Question $q) => $q->type === 'essay')) {
            throw ValidationException::withMessages(['question_ids' => ['Ujian online cuma mendukung soal auto-grading (PG/Benar-Salah/Isian), tidak ada essay.']]);
        }

        return $data;
    }

    private function syncQuestions(Exam $exam, array $questionIds): void
    {
        $exam->questions()->sync(collect($questionIds)->mapWithKeys(fn ($id, $i) => [$id => ['order' => $i]]));
    }

    private function formatExam(Exam $exam, bool $includeAnswers): array
    {
        return [
            'id' => $exam->id,
            'course_id' => $exam->course_id,
            'title' => $exam->title,
            'type' => $exam->type,
            'scheduled_at' => $exam->scheduled_at->toIso8601String(),
            'duration_min' => $exam->duration_min,
            'status' => $exam->status,
            'questions' => $exam->questions->map(function (Question $q) use ($includeAnswers) {
                $row = [
                    'id' => $q->id,
                    'type' => $q->type,
                    'text' => $q->text,
                    'options' => $q->options,
                    'points' => $q->points,
                ];
                if ($includeAnswers) {
                    $row['answer'] = $q->answer;
                }

                return $row;
            })->values(),
        ];
    }

    private function formatParticipant(ExamParticipant $p): array
    {
        return [
            'student_id' => $p->student_id,
            'student_name' => $p->student?->name,
            'status' => $p->status,
            'answers' => $p->answers,
            'tab_switches' => $p->tab_switches,
            'score' => $p->score,
            'last_saved_at' => $p->last_saved_at?->toIso8601String(),
            'submitted_at' => $p->submitted_at?->toIso8601String(),
        ];
    }

    private function authorizeStudent(Request $request, Exam $exam): void
    {
        $user = $request->user();
        if (! $user->hasRole('siswa')) {
            abort(403, 'Hanya siswa yang bisa mengerjakan ujian.');
        }
        if ($user->studentProfile?->school_class_id !== $exam->course->teachingAssignment->school_class_id) {
            abort(403, 'Anda tidak terdaftar di kelas ujian ini.');
        }
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
        abort(403, 'Hanya guru pengampu atau Admin yang boleh mengubah ujian ini.');
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
        abort(403, 'Anda tidak punya akses ke ujian ini.');
    }
}
