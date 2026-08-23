<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TujuanPembelajaran extends Model
{
    protected $fillable = ['capaian_pembelajaran_id', 'code', 'text', 'order'];

    public function capaianPembelajaran(): BelongsTo
    {
        return $this->belongsTo(CapaianPembelajaran::class);
    }

    public function alurTujuanPembelajarans(): HasMany
    {
        return $this->hasMany(AlurTujuanPembelajaran::class)->orderBy('order');
    }
}
