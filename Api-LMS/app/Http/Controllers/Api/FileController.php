<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\Course;
use App\Models\Material;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * File Management — gabungan read-only dari file yang sudah nyata tersimpan di
 * modul lain (Materi, lampiran Tugas, pengumpulan Tugas). Sengaja TIDAK ada tabel
 * baru/folder/permission generik — upload file tetap lewat Course/Tugas seperti
 * biasa, halaman ini cuma jendela gabungan buat menjelajah file yang sudah ada.
 */
class FileController extends Controller
{
    private const TYPE_BY_EXT = [
        'pdf' => 'pdf', 'doc' => 'doc', 'docx' => 'doc',
        'ppt' => 'ppt', 'pptx' => 'ppt',
        'jpg' => 'image', 'jpeg' => 'image', 'png' => 'image', 'gif' => 'image',
        'mp4' => 'video', 'mov' => 'video', 'webm' => 'video',
    ];

    public function index(Request $request): JsonResponse
    {
        $courseIds = $this->accessibleCourseIds($request);
        $user = $request->user();
        $files = collect();

        Material::whereHas('courseModule', fn ($q) => $q->whereIn('course_id', $courseIds))
            ->whereNotNull('file_path')
            ->with('courseModule.course.teachingAssignment.subject', 'courseModule.course.teachingAssignment.schoolClass', 'uploader:id,name')
            ->get()
            ->each(function (Material $m) use ($files) {
                $ta = $m->courseModule->course->teachingAssignment;
                $files->push([
                    'id' => "material-{$m->id}",
                    'name' => $m->title,
                    'type' => $m->type,
                    'size' => $m->formattedSize(),
                    'folder' => "{$ta->subject->name} · {$ta->schoolClass->name}",
                    'uploaded_by' => $m->uploader?->name ?? '—',
                    'url' => $m->fileUrl(),
                    'at' => $m->created_at->toIso8601String(),
                ]);
            });

        Assignment::whereIn('course_id', $courseIds)
            ->whereNotNull('attachments')
            ->with('course.teachingAssignment.subject', 'course.teachingAssignment.schoolClass')
            ->get()
            ->each(function (Assignment $a) use ($files) {
                $ta = $a->course->teachingAssignment;
                foreach (($a->attachments ?? []) as $i => $att) {
                    $files->push([
                        'id' => "assignment-{$a->id}-{$i}",
                        'name' => $att['name'] ?? 'Lampiran',
                        'type' => $this->typeFromName($att['name'] ?? ''),
                        'size' => isset($att['size']) ? $this->formatBytes($att['size']) : null,
                        'folder' => "{$ta->subject->name} · {$ta->schoolClass->name} · Tugas",
                        'uploaded_by' => '—',
                        'url' => $att['url'] ?? null,
                        'at' => $a->created_at->toIso8601String(),
                    ]);
                }
            });

        $submissionsQuery = AssignmentSubmission::whereHas('assignment', fn ($q) => $q->whereIn('course_id', $courseIds))
            ->whereNotNull('file_path')
            ->with('assignment.course.teachingAssignment.subject', 'assignment.course.teachingAssignment.schoolClass', 'student:id,name');
        if ($user->hasRole('siswa')) {
            $submissionsQuery->where('student_id', $user->id);
        }
        $submissionsQuery->get()->each(function (AssignmentSubmission $s) use ($files) {
            $ta = $s->assignment->course->teachingAssignment;
            $files->push([
                'id' => "submission-{$s->id}",
                'name' => basename($s->file_path),
                'type' => $this->typeFromName($s->file_path),
                'size' => $this->formatBytes($s->file_size),
                'folder' => "{$ta->subject->name} · {$ta->schoolClass->name} · Pengumpulan Tugas",
                'uploaded_by' => $s->student?->name ?? '—',
                'url' => $s->fileUrl(),
                'at' => $s->submitted_at?->toIso8601String(),
            ]);
        });

        return response()->json(['data' => $files->sortByDesc('at')->values()]);
    }

    private function typeFromName(?string $name): string
    {
        $ext = strtolower(pathinfo($name ?? '', PATHINFO_EXTENSION));

        return self::TYPE_BY_EXT[$ext] ?? 'doc';
    }

    private function formatBytes(?int $bytes): ?string
    {
        if (! $bytes) {
            return null;
        }
        $units = ['B', 'KB', 'MB', 'GB'];
        $i = 0;
        while ($bytes >= 1024 && $i < count($units) - 1) {
            $bytes /= 1024;
            $i++;
        }

        return round($bytes, 1) . ' ' . $units[$i];
    }

    /** Sama seperti CourseController::index — guru lihat courses yang diampu, siswa/ortu kelasnya, staf lain semua. */
    private function accessibleCourseIds(Request $request)
    {
        $user = $request->user();
        $query = Course::query();

        if ($user->hasRole('guru') || $user->hasRole('walikelas')) {
            $query->whereHas('teachingAssignment', fn ($q) => $q->where('teacher_id', $user->id));
        } elseif ($user->hasRole('siswa')) {
            $classId = $user->studentProfile?->school_class_id;
            $query->whereHas('teachingAssignment', fn ($q) => $q->where('school_class_id', $classId));
        } elseif ($user->hasRole('ortu')) {
            $classIds = $user->children()->with('studentProfile')->get()->pluck('studentProfile.school_class_id')->filter();
            $query->whereHas('teachingAssignment', fn ($q) => $q->whereIn('school_class_id', $classIds));
        }

        return $query->pluck('id');
    }
}
