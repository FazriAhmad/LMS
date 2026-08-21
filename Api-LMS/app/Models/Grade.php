<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Grade extends Model
{
    protected $fillable = ['student_id', 'course_id', 'tugas', 'quiz', 'pts', 'pas', 'feedback'];

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /** Bobot dipakai per mapel (modul 10 Fase 2) — default 25/25/25/25 kalau sekolah belum atur. */
    public function weights(): array
    {
        return GradeWeight::forSubject($this->course->teachingAssignment->subject_id);
    }

    public function finalScore(): int
    {
        $w = $this->weights();

        return (int) round(
            $this->tugas * $w['tugas'] / 100
            + $this->quiz * $w['quiz'] / 100
            + $this->pts * $w['pts'] / 100
            + $this->pas * $w['pas'] / 100
        );
    }

    public function gradeLetter(): string
    {
        $score = $this->finalScore();

        return match (true) {
            $score >= 90 => 'A',
            $score >= 80 => 'B',
            $score >= 70 => 'C',
            default => 'D',
        };
    }
}
