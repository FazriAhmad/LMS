<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Question extends Model
{
    protected $fillable = [
        'subject_id', 'type', 'text', 'options', 'answer', 'keywords',
        'points', 'difficulty', 'kompetensi', 'created_by',
    ];

    protected $casts = [
        'options' => 'array',
        'keywords' => 'array',
    ];

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    private function normalize(string $s): string
    {
        return preg_replace('/\s+/', ' ', trim(mb_strtolower($s)));
    }

    /** true/false = auto-grading, null = essay (perlu dinilai manual). */
    public function grade(?string $answer): ?bool
    {
        if ($answer === null || $answer === '') {
            return $this->type === 'essay' ? null : false;
        }

        if ($this->type === 'pg' || $this->type === 'tf') {
            return $answer === $this->answer;
        }

        if ($this->type === 'isian') {
            $normalized = $this->normalize($answer);
            if ($this->normalize((string) $this->answer) === $normalized) {
                return true;
            }

            return collect($this->keywords ?? [])->contains(fn ($k) => str_contains($normalized, $this->normalize($k)));
        }

        return null; // essay
    }
}
