<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::with('roles')->orderByDesc('created_at');

        if ($request->filled('role')) {
            $query->whereHas('roles', fn ($q) => $q->where('name', $request->string('role')));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('q')) {
            $q = $request->string('q');
            $query->where(fn ($w) => $w->where('name', 'ilike', "%{$q}%")->orWhere('username', 'ilike', "%{$q}%"));
        }

        return response()->json(['data' => $query->paginate(20)]);
    }

    /**
     * Admin membuat akun langsung (guru, admin, kepsek, wali kelas, siswa, ortu)
     * — status langsung "approved", tidak lewat antrean persetujuan.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:50', 'unique:users,username', 'alpha_dash'],
            'email' => ['nullable', 'email', 'max:255', 'unique:users,email'],
            'password' => ['nullable', 'string', 'min:8'],
            // "walikelas" sengaja tidak bisa dipilih di sini — role itu diberikan otomatis
            // saat seorang guru ditugaskan homeroom_teacher_id di SchoolClassController.
            'role' => ['required', Rule::in(['superadmin', 'admin', 'kepsek', 'guru', 'siswa', 'ortu'])],
            'title' => ['nullable', 'string', 'max:255'],
            // Khusus role siswa
            'nis' => ['required_if:role,siswa', 'nullable', 'string', 'unique:student_profiles,nis'],
            'gender' => ['required_if:role,siswa', 'nullable', Rule::in(['L', 'P'])],
            'school_class_id' => ['nullable', 'exists:school_classes,id'],
            // Khusus role ortu
            'child_ids' => ['nullable', 'array'],
            'child_ids.*' => ['exists:users,id'],
        ]);

        $user = DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'username' => $data['username'],
                'email' => $data['email'] ?? null,
                'password' => $data['password'] ?? Str::random(12),
                'title' => $data['title'] ?? null,
                'status' => 'approved',
            ]);
            $user->assignRole($data['role']);

            if ($data['role'] === 'siswa') {
                StudentProfile::create([
                    'user_id' => $user->id,
                    'nis' => $data['nis'],
                    'gender' => $data['gender'],
                    'school_class_id' => $data['school_class_id'] ?? null,
                ]);
            }

            if ($data['role'] === 'ortu' && ! empty($data['child_ids'])) {
                $user->children()->sync($data['child_ids']);
            }

            return $user;
        });

        return response()->json(['data' => $user->load('roles')], 201);
    }

    public function approve(Request $request, User $user): JsonResponse
    {
        $user->update([
            'status' => 'approved',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        return response()->json(['data' => $user->fresh('roles')]);
    }

    public function reject(Request $request, User $user): JsonResponse
    {
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:500']]);

        $user->update([
            'status' => 'rejected',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        return response()->json(['data' => $user->fresh('roles'), 'reason' => $data['reason'] ?? null]);
    }

    public function destroy(User $user): JsonResponse
    {
        $user->delete();

        return response()->json(['message' => 'Akun dihapus.']);
    }
}
