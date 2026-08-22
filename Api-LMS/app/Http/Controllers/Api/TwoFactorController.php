<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\Totp;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class TwoFactorController extends Controller
{
    /** Mulai setup — generate secret baru (belum aktif sampai dikonfirmasi lewat /2fa/confirm). */
    public function setup(Request $request): JsonResponse
    {
        $user = $request->user();
        $secret = Totp::generateSecret();
        $user->forceFill(['two_factor_secret' => $secret, 'two_factor_enabled_at' => null])->save();

        return response()->json(['data' => [
            'secret' => $secret,
            'otpauth_url' => Totp::otpauthUrl($secret, $user->username),
        ]]);
    }

    /** Konfirmasi kode dari aplikasi authenticator — baru dari sini 2FA benar-benar aktif. */
    public function confirm(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate(['code' => ['required', 'string']]);

        if (! $user->two_factor_secret || ! Totp::verify($user->two_factor_secret, $data['code'])) {
            throw ValidationException::withMessages(['code' => ['Kode tidak valid.']]);
        }

        $recoveryCodes = collect(range(1, 8))->map(fn () => Str::random(10))->values();
        $user->forceFill([
            'two_factor_enabled_at' => now(),
            'two_factor_recovery_codes' => $recoveryCodes->map(fn ($c) => Hash::make($c))->all(),
        ])->save();

        return response()->json([
            'message' => '2FA aktif.',
            'recovery_codes' => $recoveryCodes,
        ]);
    }

    public function disable(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate(['password' => ['required', 'string']]);

        if (! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['password' => ['Password salah.']]);
        }

        $user->forceFill([
            'two_factor_secret' => null, 'two_factor_enabled_at' => null, 'two_factor_recovery_codes' => null,
        ])->save();

        return response()->json(['message' => '2FA dinonaktifkan.']);
    }
}
