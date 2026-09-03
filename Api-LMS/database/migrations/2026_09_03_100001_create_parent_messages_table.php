<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Percakapan ortu <-> wali kelas. Sengaja TIDAK ada tabel "conversations":
     * satu percakapan selalu identik dengan satu siswa, dan pesertanya diturunkan
     * dari data yang sudah ada (orang tua lewat pivot parent_student, wali kelas
     * lewat school_classes.homeroom_teacher_id) — jadi tidak ada daftar peserta
     * yang perlu disinkronkan waktu siswa pindah kelas atau ganti wali kelas.
     */
    public function up(): void
    {
        Schema::create('parent_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();

            $table->index(['student_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parent_messages');
    }
};
