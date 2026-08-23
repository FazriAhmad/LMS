<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * "Sesi Aktif" (modul 18, Keamanan & Login) — token Sanctum milik user sendiri
 * DIPAKAI sebagai representasi sesi login, bukan tabel login-history terpisah.
 * Satu token = satu sesi login (dibuat tiap kali login berhasil).
 */
class SessionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $currentId = $request->user()->currentAccessToken()->id;

        $sessions = $user->tokens()->orderByDesc('last_used_at')->get()->map(fn (PersonalAccessToken $t) => [
            'id' => $t->id,
            'name' => $t->name,
            'created_at' => $t->created_at->toIso8601String(),
            'last_used_at' => $t->last_used_at?->toIso8601String(),
            'current' => $t->id === $currentId,
        ]);

        return response()->json(['data' => $sessions]);
    }

    /** Akhiri satu sesi (token) milik sendiri — bukan sesi user lain. */
    public function destroy(Request $request, int $session): JsonResponse
    {
        $deleted = $request->user()->tokens()->where('id', $session)->delete();

        if (! $deleted) {
            abort(404, 'Sesi tidak ditemukan.');
        }

        return response()->json(['message' => 'Sesi diakhiri.']);
    }
}
