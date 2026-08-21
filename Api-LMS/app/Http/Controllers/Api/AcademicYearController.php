<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AcademicYearController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => AcademicYear::orderByDesc('start_date')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'semester' => ['required', 'in:ganjil,genap'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
        ]);

        $year = AcademicYear::create($data);

        return response()->json(['data' => $year], 201);
    }

    public function update(Request $request, AcademicYear $academicYear): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:50'],
            'semester' => ['sometimes', 'required', 'in:ganjil,genap'],
            'start_date' => ['sometimes', 'nullable', 'date'],
            'end_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:start_date'],
        ]);

        $academicYear->update($data);

        return response()->json(['data' => $academicYear]);
    }

    /** Mengaktifkan satu tahun ajaran — otomatis menonaktifkan yang lain (hanya satu aktif pada satu waktu). */
    public function activate(AcademicYear $academicYear): JsonResponse
    {
        DB::transaction(function () use ($academicYear) {
            AcademicYear::where('is_active', true)->update(['is_active' => false]);
            $academicYear->update(['is_active' => true]);
        });

        return response()->json(['data' => $academicYear->fresh()]);
    }

    public function destroy(AcademicYear $academicYear): JsonResponse
    {
        $academicYear->delete();

        return response()->json(['message' => 'Tahun ajaran dihapus.']);
    }
}
