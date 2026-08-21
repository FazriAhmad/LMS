<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\Attendance;
use App\Models\Course;
use App\Models\Grade;
use App\Models\ScheduleItem;
use App\Models\SchoolClass;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = match (true) {
            $user->hasRole('siswa') => $this->siswaDashboard($user),
            $user->hasRole('ortu') => $this->ortuDashboard($user),
            $user->hasRole('kepsek') => $this->kepsekDashboard(),
            $user->hasAnyRole(['guru', 'walikelas']) => $this->guruDashboard($user),
            $user->hasAnyRole(['admin', 'superadmin']) => $this->adminDashboard(),
            default => [],
        };

        return response()->json(['data' => $data]);
    }

    private function siswaDashboard(User $user): array
    {
        $classId = $user->studentProfile?->school_class_id;
        $courses = Course::with('teachingAssignment.subject')
            ->whereHas('teachingAssignment', fn ($q) => $q->where('school_class_id', $classId))
            ->get();
        $courseIds = $courses->pluck('id');

        $grades = Grade::where('student_id', $user->id)->whereIn('course_id', $courseIds)->get();
        $avg = $grades->isEmpty() ? 0 : (int) round($grades->sum(fn (Grade $g) => $g->finalScore()) / $grades->count());

        $assignments = Assignment::whereIn('course_id', $courseIds)->orderBy('deadline')->get();
        $mySubmissions = AssignmentSubmission::where('student_id', $user->id)
            ->whereIn('assignment_id', $assignments->pluck('id'))
            ->get()->keyBy('assignment_id');

        $deadlines = $assignments->map(fn (Assignment $a) => [
            'assignment_id' => $a->id,
            'title' => $a->title,
            'course_id' => $a->course_id,
            'deadline' => $a->deadline->toIso8601String(),
            'status' => $mySubmissions[$a->id]->status ?? 'belum',
        ]);

        $totalMaterials = \App\Models\Material::whereIn('course_module_id',
            \App\Models\CourseModule::whereIn('course_id', $courseIds)->pluck('id')
        )->pluck('id');
        $doneMaterials = \App\Models\MaterialProgress::where('student_id', $user->id)
            ->whereIn('material_id', $totalMaterials)->count();

        return [
            'student_name' => $user->name,
            'average_grade' => $avg,
            'attendance_pct' => $this->attendancePct(Attendance::where('student_id', $user->id)->get()),
            'assignments_pending' => $deadlines->whereIn('status', ['belum', 'revisi'])->count(),
            'materials_progress' => ['done' => $doneMaterials, 'total' => $totalMaterials->count()],
            'today_schedule' => $this->todaySchedule(fn ($q) => $q->where('school_class_id', $classId)),
            'upcoming_deadlines' => $deadlines->take(5)->values(),
            'recent_grades' => $grades->map(fn (Grade $g) => [
                'course_id' => $g->course_id,
                'subject_name' => $courses->firstWhere('id', $g->course_id)?->teachingAssignment->subject->name,
                'final' => $g->finalScore(),
                'letter' => $g->gradeLetter(),
            ])->values(),
        ];
    }

    private function guruDashboard(User $user): array
    {
        $courses = Course::with('teachingAssignment.subject', 'teachingAssignment.schoolClass')
            ->whereHas('teachingAssignment', fn ($q) => $q->where('teacher_id', $user->id))
            ->get();
        $courseIds = $courses->pluck('id');

        $assignmentIds = Assignment::whereIn('course_id', $courseIds)->pluck('id');
        $toGrade = AssignmentSubmission::with('student:id,name', 'assignment:id,title')
            ->whereIn('assignment_id', $assignmentIds)
            ->where('status', 'sudah')
            ->get();

        $result = [
            'teacher_name' => $user->name,
            'courses' => $courses->map(fn (Course $c) => [
                'course_id' => $c->id,
                'subject_name' => $c->teachingAssignment->subject->name,
                'class_name' => $c->teachingAssignment->schoolClass->name,
            ])->values(),
            'to_grade_count' => $toGrade->count(),
            'to_grade' => $toGrade->take(5)->map(fn (AssignmentSubmission $s) => [
                'student_name' => $s->student?->name,
                'assignment_title' => $s->assignment?->title,
            ])->values(),
            'today_schedule' => $this->todaySchedule(fn ($q) => $q->where('teacher_id', $user->id)),
        ];

        if ($user->hasRole('walikelas')) {
            $homeroom = SchoolClass::where('homeroom_teacher_id', $user->id)->first();
            if ($homeroom) {
                $students = User::role('siswa')
                    ->whereHas('studentProfile', fn ($q) => $q->where('school_class_id', $homeroom->id))
                    ->get(['id']);
                $studentAverages = $students->map(fn (User $s) => $this->studentAverage($s->id));

                $result['homeroom'] = [
                    'class_name' => $homeroom->name,
                    'student_count' => $students->count(),
                    'average_grade' => $studentAverages->isEmpty() ? 0 : (int) round($studentAverages->avg()),
                    'attendance_pct_today' => $this->attendancePct(
                        Attendance::where('school_class_id', $homeroom->id)->whereDate('date', today())->get()
                    ),
                ];
            }
        }

        return $result;
    }

    private function ortuDashboard(User $user): array
    {
        $children = $user->children()->with('studentProfile.schoolClass')->get();

        return [
            'children' => $children->map(function (User $child) {
                $courseIds = Course::whereHas('teachingAssignment', fn ($q) => $q->where('school_class_id', $child->studentProfile?->school_class_id))->pluck('id');
                $pendingAssignments = Assignment::whereIn('course_id', $courseIds)
                    ->whereDoesntHave('submissions', fn ($q) => $q->where('student_id', $child->id)->whereIn('status', ['sudah', 'dinilai']))
                    ->count();

                return [
                    'student_id' => $child->id,
                    'name' => $child->name,
                    'class_name' => $child->studentProfile?->schoolClass?->name,
                    'average_grade' => $this->studentAverage($child->id),
                    'attendance_pct' => $this->attendancePct(Attendance::where('student_id', $child->id)->get()),
                    'pending_assignments' => $pendingAssignments,
                ];
            })->values(),
        ];
    }

    private function kepsekDashboard(): array
    {
        $classes = SchoolClass::all();
        $classAverages = $classes->map(function (SchoolClass $c) {
            $studentIds = User::role('siswa')->whereHas('studentProfile', fn ($q) => $q->where('school_class_id', $c->id))->pluck('id');
            $averages = $studentIds->map(fn ($id) => $this->studentAverage($id));

            return [
                'class_id' => $c->id,
                'class_name' => $c->name,
                'average_grade' => $averages->isEmpty() ? 0 : (int) round($averages->avg()),
            ];
        });

        $allStudents = User::role('siswa')->with('studentProfile.schoolClass')->get();
        $lowPerformers = $allStudents->map(fn (User $s) => [
            'student_id' => $s->id,
            'name' => $s->name,
            'class_name' => $s->studentProfile?->schoolClass?->name,
            'average_grade' => $this->studentAverage($s->id),
        ])->filter(fn ($s) => $s['average_grade'] > 0 && $s['average_grade'] < 75)->sortBy('average_grade')->values();

        return [
            'total_students' => $allStudents->count(),
            'total_teachers' => User::role('guru')->count(),
            'class_averages' => $classAverages->values(),
            'low_performers' => $lowPerformers,
            'attendance_today' => $this->statusCounts(Attendance::whereDate('date', today())->get()),
        ];
    }

    private function adminDashboard(): array
    {
        return [
            'total_students' => User::role('siswa')->count(),
            'total_teachers' => User::role('guru')->count(),
            'total_classes' => SchoolClass::count(),
            'total_subjects' => \App\Models\Subject::count(),
            'attendance_today_pct' => $this->attendancePct(Attendance::whereDate('date', today())->get()),
            'assignments_total' => Assignment::count(),
            'submissions_collected' => AssignmentSubmission::whereIn('status', ['sudah', 'dinilai', 'revisi'])->count(),
            'submissions_pending_grade' => AssignmentSubmission::where('status', 'sudah')->count(),
        ];
    }

    private function studentAverage(int $studentId): int
    {
        $grades = Grade::where('student_id', $studentId)->get();

        return $grades->isEmpty() ? 0 : (int) round($grades->sum(fn (Grade $g) => $g->finalScore()) / $grades->count());
    }

    private function attendancePct(Collection $attendances): int
    {
        $total = $attendances->count();
        if (! $total) {
            return 0;
        }
        $present = $attendances->whereIn('status', ['H', 'T'])->count();

        return (int) round($present / $total * 100);
    }

    private function statusCounts(Collection $attendances): array
    {
        return [
            'hadir' => $attendances->where('status', 'H')->count(),
            'izin' => $attendances->where('status', 'I')->count(),
            'sakit' => $attendances->where('status', 'S')->count(),
            'alpa' => $attendances->where('status', 'A')->count(),
            'terlambat' => $attendances->where('status', 'T')->count(),
        ];
    }

    /** Jadwal hari ini (0=Senin..6=Minggu, sama seperti ScheduleItem). */
    private function todaySchedule(\Closure $scopeTeachingAssignment): array
    {
        $today = (Carbon::now()->dayOfWeekIso - 1) % 7;

        return ScheduleItem::with('teachingAssignment.subject', 'teachingAssignment.teacher:id,name', 'teachingAssignment.schoolClass')
            ->where('day', $today)
            ->whereHas('teachingAssignment', $scopeTeachingAssignment)
            ->orderBy('start_time')
            ->get()
            ->map(fn (ScheduleItem $s) => [
                'subject_name' => $s->teachingAssignment->subject->name,
                'class_name' => $s->teachingAssignment->schoolClass->name,
                'teacher_name' => $s->teachingAssignment->teacher->name,
                'start_time' => substr($s->start_time, 0, 5),
                'end_time' => substr($s->end_time, 0, 5),
                'room' => $s->room,
            ])->values()->all();
    }
}
