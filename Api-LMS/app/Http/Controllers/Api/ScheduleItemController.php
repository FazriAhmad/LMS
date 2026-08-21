<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ScheduleItem;
use App\Models\TeachingAssignment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ScheduleItemController extends Controller
{
    private const WITH = ['teachingAssignment.teacher:id,name', 'teachingAssignment.subject', 'teachingAssignment.schoolClass'];

    /** Siswa cuma lihat jadwal kelasnya, guru cuma lihat jadwal mengajarnya sendiri kecuali difilter eksplisit. */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = ScheduleItem::with(self::WITH);

        if ($user->hasRole('siswa')) {
            $classId = $user->studentProfile?->school_class_id;
            $query->whereHas('teachingAssignment', fn ($q) => $q->where('school_class_id', $classId));
        } elseif ($request->filled('school_class_id')) {
            $query->whereHas('teachingAssignment', fn ($q) => $q->where('school_class_id', $request->integer('school_class_id')));
        } elseif ($request->filled('teacher_id')) {
            $query->whereHas('teachingAssignment', fn ($q) => $q->where('teacher_id', $request->integer('teacher_id')));
        } elseif ($user->hasRole('guru') || $user->hasRole('walikelas')) {
            $query->whereHas('teachingAssignment', fn ($q) => $q->where('teacher_id', $user->id));
        }

        return response()->json(['data' => $query->orderBy('day')->orderBy('start_time')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $this->assertNoConflict($data);

        $item = ScheduleItem::create($data);

        return response()->json(['data' => $item->load(self::WITH)], 201);
    }

    public function update(Request $request, ScheduleItem $scheduleItem): JsonResponse
    {
        $data = $this->validated($request);
        $this->assertNoConflict($data, ignoreId: $scheduleItem->id);

        $scheduleItem->update($data);

        return response()->json(['data' => $scheduleItem->load(self::WITH)]);
    }

    public function destroy(ScheduleItem $scheduleItem): JsonResponse
    {
        $scheduleItem->delete();

        return response()->json(['message' => 'Jadwal dihapus.']);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'teaching_assignment_id' => ['required', 'exists:teaching_assignments,id'],
            'day' => ['required', 'integer', 'min:0', 'max:6'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'room' => ['nullable', 'string', 'max:100'],
        ]);
    }

    /** Cegah bentrok: kelas yang sama atau guru yang sama tidak boleh punya jadwal tumpang tindih di hari yang sama. */
    private function assertNoConflict(array $data, ?int $ignoreId = null): void
    {
        $assignment = TeachingAssignment::findOrFail($data['teaching_assignment_id']);

        $overlapping = ScheduleItem::with('teachingAssignment')
            ->where('day', $data['day'])
            ->where('start_time', '<', $data['end_time'])
            ->where('end_time', '>', $data['start_time'])
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->whereHas('teachingAssignment', fn ($q) => $q
                ->where('school_class_id', $assignment->school_class_id)
                ->orWhere('teacher_id', $assignment->teacher_id))
            ->first();

        if ($overlapping) {
            $sameClass = $overlapping->teachingAssignment->school_class_id === $assignment->school_class_id;
            throw ValidationException::withMessages([
                'start_time' => [$sameClass
                    ? 'Kelas ini sudah punya jadwal lain yang bentrok jam segitu.'
                    : 'Guru ini sudah punya jadwal mengajar lain yang bentrok jam segitu.'],
            ]);
        }
    }
}
