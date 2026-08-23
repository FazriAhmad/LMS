<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CalendarEvent;
use App\Models\Exam;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Kalender Akademik — gabungan 2 sumber: event umum (libur/kegiatan/rapat/semester,
 * dikelola Admin) dan jadwal ujian nyata (tipe "ujian", diturunkan dari tabel exams,
 * bukan disimpan ulang di sini supaya gak ada dua sumber kebenaran buat tanggal ujian).
 */
class CalendarEventController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $events = CalendarEvent::orderBy('date')->get()->map(fn (CalendarEvent $e) => [
            'id' => "event-{$e->id}",
            'title' => $e->title,
            'date' => $e->date->toDateString(),
            'type' => $e->type,
        ]);

        $examQuery = Exam::with('course.teachingAssignment.subject', 'course.teachingAssignment.schoolClass');
        $this->scopeExamsToUser($request, $examQuery);

        $exams = $examQuery->get()->map(fn (Exam $ex) => [
            'id' => "exam-{$ex->id}",
            'title' => "{$ex->title} ({$ex->course->teachingAssignment->subject->name} · {$ex->course->teachingAssignment->schoolClass->name})",
            'date' => $ex->scheduled_at->toDateString(),
            'type' => 'ujian',
        ]);

        $all = $events->concat($exams)->sortBy('date')->values();

        return response()->json(['data' => $all]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'date' => ['required', 'date'],
            'type' => ['required', Rule::in(['libur', 'kegiatan', 'rapat', 'semester'])],
        ]);
        $data['created_by'] = $request->user()->id;

        $event = CalendarEvent::create($data);

        return response()->json(['data' => $event], 201);
    }

    public function destroy(Request $request, CalendarEvent $calendarEvent): JsonResponse
    {
        $this->authorizeAdmin($request);
        $calendarEvent->delete();

        return response()->json(['message' => 'Agenda dihapus.']);
    }

    /** Siswa/ortu cuma lihat ujian di kelasnya sendiri/anaknya; guru cuma yang diampu; staf lain lihat semua. */
    private function scopeExamsToUser(Request $request, $query): void
    {
        $user = $request->user();

        if ($user->hasRole('guru') || $user->hasRole('walikelas')) {
            $query->whereHas('course.teachingAssignment', fn ($q) => $q->where('teacher_id', $user->id));
        } elseif ($user->hasRole('siswa')) {
            $classId = $user->studentProfile?->school_class_id;
            $query->whereHas('course.teachingAssignment', fn ($q) => $q->where('school_class_id', $classId));
        } elseif ($user->hasRole('ortu')) {
            $classIds = $user->children()->with('studentProfile')->get()->pluck('studentProfile.school_class_id')->filter();
            $query->whereHas('course.teachingAssignment', fn ($q) => $q->whereIn('school_class_id', $classIds));
        }
        // admin/superadmin/kepsek: tanpa filter, lihat semua ujian.
    }

    private function authorizeAdmin(Request $request): void
    {
        if (! $request->user()->hasAnyRole(['superadmin', 'admin'])) {
            abort(403, 'Hanya Admin/Super Admin yang boleh mengelola agenda kalender.');
        }
    }
}
