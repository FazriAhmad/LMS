<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\QrAttendanceSession;
use App\Models\SchoolClass;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * QR attendance dinamis (Fase 3) — kode berotasi tiap 30 detik dari HMAC(secret, jendela-waktu),
 * bukan random murni di client seperti referensi Ui-LMS. Secret tidak pernah dikirim ke client,
 * cuma kode hasil turunannya — screenshot kode jadi percuma begitu jendela berikutnya lewat.
 */
class QrAttendanceController extends Controller
{
    /** Wali kelas/Admin buka sesi presensi QR untuk kelasnya, berlaku N menit (default 10). */
    public function store(Request $request, SchoolClass $schoolClass): JsonResponse
    {
        $this->authorizeRecorder($request, $schoolClass);

        $data = $request->validate(['duration_min' => ['nullable', 'integer', 'min:1', 'max:60']]);
        $duration = $data['duration_min'] ?? 10;

        $session = QrAttendanceSession::create([
            'school_class_id' => $schoolClass->id,
            'teacher_id' => $request->user()->id,
            'secret' => Str::random(40),
            'date' => now()->toDateString(),
            'expires_at' => now()->addMinutes($duration),
        ]);

        return response()->json(['data' => $this->formatSession($session)], 201);
    }

    /** Kode saat ini + sisa detik sebelum rotasi — dipoll berkala oleh layar guru buat ditampilkan. */
    public function show(Request $request, QrAttendanceSession $qrAttendanceSession): JsonResponse
    {
        $this->authorizeRecorder($request, $qrAttendanceSession->schoolClass);

        return response()->json(['data' => $this->formatSession($qrAttendanceSession)]);
    }

    /** Siswa scan kode dari layar kelas — menandai presensi Hadir hari ini. */
    public function scan(Request $request, QrAttendanceSession $qrAttendanceSession): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasRole('siswa')) {
            abort(403, 'Hanya siswa yang bisa scan presensi QR.');
        }
        if ($user->studentProfile?->school_class_id !== $qrAttendanceSession->school_class_id) {
            abort(403, 'Sesi QR ini bukan untuk kelas Anda.');
        }
        if (now()->greaterThan($qrAttendanceSession->expires_at)) {
            throw ValidationException::withMessages(['session' => ['Sesi presensi QR sudah berakhir.']]);
        }

        $data = $request->validate(['code' => ['required', 'string']]);
        if (! $qrAttendanceSession->isCodeValid($data['code'])) {
            throw ValidationException::withMessages(['code' => ['Kode tidak valid atau sudah kedaluwarsa — minta guru tunjukkan kode terbaru.']]);
        }

        $attendance = Attendance::updateOrCreate(
            ['student_id' => $user->id, 'date' => $qrAttendanceSession->date],
            [
                'school_class_id' => $qrAttendanceSession->school_class_id,
                'status' => 'H',
                'notes' => 'Scan QR',
                'recorded_by' => $qrAttendanceSession->teacher_id,
            ],
        );

        return response()->json(['data' => ['status' => $attendance->status, 'scanned_at' => now()->toIso8601String()]]);
    }

    private function formatSession(QrAttendanceSession $session): array
    {
        return [
            'id' => $session->id,
            'school_class_id' => $session->school_class_id,
            'code' => $session->currentCode(),
            'seconds_until_rotation' => $session->secondsUntilRotation(),
            'expires_at' => $session->expires_at->toIso8601String(),
            'active' => now()->lessThan($session->expires_at),
        ];
    }

    /** Sama seperti AttendanceController — wali kelas kelas tsb atau Admin/Super Admin. */
    private function authorizeRecorder(Request $request, SchoolClass $schoolClass): void
    {
        $user = $request->user();
        if ($user->hasRole('superadmin') || $user->hasRole('admin')) {
            return;
        }
        if ($user->hasRole('walikelas') && $user->id === $schoolClass->homeroom_teacher_id) {
            return;
        }
        abort(403, 'Hanya wali kelas atau Admin yang boleh mengelola presensi QR kelas ini.');
    }
}
