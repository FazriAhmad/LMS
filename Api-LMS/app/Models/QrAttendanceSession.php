<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QrAttendanceSession extends Model
{
    /** Kode berotasi tiap 30 detik, sesuai PRD modul 11 (QR attendance dinamis). */
    public const ROTATE_SECONDS = 30;

    protected $fillable = ['school_class_id', 'teacher_id', 'secret', 'date', 'expires_at'];

    protected $casts = ['expires_at' => 'datetime'];

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class);
    }

    /** Kode 6 karakter untuk jendela waktu saat ini (atau jendela tertentu, buat verifikasi). */
    public function codeForWindow(int $window): string
    {
        return strtoupper(substr(hash_hmac('sha256', (string) $window, $this->secret), 0, 6));
    }

    public function currentCode(): string
    {
        return $this->codeForWindow(intdiv(time(), self::ROTATE_SECONDS));
    }

    public function secondsUntilRotation(): int
    {
        return self::ROTATE_SECONDS - (time() % self::ROTATE_SECONDS);
    }

    /** Terima kode dari jendela sekarang ATAU sebelumnya — toleransi jeda scan/network. */
    public function isCodeValid(string $code): bool
    {
        $current = intdiv(time(), self::ROTATE_SECONDS);
        $code = strtoupper($code);

        return $code === $this->codeForWindow($current) || $code === $this->codeForWindow($current - 1);
    }
}
