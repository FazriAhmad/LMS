<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Exam extends Model
{
    protected $fillable = ['course_id', 'title', 'type', 'scheduled_at', 'duration_min', 'status', 'created_by'];

    protected $casts = ['scheduled_at' => 'datetime'];

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function questions(): BelongsToMany
    {
        return $this->belongsToMany(Question::class, 'exam_questions')->withPivot('order')->orderBy('exam_questions.order');
    }

    public function participants(): HasMany
    {
        return $this->hasMany(ExamParticipant::class);
    }
}
