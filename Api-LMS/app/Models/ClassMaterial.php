<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class ClassMaterial extends Model
{
    protected $fillable = ['school_class_id', 'uploaded_by', 'title', 'description', 'file_path', 'file_size'];

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /** Pakai disk 'public' eksplisit — Storage::url() default menghasilkan URL tanpa host (lihat catatan bug di STATUS.md). */
    public function fileUrl(): string
    {
        return Storage::disk('public')->url($this->file_path);
    }

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

        return round($size, 1).' '.$units[$i];
    }

    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'school_class_id' => $this->school_class_id,
            'title' => $this->title,
            'description' => $this->description,
            'url' => $this->fileUrl(),
            'size' => $this->formattedSize(),
            'uploaded_by' => $this->uploaded_by,
            'uploader_name' => $this->uploader?->name,
            'created_at' => $this->created_at,
        ];
    }
}
