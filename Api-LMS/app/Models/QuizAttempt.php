<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QuizAttempt extends Model
{
    protected $fillable = [
        'quiz_id', 'student_id', 'auto_score', 'max_auto', 'essay_score',
        'total_points', 'essay_pending_count', 'submitted_at',
    ];

    protected $casts = ['submitted_at' => 'datetime'];

    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Quiz::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(QuizAttemptAnswer::class);
    }

    /** Nilai akhir: auto_score + essay_score (0 selama essay belum dinilai). */
    public function finalScore(): int
    {
        return $this->auto_score + ($this->essay_score ?? 0);
    }
}
