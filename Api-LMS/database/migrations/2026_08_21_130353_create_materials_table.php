<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('materials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_module_id')->constrained('course_modules')->cascadeOnDelete();
            $table->string('type'); // pdf, doc, ppt, image, video, youtube, link
            $table->string('title');
            $table->string('file_path')->nullable(); // untuk pdf/doc/ppt/image/video yang diunggah
            $table->unsignedBigInteger('file_size')->nullable(); // bytes
            $table->unsignedInteger('duration_seconds')->nullable(); // untuk video/youtube
            $table->string('url')->nullable(); // untuk type=link
            $table->string('youtube_id')->nullable(); // untuk type=youtube
            $table->unsignedInteger('order')->default(0);
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('materials');
    }
};
