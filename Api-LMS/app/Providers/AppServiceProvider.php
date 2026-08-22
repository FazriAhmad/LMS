<?php

namespace App\Providers;

use App\Models\AcademicYear;
use App\Models\Assignment;
use App\Models\AuditLog;
use App\Models\Course;
use App\Models\Exam;
use App\Models\Grade;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\SchoolClass;
use App\Models\ScheduleItem;
use App\Models\Subject;
use App\Models\TeachingAssignment;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    /**
     * Audit log (modul 18, Fase 3) — dipasang lewat model event di sini, satu tempat,
     * bukan ditambal manual ke tiap controller ->update()/->destroy(). Mencakup PRD:
     * "ubah nilai" (Grade), "hapus data" (model akademik inti), "ubah permission"
     * (User status via approve/reject — assignRole/removeRole diaudit manual di
     * UserController/SchoolClassController/AuthController karena itu pivot table,
     * tidak lewat event 'updated' pada model User).
     */
    public function boot(): void
    {
        // 'updated_at' selalu berubah jadi selalu dikecualikan; kolom sensitif User (password/2FA)
        // jangan pernah masuk audit log dalam bentuk apapun, walau ter-hash.
        $excluded = ['updated_at', 'password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'];

        foreach ([Grade::class, User::class] as $class) {
            $class::updated(function (Model $model) use ($excluded) {
                $changes = collect($model->getChanges())->except($excluded)->all();
                if ($changes) {
                    AuditLog::record('updated', $model, $changes);
                }
            });
        }

        foreach ([
            User::class, SchoolClass::class, Subject::class, AcademicYear::class,
            TeachingAssignment::class, Course::class, Assignment::class,
            Quiz::class, Exam::class, Question::class, ScheduleItem::class,
        ] as $class) {
            $class::deleted(fn (Model $model) => AuditLog::record('deleted', $model));
        }
    }
}
