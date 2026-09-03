<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentProfile extends Model
{
    protected $fillable = ['user_id', 'nis', 'gender', 'school_class_id', 'class_role'];

    /** Jabatan pengurus kelas yang boleh ditunjuk wali kelas — sesuai permintaan produk. */
    public const CLASS_ROLES = ['ketua_kelas', 'wakil_ketua', 'sekretaris', 'bendahara', 'keamanan'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class);
    }
}
