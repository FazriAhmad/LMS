<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AlurTujuanPembelajaran;
use App\Models\CapaianPembelajaran;
use App\Models\TujuanPembelajaran;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Kurikulum Merdeka: CP (Capaian Pembelajaran) -> TP (Tujuan Pembelajaran) -> ATP
 * (Alur Tujuan Pembelajaran), tiap ATP bisa ditautkan opsional ke Course. Struktur
 * 3 level ini disimpan sebagai 3 tabel relasional (bukan JSON) karena ATP butuh FK
 * nullable ke course dan tiap level punya kode sendiri yang perlu di-query/diurutkan.
 */
class CurriculumController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = CapaianPembelajaran::with(['subject', 'tujuanPembelajarans.alurTujuanPembelajarans.course.teachingAssignment.subject', 'tujuanPembelajarans.alurTujuanPembelajarans.course.teachingAssignment.schoolClass'])
            ->orderBy('order');

        if ($request->filled('subject_id')) {
            $query->where('subject_id', $request->integer('subject_id'));
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject_id' => ['required', 'exists:subjects,id'],
            'elemen' => ['required', 'string', 'max:255'],
            'text' => ['required', 'string'],
        ]);
        $this->authorizeSubject($request, $data['subject_id']);

        $data['order'] = CapaianPembelajaran::where('subject_id', $data['subject_id'])->max('order') + 1;
        $cp = CapaianPembelajaran::create($data);

        return response()->json(['data' => $cp->load('subject')], 201);
    }

    public function update(Request $request, CapaianPembelajaran $capaian): JsonResponse
    {
        $this->authorizeSubject($request, $capaian->subject_id);

        $data = $request->validate([
            'elemen' => ['sometimes', 'required', 'string', 'max:255'],
            'text' => ['sometimes', 'required', 'string'],
        ]);
        $capaian->update($data);

        return response()->json(['data' => $capaian]);
    }

    public function destroy(Request $request, CapaianPembelajaran $capaian): JsonResponse
    {
        $this->authorizeSubject($request, $capaian->subject_id);
        $capaian->delete();

        return response()->json(['message' => 'Capaian Pembelajaran dihapus.']);
    }

    public function storeTp(Request $request, CapaianPembelajaran $capaian): JsonResponse
    {
        $this->authorizeSubject($request, $capaian->subject_id);

        $data = $request->validate([
            'code' => ['required', 'string', 'max:50'],
            'text' => ['required', 'string'],
        ]);
        $data['capaian_pembelajaran_id'] = $capaian->id;
        $data['order'] = $capaian->tujuanPembelajarans()->max('order') + 1;

        $tp = TujuanPembelajaran::create($data);

        return response()->json(['data' => $tp], 201);
    }

    public function updateTp(Request $request, TujuanPembelajaran $tp): JsonResponse
    {
        $this->authorizeSubject($request, $tp->capaianPembelajaran->subject_id);

        $data = $request->validate([
            'code' => ['sometimes', 'required', 'string', 'max:50'],
            'text' => ['sometimes', 'required', 'string'],
        ]);
        $tp->update($data);

        return response()->json(['data' => $tp]);
    }

    public function destroyTp(Request $request, TujuanPembelajaran $tp): JsonResponse
    {
        $this->authorizeSubject($request, $tp->capaianPembelajaran->subject_id);
        $tp->delete();

        return response()->json(['message' => 'Tujuan Pembelajaran dihapus.']);
    }

    public function storeAtp(Request $request, TujuanPembelajaran $tp): JsonResponse
    {
        $this->authorizeSubject($request, $tp->capaianPembelajaran->subject_id);

        $data = $request->validate([
            'code' => ['required', 'string', 'max:50'],
            'text' => ['required', 'string'],
            'course_id' => ['nullable', 'exists:courses,id'],
        ]);
        $data['tujuan_pembelajaran_id'] = $tp->id;
        $data['order'] = $tp->alurTujuanPembelajarans()->max('order') + 1;

        $atp = AlurTujuanPembelajaran::create($data);

        return response()->json(['data' => $atp], 201);
    }

    public function updateAtp(Request $request, AlurTujuanPembelajaran $atp): JsonResponse
    {
        $this->authorizeSubject($request, $atp->tujuanPembelajaran->capaianPembelajaran->subject_id);

        $data = $request->validate([
            'code' => ['sometimes', 'required', 'string', 'max:50'],
            'text' => ['sometimes', 'required', 'string'],
            'course_id' => ['sometimes', 'nullable', 'exists:courses,id'],
        ]);
        $atp->update($data);

        return response()->json(['data' => $atp]);
    }

    public function destroyAtp(Request $request, AlurTujuanPembelajaran $atp): JsonResponse
    {
        $this->authorizeSubject($request, $atp->tujuanPembelajaran->capaianPembelajaran->subject_id);
        $atp->delete();

        return response()->json(['message' => 'Alur Tujuan Pembelajaran dihapus.']);
    }

    /** Guru pengampu mapel ini, atau Admin/Super Admin. */
    private function authorizeSubject(Request $request, int $subjectId): void
    {
        $user = $request->user();
        if ($user->hasRole('superadmin') || $user->hasRole('admin')) {
            return;
        }
        if ($user->teachingAssignments()->where('subject_id', $subjectId)->exists()) {
            return;
        }
        abort(403, 'Anda tidak mengajar mapel ini.');
    }
}
