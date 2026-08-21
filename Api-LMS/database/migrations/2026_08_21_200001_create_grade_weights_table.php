<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grade_weights', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subject_id')->unique()->constrained('subjects')->cascadeOnDelete();
            $table->unsignedTinyInteger('tugas')->default(25);
            $table->unsignedTinyInteger('quiz')->default(25);
            $table->unsignedTinyInteger('pts')->default(25);
            $table->unsignedTinyInteger('pas')->default(25);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grade_weights');
    }
};
