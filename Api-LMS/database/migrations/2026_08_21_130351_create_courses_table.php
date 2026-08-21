<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Satu Course = satu mapel untuk satu kelas — dibangun di atas penugasan
        // mengajar yang sudah ada (teaching_assignments), bukan salinan terpisah,
        // supaya guru pengampu tidak pernah bisa berbeda antara dua tempat.
        Schema::create('courses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teaching_assignment_id')->unique()->constrained('teaching_assignments')->cascadeOnDelete();
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('courses');
    }
};
