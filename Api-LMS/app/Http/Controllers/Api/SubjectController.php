<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Subject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubjectController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Subject::orderBy('name')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'code' => ['required', 'string', 'max:20', 'unique:subjects,code'],
            'color' => ['nullable', 'string', 'max:20'],
        ]);

        $subject = Subject::create($data);

        return response()->json(['data' => $subject], 201);
    }

    public function update(Request $request, Subject $subject): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'code' => ['sometimes', 'required', 'string', 'max:20', 'unique:subjects,code,' . $subject->id],
            'color' => ['nullable', 'string', 'max:20'],
        ]);

        $subject->update($data);

        return response()->json(['data' => $subject]);
    }

    public function destroy(Subject $subject): JsonResponse
    {
        $subject->delete();

        return response()->json(['message' => 'Mata pelajaran dihapus.']);
    }
}
