<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ParentMessage;
use App\Models\SchoolClass;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Pesan langsung ortu <-> wali kelas (modul Komunikasi sisi orang tua).
 *
 * Berbeda dari Forum (ForumController) yang berbasis course dan dipakai guru/siswa:
 * di sini percakapan berbasis SISWA, dan pesertanya cuma dua pihak — orang tua siswa
 * itu dan wali kelasnya. Admin/kepsek sengaja TIDAK diberi akses baca: ini kanal privat
 * antara orang tua dan wali kelas, bukan kanal pengumuman sekolah.
 */
class ParentMessageController extends Controller
{
    /** Daftar percakapan milik user yang login. */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('ortu') && ! $this->isHomeroomTeacher($user)) {
            abort(403, 'Kanal ini hanya untuk orang tua dan wali kelas.');
        }

        $students = $user->hasRole('ortu')
            ? $user->children()->with('studentProfile.schoolClass.homeroomTeacher:id,name')->get()
            : $this->homeroomStudents($user);

        $latest = ParentMessage::whereIn('student_id', $students->pluck('id'))
            ->with('sender:id,name')
            ->latest()
            ->get()
            ->groupBy('student_id');

        $rows = $students->map(function (User $s) use ($latest, $user) {
            $last = $latest->get($s->id)?->first();

            return [
                'student_id' => $s->id,
                'student_name' => $s->name,
                'class_name' => $s->studentProfile?->schoolClass?->name,
                // Lawan bicara: buat ortu = wali kelas anaknya, buat wali kelas = orang tua siswa.
                'counterpart' => $user->hasRole('ortu')
                    ? $s->studentProfile?->schoolClass?->homeroomTeacher?->name
                    : ($s->parents->pluck('name')->join(', ') ?: null),
                'last_message' => $last?->body,
                'last_message_at' => $last?->created_at,
                'last_sender_name' => $last?->sender->name,
                'messages_count' => $latest->get($s->id)?->count() ?? 0,
            ];
        });

        // Percakapan dengan pesan terbaru naik ke atas — frontend memilih yang pertama secara
        // default, jadi wali kelas dengan puluhan siswa langsung mendarat di thread yang aktif,
        // bukan di siswa pertama menurut abjad.
        return response()->json([
            'data' => $rows->sortByDesc(fn (array $r) => $r['last_message_at']?->getTimestamp() ?? 0)->values(),
        ]);
    }

    /** Isi percakapan satu siswa. */
    public function messages(Request $request, User $student): JsonResponse
    {
        $this->authorizeParticipant($request, $student);

        $messages = ParentMessage::where('student_id', $student->id)
            ->with('sender:id,name')
            ->oldest()
            ->get()
            ->map(fn (ParentMessage $m) => [
                'id' => $m->id,
                'body' => $m->body,
                'created_at' => $m->created_at,
                'sender_id' => $m->sender_id,
                'sender_name' => $m->sender->name,
                'mine' => $m->sender_id === $request->user()->id,
            ]);

        return response()->json(['data' => $messages]);
    }

    public function store(Request $request, User $student): JsonResponse
    {
        $this->authorizeParticipant($request, $student);

        $data = $request->validate(['body' => ['required', 'string', 'max:5000']]);

        $message = ParentMessage::create([
            'student_id' => $student->id,
            'sender_id' => $request->user()->id,
            'body' => $data['body'],
        ]);

        return response()->json(['data' => $message->load('sender:id,name')], 201);
    }

    private function isHomeroomTeacher(User $user): bool
    {
        return SchoolClass::where('homeroom_teacher_id', $user->id)->exists();
    }

    /** Siswa di kelas yang diwalikelasi user ini. */
    private function homeroomStudents(User $teacher)
    {
        return User::whereHas('studentProfile.schoolClass', fn ($q) => $q->where('homeroom_teacher_id', $teacher->id))
            ->with(['studentProfile.schoolClass', 'parents:id,name'])
            ->orderBy('name')
            ->get();
    }

    /**
     * Hanya dua pihak yang boleh masuk: orang tua siswa ini, atau wali kelasnya.
     * Wali kelas ditentukan dari kelas siswa saat ini — kalau siswa pindah kelas,
     * akses otomatis ikut pindah ke wali kelas yang baru.
     */
    private function authorizeParticipant(Request $request, User $student): void
    {
        $user = $request->user();

        if ($user->children()->where('users.id', $student->id)->exists()) {
            return;
        }

        $isHomeroom = StudentProfile::where('user_id', $student->id)
            ->whereHas('schoolClass', fn ($q) => $q->where('homeroom_teacher_id', $user->id))
            ->exists();
        if ($isHomeroom) {
            return;
        }

        abort(403, 'Percakapan ini hanya untuk orang tua siswa dan wali kelasnya.');
    }
}
