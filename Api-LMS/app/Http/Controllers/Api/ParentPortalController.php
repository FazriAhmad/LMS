<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\Course;
use App\Models\ScheduleItem;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ParentPortalController extends Controller
{
    /**
     * Menutup celah akses: sebelumnya ortu tidak punya jalur lihat jadwal & tugas anaknya sama
     * sekali (authorizeView di AssignmentController/ScheduleItemController/QuizController/dst
     * tidak punya cabang untuk role ortu). Nilai & presensi anak sudah bisa lewat
     * GET /grades/me dan GET /attendance/summary dengan ?student_id=, jadi tidak diduplikasi di sini.
     */
    public function children(Request $request): JsonResponse
    {
        $children = $request->user()->children()->with('studentProfile.schoolClass')->get();

        return response()->json(['data' => $children->map(fn (User $c) => [
            'student_id' => $c->id,
            'name' => $c->name,
            'nis' => $c->studentProfile?->nis,
            'class_name' => $c->studentProfile?->schoolClass?->name,
        ])]);
    }

    public function schedule(Request $request): JsonResponse
    {
        $child = $this->resolveChild($request);
        $classId = $child->studentProfile?->school_class_id;

        $items = ScheduleItem::with('teachingAssignment.subject', 'teachingAssignment.teacher:id,name')
            ->whereHas('teachingAssignment', fn ($q) => $q->where('school_class_id', $classId))
            ->orderBy('day')->orderBy('start_time')->get()
            ->map(fn (ScheduleItem $s) => [
                'day' => $s->day,
                'subject_name' => $s->teachingAssignment->subject->name,
                'teacher_name' => $s->teachingAssignment->teacher->name,
                'start_time' => substr($s->start_time, 0, 5),
                'end_time' => substr($s->end_time, 0, 5),
                'room' => $s->room,
            ]);

        return response()->json(['data' => $items]);
    }

    public function assignments(Request $request): JsonResponse
    {
        $child = $this->resolveChild($request);
        $courseIds = Course::whereHas('teachingAssignment', fn ($q) => $q->where('school_class_id', $child->studentProfile?->school_class_id))->pluck('id');

        $submissions = AssignmentSubmission::where('student_id', $child->id)
            ->whereIn('assignment_id', Assignment::whereIn('course_id', $courseIds)->pluck('id'))
            ->get()->keyBy('assignment_id');

        $assignments = Assignment::whereIn('course_id', $courseIds)->orderBy('deadline')->get()
            ->map(fn (Assignment $a) => [
                'id' => $a->id,
                'title' => $a->title,
                'deadline' => $a->deadline->toIso8601String(),
                'status' => $submissions[$a->id]->status ?? 'belum',
                'score' => $submissions[$a->id]->score ?? null,
            ]);

        return response()->json(['data' => $assignments]);
    }

    private function resolveChild(Request $request): User
    {
        $user = $request->user();
        $studentId = $request->integer('student_id');
        $child = $studentId ? $user->children()->where('users.id', $studentId)->first() : null;

        if (! $child) {
            abort(403, 'Anak tidak ditemukan atau tidak terhubung ke akun Anda.');
        }

        return $child->load('studentProfile');
    }
}
