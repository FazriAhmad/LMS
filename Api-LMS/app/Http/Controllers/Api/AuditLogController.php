<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(['superadmin', 'admin'])) {
            abort(403, 'Audit log hanya untuk Admin/Super Admin.');
        }

        $data = $request->validate([
            'model' => ['nullable', 'string'],
            'action' => ['nullable', 'string'],
            'user_id' => ['nullable', 'exists:users,id'],
        ]);

        $logs = AuditLog::with('user:id,name')
            ->when($data['model'] ?? null, fn ($q, $m) => $q->where('model', $m))
            ->when($data['action'] ?? null, fn ($q, $a) => $q->where('action', $a))
            ->when($data['user_id'] ?? null, fn ($q, $id) => $q->where('user_id', $id))
            ->latest('created_at')->paginate(50);

        return response()->json($logs);
    }
}
