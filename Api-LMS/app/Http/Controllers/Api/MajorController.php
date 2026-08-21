<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Major;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MajorController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Major::orderBy('name')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:100']]);
        $major = Major::create($data);

        return response()->json(['data' => $major], 201);
    }

    public function update(Request $request, Major $major): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:100']]);
        $major->update($data);

        return response()->json(['data' => $major]);
    }

    public function destroy(Major $major): JsonResponse
    {
        $major->delete();

        return response()->json(['message' => 'Jurusan dihapus.']);
    }
}
