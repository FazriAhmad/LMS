<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClassMaterial;
use App\Models\SchoolClass;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Materi kelas — kanal unggah milik WALI KELAS, terpisah dari materi mapel (MaterialController).
 *
 * Pemisahan peran yang ditegakkan di sini:
 * - GURU mengurus materi mata pelajarannya lewat course/modul, bisa lintas kelas mana pun
 *   dia mengajar (MaterialController, otorisasi lewat teaching_assignment).
 * - WALI KELAS mengurus SATU kelas saja — kelas walinya — dan di sini cuma boleh PDF.
 *
 * Seorang guru bisa merangkap wali kelas; keduanya berjalan berdampingan karena
 * otorisasinya memang dicek dari sumber berbeda (teaching_assignment vs homeroom_teacher_id).
 */
class ClassMaterialController extends Controller
{
    /** Sesuai permintaan produk: wali kelas hanya boleh mengunggah PDF. */
    private const MAX_KB = 20000;

    public function index(Request $request): JsonResponse
    {
        $class = $this->resolveClass($request);

        $materials = ClassMaterial::where('school_class_id', $class->id)
            ->with('uploader:id,name')
            ->latest()
            ->get()
            ->map(fn (ClassMaterial $m) => $m->toApiArray());

        return response()->json([
            'data' => $materials,
            'school_class' => ['id' => $class->id, 'name' => $class->name],
            // Dipakai frontend buat memutuskan tampil/tidaknya form unggah.
            'can_upload' => $this->canManage($request, $class),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'school_class_id' => ['required', 'exists:school_classes,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            // Dicek dua lapis: `mimes` melihat ekstensi, `mimetypes` melihat isi file
            // sesungguhnya — supaya file lain yang diganti namanya jadi .pdf tetap ditolak.
            'file' => ['required', 'file', 'mimes:pdf', 'mimetypes:application/pdf', 'max:'.self::MAX_KB],
        ], [
            'file.mimes' => 'Materi kelas hanya boleh berkas PDF.',
            'file.mimetypes' => 'Materi kelas hanya boleh berkas PDF.',
        ]);

        $class = SchoolClass::findOrFail($data['school_class_id']);
        $this->authorizeManage($request, $class);

        $file = $request->file('file');
        $material = ClassMaterial::create([
            'school_class_id' => $class->id,
            'uploaded_by' => $request->user()->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'file_path' => $file->store('class-materials', 'public'),
            'file_size' => $file->getSize(),
        ]);

        return response()->json(['data' => $material->load('uploader:id,name')->toApiArray()], 201);
    }

    public function destroy(Request $request, ClassMaterial $classMaterial): JsonResponse
    {
        $this->authorizeManage($request, $classMaterial->schoolClass);

        Storage::disk('public')->delete($classMaterial->file_path);
        $classMaterial->delete();

        return response()->json(['message' => 'Materi kelas dihapus.']);
    }

    /**
     * Kelas mana yang sedang dilihat: wali kelas otomatis dapat kelas walinya, siswa dapat
     * kelasnya sendiri, staf sekolah wajib menyebut ?school_class_id=.
     */
    private function resolveClass(Request $request): SchoolClass
    {
        $user = $request->user();

        if ($request->filled('school_class_id')) {
            $class = SchoolClass::findOrFail($request->integer('school_class_id'));
        } elseif ($homeroom = SchoolClass::where('homeroom_teacher_id', $user->id)->first()) {
            $class = $homeroom;
        } elseif ($user->hasRole('siswa') && $user->studentProfile?->school_class_id) {
            $class = SchoolClass::findOrFail($user->studentProfile->school_class_id);
        } else {
            abort(404, 'Tidak ada kelas yang bisa ditampilkan. Sertakan school_class_id.');
        }

        $this->authorizeView($request, $class);

        return $class;
    }

    /** Yang boleh melihat: staf sekolah, wali kelasnya, dan siswa di kelas itu. */
    private function authorizeView(Request $request, SchoolClass $class): void
    {
        $user = $request->user();

        if ($user->hasAnyRole(['superadmin', 'admin', 'kepsek'])) {
            return;
        }
        if ($class->homeroom_teacher_id === $user->id) {
            return;
        }
        if ($user->hasRole('siswa') && $user->studentProfile?->school_class_id === $class->id) {
            return;
        }

        abort(403, 'Anda tidak punya akses ke materi kelas ini.');
    }

    /** Yang boleh mengunggah/menghapus: wali kelas kelas itu saja (plus Admin). */
    private function authorizeManage(Request $request, SchoolClass $class): void
    {
        $user = $request->user();

        if ($user->hasAnyRole(['superadmin', 'admin'])) {
            return;
        }
        if ($class->homeroom_teacher_id === $user->id) {
            return;
        }

        abort(403, 'Hanya wali kelas kelas ini yang boleh mengunggah materi kelas.');
    }

    private function canManage(Request $request, SchoolClass $class): bool
    {
        $user = $request->user();

        return $user->hasAnyRole(['superadmin', 'admin']) || $class->homeroom_teacher_id === $user->id;
    }
}
