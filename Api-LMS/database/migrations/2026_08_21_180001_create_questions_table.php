<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->string('type'); // pg, tf, isian, essay
            $table->text('text');
            $table->json('options')->nullable(); // untuk pg/tf
            $table->string('answer')->nullable(); // kunci jawaban pg/tf/isian, null untuk essay
            $table->json('keywords')->nullable(); // kata kunci alternatif untuk isian
            $table->unsignedTinyInteger('points')->default(10);
            $table->string('difficulty')->default('Sedang'); // Mudah, Sedang, Sulit
            $table->string('kompetensi')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('questions');
    }
};
