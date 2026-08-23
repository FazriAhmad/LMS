<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tujuan_pembelajarans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('capaian_pembelajaran_id')->constrained('capaian_pembelajarans')->cascadeOnDelete();
            $table->string('code'); // mis. "TP 1.1"
            $table->text('text');
            $table->unsignedInteger('order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tujuan_pembelajarans');
    }
};
