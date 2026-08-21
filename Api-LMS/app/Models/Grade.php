<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Grade extends Model
{
    /** Bobot nilai akhir — sama seperti referensi Ui-LMS (src/lib/utils.ts WEIGHTS). */
    public const WEIGHTS = ['tugas' => 0.25, 'quiz' => 0.25, 'pts' => 0.25, 'pas' => 0.25];

    protected $fillable = ['student_id', 'course_id', 'tugas', 'quiz', 'pts', 'pas', 'feedback'];

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function finalScore(): int
    {
        return (int) round(
            $this->tugas * self::WEIGHTS['tugas']
            + $this->quiz * self::WEIGHTS['quiz']
            + $this->pts * self::WEIGHTS['pts']
            + $this->pas * self::WEIGHTS['pas']
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
