<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\ForumReply;
use App\Models\ForumThread;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ForumController extends Controller
{
    public function index(Request $request, Course $course): JsonResponse
    {
        $this->authorizeView($request, $course);

        $threads = $course->forumThreads()->withCount('replies')->with('author:id,name')->get();

        return response()->json(['data' => $threads]);
    }

    public function store(Request $request, Course $course): JsonResponse
    {
        $this->authorizeView($request, $course);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string'],
        ]);
        $data['course_id'] = $course->id;
        $data['author_id'] = $request->user()->id;

        $thread = ForumThread::create($data);

        return response()->json(['data' => $thread->load('author:id,name')], 201);
    }

    public function show(Request $request, ForumThread $forumThread): JsonResponse
    {
        $this->authorizeView($request, $forumThread->course);

        return response()->json(['data' => $forumThread->load(['author:id,name', 'replies.author:id,name'])]);
    }

    public function destroy(Request $request, ForumThread $forumThread): JsonResponse
    {
        $this->authorizeModerate($request, $forumThread->course, $forumThread->author_id);
        $forumThread->delete();

        return response()->json(['message' => 'Thread dihapus.']);
    }

    public function storeReply(Request $request, ForumThread $forumThread): JsonResponse
    {
        $this->authorizeView($request, $forumThread->course);

        $data = $request->validate(['body' => ['required', 'string']]);
        $reply = ForumReply::create([
            'thread_id' => $forumThread->id,
            'author_id' => $request->user()->id,
            'body' => $data['body'],
        ]);

        return response()->json(['data' => $reply->load('author:id,name')], 201);
    }

    public function destroyReply(Request $request, ForumReply $forumReply): JsonResponse
    {
        $this->authorizeModerate($request, $forumReply->thread->course, $forumReply->author_id);
        $forumReply->delete();

        return response()->json(['message' => 'Balasan dihapus.']);
    }

    /** Penulis sendiri, guru pengampu course, atau Admin/Super Admin boleh hapus (moderasi). */
    private function authorizeModerate(Request $request, Course $course, int $authorId): void
    {
        $user = $request->user();
        if ($user->id === $authorId || $user->hasAnyRole(['superadmin', 'admin']) || $user->id === $course->teachingAssignment->teacher_id) {
            return;
        }
        abort(403, 'Anda tidak boleh menghapus ini.');
    }

    /** Guru pengampu, siswa di kelasnya, atau Admin/Kepsek — sama seperti akses course. */
    private function authorizeView(Request $request, Course $course): void
    {
        $user = $request->user();
        if ($user->hasAnyRole(['superadmin', 'admin', 'kepsek'])) {
            return;
        }
        if ($user->id === $course->teachingAssignment->teacher_id) {
            return;
        }
        if ($user->hasRole('siswa') && $user->studentProfile?->school_class_id === $course->teachingAssignment->school_class_id) {
            return;
        }
        abort(403, 'Anda tidak punya akses ke forum course ini.');
    }
}
