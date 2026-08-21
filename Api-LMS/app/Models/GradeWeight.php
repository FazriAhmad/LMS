<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GradeWeight extends Model
{
    public const DEFAULT = ['tugas' => 25, 'quiz' => 25, 'pts' => 25, 'pas' => 25];

    protected $fillable = ['subject_id', 'tugas', 'quiz', 'pts', 'pas'];

    private static array $cache = [];

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    /** Bobot per mapel dalam persen (0-100), jatuh ke default 25/25/25/25 kalau sekolah belum atur. */
    public static function forSubject(int $subjectId): array
    {
        if (! array_key_exists($subjectId, self::$cache)) {
            $row = self::where('subject_id', $subjectId)->first();
            self::$cache[$subjectId] = $row
                ? ['tugas' => $row->tugas, 'quiz' => $row->quiz, 'pts' => $row->pts, 'pas' => $row->pas]
                : self::DEFAULT;
        }

        return self::$cache[$subjectId];
    }
}
