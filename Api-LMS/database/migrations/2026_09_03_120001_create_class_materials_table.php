<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Materi yang diunggah WALI KELAS untuk kelas walinya — sengaja tabel terpisah dari
     * `materials`, bukan menumpang di sana. Alasannya beda ruang lingkup: `materials`
     * terikat ke course (satu mapel, bisa lintas kelas, dikelola guru pengampu), sedangkan
     * ini terikat ke satu kelas dan tidak punya mapel. Menumpangkan keduanya berarti
     * `course_module_id` harus nullable dan setiap query materi yang sudah ada harus
     * ikut menyaring kasus baru ini.
     */
    public function up(): void
    {
        Schema::create('class_materials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_class_id')->constrained('school_classes')->cascadeOnDelete();
            $table->foreignId('uploaded_by')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('file_path');
            $table->unsignedBigInteger('file_size')->nullable();
            $table->timestamps();

            $table->index(['school_class_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_materials');
    }
};
