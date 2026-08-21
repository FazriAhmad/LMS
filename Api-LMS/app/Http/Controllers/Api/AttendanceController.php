<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\SchoolClass;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AttendanceController extends Controller
{
    private const STATUSES = ['H', 'I', 'S', 'A', 'T'];

    /** Wali kelas simpan/ubah presensi satu kelas untuk satu tanggal (upsert per siswa). */
    public function store(Request $request, SchoolClass $schoolClass): JsonResponse
    {
        $this->authorizeRecorder($request, $schoolClass);

        $data = $request->validate([
            'date' => ['required', 'date'],
            'records' => ['required', 'array', 'min:1'],
            'records.*.student_id' => ['required', 'exists:users,id'],
            'records.*.status' => ['required', Rule::in(self::STATUSES)],
            'records.*.notes' => ['nullable', 'string', 'max:255'],
        ]);

        foreach ($data['records'] as $record) {
            Attendance::updateOrCreate(
                ['student_id' => $record['student_id'], 'date' => $data['date']],
                [
                    'school_class_id' => $schoolClass->id,
                    'status' => $record['status'],
                    'notes' => $record['notes'] ?? null,
                    'recorded_by' => $request->user()->id,
                ],
            );
        }

        return response()->json(['data' => $this->formatList($schoolClass, $data['date'])]);
    }

    /** Daftar presensi satu kelas pada satu tanggal — dipakai tab Input Presensi. */
    public function index(Request $request, SchoolClass $schoolClass): JsonResponse
    {
        $this->authorizeRecorder($request, $schoolClass);

        $date = $request->validate(['date' => ['required', 'date']])['date'];

        return response()->json(['data' => $this->formatList($schoolClass, $date)]);
    }

    /** Rekap jumlah H/I/S/A/T per siswa dalam rentang tanggal (default semua data). */
    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'student_id' => ['nullable', 'exists:users,id'],
            'school_class_id' => ['nullable', 'exists:school_classes,id'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        if ($user->hasRole('siswa')) {
            $data['student_id'] = $user->id;
        } elseif ($user->hasRole('ortu')) {
            $childIds = $user->children()->pluck('users.id');
            if (! $data['student_id'] || ! $childIds->contains($data['student_id'])) {
                abort(403, 'Hanya bisa lihat rekap presensi anak sendiri.');
            }
        } elseif (! $user->hasAnyRole(['guru', 'walikelas', 'admin', 'superadmin', 'kepsek'])) {
            abort(403, 'Tidak punya akses ke rekap presensi.');
        }

        $query = Attendance::query()
            ->when($data['student_id'] ?? null, fn ($q, $id) => $q->where('student_id', $id))
            ->when($data['school_class_id'] ?? null, fn ($q, $id) => $q->where('school_class_id', $id))
            ->when($data['from'] ?? null, fn ($q, $d) => $q->whereDate('date', '>=', $d))
            ->when($data['to'] ?? null, fn ($q, $d) => $q->whereDate('date', '<=', $d));

        $rows = $query->selectRaw('student_id, status, count(*) as total')
            ->groupBy('student_id', 'status')
            ->get()
            ->groupBy('student_id');

        $studentIds = $rows->keys();
        $names = User::whereIn('id', $studentIds)->pluck('name', 'id');

        $summary = $studentIds->map(function ($studentId) use ($rows, $names) {
            $counts = array_fill_keys(self::STATUSES, 0);
            foreach ($rows[$studentId] as $row) {
                $counts[$row->status] = $row->total;
            }

            return [
                'student_id' => $studentId,
                'student_name' => $names[$studentId] ?? null,
                'hadir' => $counts['H'],
                'izin' => $counts['I'],
                'sakit' => $counts['S'],
                'alpa' => $counts['A'],
                'terlambat' => $counts['T'],
            ];
        })->values();

        return response()->json(['data' => $summary]);
    }

    private function formatList(SchoolClass $schoolClass, string $date): array
    {
        $recorded = Attendance::where('school_class_id', $schoolClass->id)
            ->where('date', $date)
            ->get()
            ->keyBy('student_id');

        $students = User::role('siswa')
            ->whereHas('studentProfile', fn ($q) => $q->where('school_class_id', $schoolClass->id))
            ->get(['id', 'name']);

        return $students->map(fn (User $s) => [
            'student_id' => $s->id,
            'student_name' => $s->name,
            'status' => $recorded[$s->id]->status ?? null,
            'notes' => $recorded[$s->id]->notes ?? null,
        ])->values()->all();
    }

    /** Presensi harian dicatat wali kelasnya sendiri, atau Admin/Super Admin. */
    private function authorizeRecorder(Request $request, SchoolClass $schoolClass): void
    {
        $user = $request->user();
        if ($user->hasRole('superadmin') || $user->hasRole('admin')) {
            return;
        }
        if ($user->hasRole('walikelas') && $user->id === $schoolClass->homeroom_teacher_id) {
            return;
        }
        abort(403, 'Hanya wali kelas atau Admin yang boleh mengelola presensi kelas ini.');
    }
}
