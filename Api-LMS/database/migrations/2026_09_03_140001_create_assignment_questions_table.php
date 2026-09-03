<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Soal pada Tugas — memakai ulang bank soal (`questions`) yang sama dengan Quiz & Ujian,
     * bukan tabel soal baru. Jadi soal yang ditulis guru lewat form Tugas otomatis masuk bank
     * dan bisa dipakai lagi di quiz/ujian berikutnya, dan statistik bank soal ikut menghitungnya.
     *
     * Bedanya Tugas dengan Quiz: Tugas tidak punya timer/batas percobaan, cuma deadline —
     * jadi mesin pengerjaannya memang terpisah, tapi bank soal & auto-grading-nya dipakai bersama
     * (lihat Question::grade()).
     */
    public function up(): void
    {
        Schema::create('assignment_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assignment_id')->constrained('assignments')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('questions')->cascadeOnDelete();
            $table->unsignedInteger('order')->default(0);

            $table->unique(['assignment_id', 'question_id']);
        });

        // Jawaban siswa per soal, menempel pada baris pengumpulan yang sudah ada
        // (assignment_submissions) — bukan tabel "attempt" baru, karena Tugas hanya
        // punya satu pengumpulan per siswa (unique assignment_id+student_id).
        Schema::create('assignment_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assignment_submission_id')->constrained('assignment_submissions')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('questions')->cascadeOnDelete();
            $table->text('answer')->nullable();
            // null = soal esai, perlu dinilai guru secara manual
            $table->boolean('is_correct')->nullable();
            $table->timestamps();

            $table->unique(['assignment_submission_id', 'question_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assignment_answers');
        Schema::dropIfExists('assignment_questions');
    }
};
