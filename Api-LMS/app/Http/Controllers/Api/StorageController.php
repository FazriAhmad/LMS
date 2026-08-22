<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\Material;
use App\Models\SchoolSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Storage monitoring (modul 17, Fase 3) — jumlah pemakaian dihitung dari kolom `file_size`
 * yang sudah ditrack tiap modul upload (Materi, Tugas), bukan menghitung ulang lewat filesystem
 * scan yang lambat begitu jumlah file banyak.
 */
class StorageController extends Controller
{
    public function usage(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(['superadmin', 'admin'])) {
            abort(403, 'Storage monitoring hanya untuk Admin/Super Admin.');
        }

        $materialsBytes = (int) Material::sum('file_size');
        $submissionsBytes = (int) AssignmentSubmission::sum('file_size');
        $attachmentsBytes = Assignment::whereNotNull('attachments')->get()
            ->sum(fn (Assignment $a) => collect($a->attachments ?? [])->sum('size'));

        $totalBytes = $materialsBytes + $submissionsBytes + $attachmentsBytes;
        $quotaMb = SchoolSetting::current()->storage_quota_mb;
        $quotaBytes = $quotaMb * 1024 * 1024;
        $percent = $quotaBytes > 0 ? round($totalBytes / $quotaBytes * 100, 1) : 0;

        return response()->json(['data' => [
            'breakdown_mb' => [
                'materi' => round($materialsBytes / 1024 / 1024, 1),
                'pengumpulan_tugas' => round($submissionsBytes / 1024 / 1024, 1),
                'lampiran_tugas' => round($attachmentsBytes / 1024 / 1024, 1),
            ],
            'used_mb' => round($totalBytes / 1024 / 1024, 1),
            'quota_mb' => $quotaMb,
            'percent_used' => $percent,
            'warning' => $percent >= 80,
        ]]);
    }

    public function updateQuota(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(['superadmin', 'admin'])) {
            abort(403, 'Hanya Admin/Super Admin yang boleh mengubah kuota storage.');
        }

        $data = $request->validate(['storage_quota_mb' => ['required', 'integer', 'min:100']]);
        $setting = SchoolSetting::current();
        $setting->update($data);

        return response()->json(['data' => ['storage_quota_mb' => $setting->storage_quota_mb]]);
    }
}
