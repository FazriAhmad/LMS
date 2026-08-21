<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExamParticipant extends Model
{
    protected $fillable = [
        'exam_id', 'student_id', 'status', 'answers', 'tab_switches',
        'score', 'last_saved_at', 'submitted_at',
    ];

    protected $casts = [
        'answers' => 'array',
        'last_saved_at' => 'datetime',
        'submitted_at' => 'datetime',
    ];

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }
}
