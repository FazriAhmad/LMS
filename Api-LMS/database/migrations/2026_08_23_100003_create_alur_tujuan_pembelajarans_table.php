<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alur_tujuan_pembelajarans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tujuan_pembelajaran_id')->constrained('tujuan_pembelajarans')->cascadeOnDelete();
            $table->string('code'); // mis. "ATP 1.1.1"
            $table->text('text');
            $table->unsignedInteger('order')->default(0);
            // Tautan opsional ke Course — biar guru bisa memetakan asesmen ke ATP ini.
            $table->foreignId('course_id')->nullable()->constrained('courses')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alur_tujuan_pembelajarans');
    }
};
