<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Grade;
use App\Models\SchoolClass;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Laporan (modul 16) — diproses langsung/sync (keputusan produk), bukan lewat
 * background job seperti disarankan PRD. Untuk skala satu sekolah ini cukup cepat;
 * gampang dipindah ke Laravel Queue nanti kalau laporan mulai berat/lambat.
 * Export CSV native PHP (bukan Excel/PDF asli) — cukup buat "export ke Excel" karena
 * CSV terbuka mulus di Excel, tanpa nambah dependency maatwebsite/excel atau dompdf.
 */
class ReportController extends Controller
{
    public function grades(Request $request): JsonResponse|StreamedResponse
    {
        $this->authorizeStaff($request);
        $data = $request->validate([
            'school_class_id' => ['nullable', 'exists:school_classes,id'],
            'subject_id' => ['nullable', 'exists:subjects,id'],
        ]);

        $grades = Grade::with(['student:id,name', 'course.teachingAssignment.subject', 'course.teachingAssignment.schoolClass'])
            ->whereHas('course.teachingAssignment', function ($q) use ($data) {
                $q->when($data['school_class_id'] ?? null, fn ($q2, $id) => $q2->where('school_class_id', $id))
                    ->when($data['subject_id'] ?? null, fn ($q2, $id) => $q2->where('subject_id', $id));
            })->get();

        $rows = $grades->map(fn (Grade $g) => [
            'siswa' => $g->student->name,
            'kelas' => $g->course->teachingAssignment->schoolClass->name,
            'mapel' => $g->course->teachingAssignment->subject->name,
            'tugas' => $g->tugas, 'quiz' => $g->quiz, 'pts' => $g->pts, 'pas' => $g->pas,
            'nilai_akhir' => $g->finalScore(), 'grade' => $g->gradeLetter(),
        ]);

        return $this->respond($request, $rows, 'laporan-nilai');
    }

    public function attendance(Request $request): JsonResponse|StreamedResponse
    {
        $this->authorizeStaff($request);
        $data = $request->validate([
            'school_class_id' => ['nullable', 'exists:school_classes,id'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $records = Attendance::with(['student:id,name', 'schoolClass:id,name'])
            ->when($data['school_class_id'] ?? null, fn ($q, $id) => $q->where('school_class_id', $id))
            ->when($data['from'] ?? null, fn ($q, $d) => $q->whereDate('date', '>=', $d))
            ->when($data['to'] ?? null, fn ($q, $d) => $q->whereDate('date', '<=', $d))
            ->get()->groupBy('student_id');

        $rows = $records->map(function (Collection $rows) {
            $counts = ['H' => 0, 'I' => 0, 'S' => 0, 'A' => 0, 'T' => 0];
            foreach ($rows as $r) {
                $counts[$r->status]++;
            }
            $total = array_sum($counts);
            $pct = $total > 0 ? round(($counts['H'] + $counts['T']) / $total * 100) : 0;

            return [
                'siswa' => $rows->first()->student->name,
                'kelas' => $rows->first()->schoolClass->name,
                'hadir' => $counts['H'], 'izin' => $counts['I'], 'sakit' => $counts['S'],
                'alpa' => $counts['A'], 'terlambat' => $counts['T'], 'persen_kehadiran' => $pct,
            ];
        })->values();

        return $this->respond($request, $rows, 'laporan-presensi');
    }

    /** Performa kelas: rata-rata nilai & kehadiran per kelas — gabungan buat kebutuhan Kepala Sekolah. */
    public function classPerformance(Request $request): JsonResponse|StreamedResponse
    {
        $this->authorizeStaff($request);

        $rows = SchoolClass::all()->map(function (SchoolClass $c) {
            $studentIds = User::role('siswa')->whereHas('studentProfile', fn ($q) => $q->where('school_class_id', $c->id))->pluck('id');

            $avgGrade = Grade::whereIn('student_id', $studentIds)->get();
            $avgGradeScore = $avgGrade->isEmpty() ? 0 : (int) round($avgGrade->sum(fn (Grade $g) => $g->finalScore()) / $avgGrade->count());

            $attendances = Attendance::whereIn('student_id', $studentIds)->get();
            $total = $attendances->count();
            $present = $attendances->whereIn('status', ['H', 'T'])->count();
            $avgAttendance = $total > 0 ? round($present / $total * 100) : 0;

            return [
                'kelas' => $c->name,
                'jumlah_siswa' => $studentIds->count(),
                'rata_rata_nilai' => $avgGradeScore,
                'rata_rata_kehadiran' => $avgAttendance,
            ];
        });

        return $this->respond($request, $rows, 'laporan-performa-kelas');
    }

    private function authorizeStaff(Request $request): void
    {
        if (! $request->user()->hasAnyRole(['guru', 'walikelas', 'admin', 'superadmin', 'kepsek'])) {
            abort(403, 'Laporan hanya untuk staf sekolah.');
        }
    }

    private function respond(Request $request, Collection $rows, string $filename): JsonResponse|StreamedResponse
    {
        if ($request->query('format') !== 'csv') {
            return response()->json(['data' => $rows->values()]);
        }

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fputs($out, "\xEF\xBB\xBF");
            if ($rows->isNotEmpty()) {
                fputcsv($out, array_keys($rows->first()));
            }
            foreach ($rows as $row) {
                fputcsv($out, $row);
            }
            fclose($out);
        }, "{$filename}.csv", ['Content-Type' => 'text/csv']);
    }
}
