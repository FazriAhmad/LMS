<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CapaianPembelajaran extends Model
{
    protected $fillable = ['subject_id', 'elemen', 'text', 'order'];

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function tujuanPembelajarans(): HasMany
    {
        return $this->hasMany(TujuanPembelajaran::class)->orderBy('order');
    }
}
