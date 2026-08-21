<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Menandai materi mana yang sudah dibuka/diselesaikan siswa — dasar dari
        // "Progress belajar" (modul 04) & "Materi selesai" (modul 13).
        Schema::create('material_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('material_id')->constrained('materials')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('completed_at');
            $table->timestamps();
            $table->unique(['material_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('material_progress');
    }
};
