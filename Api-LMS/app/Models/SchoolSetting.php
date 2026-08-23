<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class SchoolSetting extends Model
{
    protected $fillable = ['name', 'short_name', 'npsn', 'address', 'email', 'phone', 'logo_path', 'storage_quota_mb'];

    /** Singleton — selalu baris id=1, dibuat otomatis kalau belum ada. */
    public static function current(): self
    {
        return self::firstOrCreate(['id' => 1], ['name' => 'Sekolah']);
    }

    public function logoUrl(): ?string
    {
        return $this->logo_path ? Storage::disk('public')->url($this->logo_path) : null;
    }
}
