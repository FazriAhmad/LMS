<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Admin Sistem (modul 19) — dipersempit ke profil/branding sekolah saja.
 * "Konfigurasi notifikasi" di-skip: tidak ada channel notifikasi buat dikonfigurasi
 * (modul Komunikasi sengaja tidak dikerjakan, komunikasi cukup lewat Forum).
 * "Trigger backup manual" di-skip: backup DB sungguhan butuh akses shell (pg_dump)
 * di luar scope endpoint API, dan tombol backup palsu lebih berbahaya daripada berguna.
 */
class SchoolSettingController extends Controller
{
    public function show(): JsonResponse
    {
        $s = SchoolSetting::current();

        return response()->json(['data' => [
            'name' => $s->name, 'short_name' => $s->short_name, 'npsn' => $s->npsn,
            'address' => $s->address, 'email' => $s->email, 'phone' => $s->phone,
            'logo_url' => $s->logoUrl(),
        ]]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(['superadmin', 'admin'])) {
            abort(403, 'Hanya Admin/Super Admin yang boleh mengubah profil sekolah.');
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'short_name' => ['nullable', 'string', 'max:50'],
            'npsn' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'logo' => ['nullable', 'image', 'max:2048'],
        ]);

        $s = SchoolSetting::current();
        if ($request->hasFile('logo')) {
            if ($s->logo_path) {
                Storage::disk('public')->delete($s->logo_path);
            }
            $data['logo_path'] = $request->file('logo')->store('school', 'public');
        }
        unset($data['logo']);

        $s->update($data);

        return response()->json(['data' => [
            'name' => $s->name, 'short_name' => $s->short_name, 'npsn' => $s->npsn,
            'address' => $s->address, 'email' => $s->email, 'phone' => $s->phone,
            'logo_url' => $s->logoUrl(),
        ]]);
    }
}
