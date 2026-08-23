<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Material extends Model
{
    protected $fillable = [
        'course_module_id', 'type', 'title', 'file_path', 'file_size',
        'duration_seconds', 'url', 'youtube_id', 'order', 'uploaded_by',
    ];

    public function courseModule(): BelongsTo
    {
        return $this->belongsTo(CourseModule::class, 'course_module_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function progress(): HasMany
    {
        return $this->hasMany(MaterialProgress::class);
    }

    public function fileUrl(): ?string
    {
        return $this->file_path ? Storage::disk('public')->url($this->file_path) : null;
    }

    /** Ukuran file dalam format terbaca manusia, mis. "2.4 MB". */
    public function formattedSize(): ?string
    {
        if (! $this->file_size) {
            return null;
        }
        $units = ['B', 'KB', 'MB', 'GB'];
        $size = $this->file_size;
        $i = 0;
        while ($size >= 1024 && $i < count($units) - 1) {
            $size /= 1024;
            $i++;
        }

        return round($size, 1) . ' ' . $units[$i];
    }

    /** Durasi video dalam format mm:ss. */
    public function formattedDuration(): ?string
    {
        if (! $this->duration_seconds) {
            return null;
        }

        return sprintf('%d:%02d', intdiv($this->duration_seconds, 60), $this->duration_seconds % 60);
    }

    /** Bentuk response API konsisten — dipakai MaterialController & CourseController::show. */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'course_module_id' => $this->course_module_id,
            'type' => $this->type,
            'title' => $this->title,
            'url' => $this->file_path ? $this->fileUrl() : $this->url,
            'youtube_id' => $this->youtube_id,
            'size' => $this->formattedSize(),
            'duration' => $this->formattedDuration(),
            'order' => $this->order,
        ];
    }
}
