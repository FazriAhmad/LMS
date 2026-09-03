<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Assignment extends Model
{
    protected $fillable = [
        'course_id', 'title', 'description', 'deadline', 'attachments', 'rubric', 'created_by',
    ];

    protected $casts = [
        'deadline' => 'datetime',
        'attachments' => 'array',
        'rubric' => 'array',
    ];

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(AssignmentSubmission::class);
    }

    /** Soal tugas — memakai bank soal yang sama dengan Quiz & Ujian. Tugas boleh tanpa soal (sekadar unggah berkas). */
    public function questions(): BelongsToMany
    {
        return $this->belongsToMany(Question::class, 'assignment_questions')
            ->withPivot('order')
            ->orderBy('assignment_questions.order');
    }
}
