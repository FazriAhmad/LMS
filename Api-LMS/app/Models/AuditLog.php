<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

class AuditLog extends Model
{
    public $timestamps = false;

    protected $fillable = ['user_id', 'action', 'model', 'model_id', 'changes'];

    protected $casts = ['changes' => 'array', 'created_at' => 'datetime'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Dipanggil dari model event (lihat AppServiceProvider) — jangan panggil manual dari controller. */
    public static function record(string $action, Model $model, ?array $changes = null): void
    {
        self::create([
            'user_id' => Auth::id(),
            'action' => $action,
            'model' => class_basename($model),
            'model_id' => $model->getKey(),
            'changes' => $changes,
        ]);
    }
}
