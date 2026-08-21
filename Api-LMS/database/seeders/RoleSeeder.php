<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    /** Tujuh peran sesuai PRD & referensi UI — jangan diubah tanpa menyesuaikan frontend. */
    public const ROLES = ['superadmin', 'admin', 'kepsek', 'guru', 'walikelas', 'siswa', 'ortu'];

    public function run(): void
    {
        foreach (self::ROLES as $role) {
            Role::findOrCreate($role, 'web');
        }
    }
}
