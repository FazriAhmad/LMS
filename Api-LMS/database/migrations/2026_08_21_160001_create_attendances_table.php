<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            // Snapshot kelas saat presensi diambil — sengaja bukan derive dari student_profiles
            // supaya rekap historis tetap benar meski siswa pindah kelas belakangan.
            $table->foreignId('school_class_id')->constrained('school_classes')->cascadeOnDelete();
            $table->date('date');
            $table->string('status', 1); // H, I, S, A, T
            $table->string('notes')->nullable();
            $table->foreignId('recorded_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['student_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
