<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Jabatan pengurus kelas (ketua/wakil/sekretaris/bendahara/keamanan) — ditunjuk wali kelas.
     * Kolom di student_profiles, bukan tabel terpisah: satu siswa cuma bisa pegang satu jabatan,
     * jadi cukup satu nilai per siswa.
     *
     * `unique(school_class_id, class_role)` mencegah dua siswa pegang jabatan yang sama di kelas
     * yang sama — di Postgres NULL tidak dianggap sama dengan NULL, jadi banyak siswa boleh
     * sama-sama tidak punya jabatan (class_role null) tanpa melanggar constraint ini.
     */
    public function up(): void
    {
        Schema::table('student_profiles', function (Blueprint $table) {
            $table->string('class_role')->nullable()->after('school_class_id');
            $table->unique(['school_class_id', 'class_role']);
        });
    }

    public function down(): void
    {
        Schema::table('student_profiles', function (Blueprint $table) {
            $table->dropUnique(['school_class_id', 'class_role']);
            $table->dropColumn('class_role');
        });
    }
};
