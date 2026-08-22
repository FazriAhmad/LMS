import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, GraduationCap, BookOpen, ClipboardList, CalendarCheck, Star,
  Clock, BookMarked, Award,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { SCHOOL } from '../lib/data';
import { cn, fmtDate, gradeColor } from '../lib/utils';
import { Card, StatCard, Badge, ProgressBar, Avatar } from '../components/ui';

function Greeting({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 p-6 text-white shadow-lg shadow-indigo-200 md:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200">{SCHOOL.year} · Semester {SCHOOL.semester}</p>
      <h1 className="mt-1 font-display text-2xl font-bold md:text-3xl">{title}</h1>
      <p className="mt-1 text-sm text-indigo-100">{sub}</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-rose-200 bg-rose-50/60">
      <p className="text-sm font-semibold text-rose-700">Gagal memuat dashboard</p>
      <p className="mt-1 text-xs text-rose-600">{message}</p>
    </Card>
  );
}

/** Dashboard tersambung ke backend asli (GET /dashboard) — bentuk data per role sesuai DashboardController. */
export default function Dashboard() {
  const { user } = useStore();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ data: Record<string, unknown> }>('/dashboard')
      .then(res => setData(res.data))
      .catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'));
  }, []);

  if (!user) return null;
  if (error) return <ErrorState message={error} />;
  if (!data) return <div className="py-10 text-center text-sm text-slate-400">Memuat dashboard…</div>;

  switch (user.role) {
    case 'siswa': return <SiswaDash d={data} />;
    case 'ortu': return <OrtuDash d={data} />;
    case 'kepsek': return <KepsekDash d={data} />;
    case 'guru':
    case 'walikelas': return <GuruDash d={data} />;
    default: return <AdminDash d={data} />;
  }
}

function SiswaDash({ d }: { d: Record<string, any> }) {
  const totalMat = d.materials_progress?.total ?? 0;
  const doneMat = d.materials_progress?.done ?? 0;
  return (
    <div>
      <Greeting title={`Halo, ${d.student_name?.split(' ')[0] ?? ''}! 👋`} sub={`${totalMat} materi tersedia · ${totalMat - doneMat} belum diselesaikan`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Star} label="Rata-rata Nilai" value={d.average_grade} color="bg-amber-50 text-amber-600" />
        <StatCard icon={CalendarCheck} label="Kehadiran" value={`${d.attendance_pct}%`} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={ClipboardList} label="Tugas Belum Dikumpulkan" value={d.assignments_pending} color="bg-rose-50 text-rose-600" />
        <StatCard icon={BookMarked} label="Progress Materi" value={`${doneMat}/${totalMat}`} sub={<ProgressBar value={totalMat ? (doneMat / totalMat) * 100 : 0} className="mt-1" />} color="bg-indigo-50 text-indigo-600" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Jadwal Hari Ini">
            {(!d.today_schedule || d.today_schedule.length === 0) ? (
              <p className="py-4 text-center text-sm text-slate-400">Tidak ada jadwal hari ini.</p>
            ) : (
              <div className="space-y-2">
                {d.today_schedule.map((s: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{s.subject_name}</p>
                      <p className="text-xs text-slate-500">{s.teacher_name} · {s.room}</p>
                    </div>
                    <Badge color="slate"><Clock className="h-3 w-3" /> {s.start_time}–{s.end_time}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Deadline Tugas">
            {(!d.upcoming_deadlines || d.upcoming_deadlines.length === 0) ? (
              <p className="py-4 text-center text-sm text-slate-400">Tidak ada tugas mendatang.</p>
            ) : (
              <div className="space-y-3">
                {d.upcoming_deadlines.map((a: any) => (
                  <div key={a.assignment_id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{a.title}</p>
                      <p className="text-xs text-slate-500">tenggat {fmtDate(a.deadline)}</p>
                    </div>
                    <Badge color={a.status === 'dinilai' ? 'emerald' : a.status === 'sudah' ? 'sky' : a.status === 'revisi' ? 'amber' : 'slate'}>
                      {a.status === 'belum' ? 'Belum' : a.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Nilai Terbaru">
            {(!d.recent_grades || d.recent_grades.length === 0) ? (
              <p className="py-4 text-center text-sm text-slate-400">Belum ada nilai.</p>
            ) : (
              <div className="space-y-3">
                {d.recent_grades.map((g: any) => (
                  <div key={g.course_id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-700">{g.subject_name}</p>
                      <ProgressBar value={g.final} className="mt-1.5" color={g.final >= 80 ? 'bg-emerald-500' : g.final >= 70 ? 'bg-amber-500' : 'bg-rose-500'} />
                    </div>
                    <span className={cn('rounded-lg px-2 py-1 text-sm font-bold', gradeColor(g.letter))}>{g.final}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function GuruDash({ d }: { d: Record<string, any> }) {
  return (
    <div>
      <Greeting title={`Selamat datang, ${d.teacher_name?.split(',')[0] ?? ''} 🎓`} sub={`${d.courses?.length ?? 0} kelas diampu · ${d.to_grade_count ?? 0} pengumpulan menunggu dinilai`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={BookOpen} label="Kelas Diampu" value={d.courses?.length ?? 0} sub={d.courses?.map((c: any) => c.class_name).join(', ')} color="bg-indigo-50 text-indigo-600" />
        <StatCard icon={ClipboardList} label="Perlu Dinilai" value={d.to_grade_count ?? 0} sub="Pengumpulan tugas masuk" color="bg-amber-50 text-amber-600" />
        {d.homeroom && (
          <StatCard icon={CalendarCheck} label={`Presensi Hari Ini (${d.homeroom.class_name})`} value={`${d.homeroom.attendance_pct_today}%`} color="bg-emerald-50 text-emerald-600" />
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Jadwal Mengajar Hari Ini">
            {(!d.today_schedule || d.today_schedule.length === 0) ? (
              <p className="py-4 text-center text-sm text-slate-400">Tidak ada jadwal mengajar hari ini.</p>
            ) : (
              <div className="space-y-2">
                {d.today_schedule.map((s: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">{s.subject_name} · {s.class_name}</p>
                      <p className="text-xs text-slate-500">{s.room}</p>
                    </div>
                    <Badge color="slate"><Clock className="h-3 w-3" /> {s.start_time}–{s.end_time}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Pengumpulan Menunggu Dinilai" action={<Link to="/tugas" className="text-xs font-bold text-indigo-600 hover:underline">Kelola tugas →</Link>}>
            {(!d.to_grade || d.to_grade.length === 0) ? (
              <p className="py-4 text-center text-sm text-slate-400">Semua pengumpulan sudah dinilai. 🎉</p>
            ) : (
              <div className="space-y-2">
                {d.to_grade.map((s: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                    <Avatar name={s.student_name} color="#f59e0b" size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{s.student_name}</p>
                      <p className="truncate text-xs text-slate-500">{s.assignment_title}</p>
                    </div>
                    <Badge color="amber">Nilai sekarang</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {d.homeroom && (
            <Card title={`Wali Kelas · ${d.homeroom.class_name}`} subtitle="Ringkasan kelas walimu">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <p className="font-display text-xl font-bold text-slate-900">{d.homeroom.student_count}</p>
                  <p className="text-[10px] font-semibold text-slate-500">Siswa</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <p className="font-display text-xl font-bold text-slate-900">{d.homeroom.average_grade}</p>
                  <p className="text-[10px] font-semibold text-slate-500">Rata-rata nilai</p>
                </div>
              </div>
            </Card>
          )}
          <Card title="Kelas Saya" pad={false}>
            <div className="divide-y divide-slate-50">
              {(d.courses ?? []).map((c: any) => (
                <div key={c.course_id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{c.subject_name}</p>
                    <p className="text-xs text-slate-500">{c.class_name}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function OrtuDash({ d }: { d: Record<string, any> }) {
  return (
    <div>
      <Greeting title="Selamat datang 👨‍👩‍👧‍👦" sub="Pantau perkembangan belajar, nilai, dan kehadiran anak Anda secara real-time." />
      <div className="grid gap-6 lg:grid-cols-2">
        {(d.children ?? []).map((child: any) => (
          <Card key={child.student_id}>
            <div className="flex items-center gap-4">
              <Avatar name={child.name} color="#d97706" size="lg" />
              <div className="flex-1">
                <p className="font-display text-base font-bold text-slate-900">{child.name}</p>
                <p className="text-xs text-slate-500">Kelas {child.class_name}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-amber-50 p-3 text-center">
                <Award className="mx-auto mb-1 h-4 w-4 text-amber-600" />
                <p className="font-display text-lg font-bold text-slate-900">{child.average_grade || '—'}</p>
                <p className="text-[10px] font-semibold text-slate-500">Rata-rata nilai</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-center">
                <CalendarCheck className="mx-auto mb-1 h-4 w-4 text-emerald-600" />
                <p className="font-display text-lg font-bold text-slate-900">{child.attendance_pct}%</p>
                <p className="text-[10px] font-semibold text-slate-500">Kehadiran</p>
              </div>
              <div className="rounded-xl bg-indigo-50 p-3 text-center">
                <ClipboardList className="mx-auto mb-1 h-4 w-4 text-indigo-600" />
                <p className="font-display text-lg font-bold text-slate-900">{child.pending_assignments}</p>
                <p className="text-[10px] font-semibold text-slate-500">Tugas aktif</p>
              </div>
            </div>
          </Card>
        ))}
        {(!d.children || d.children.length === 0) && (
          <Card><p className="py-4 text-center text-sm text-slate-400">Belum ada anak terhubung ke akun ini.</p></Card>
        )}
      </div>
    </div>
  );
}

function KepsekDash({ d }: { d: Record<string, any> }) {
  return (
    <div>
      <Greeting title="Dashboard Kepala Sekolah 📊" sub={`${SCHOOL.name} · Tahun Ajaran ${SCHOOL.year} · Semester ${SCHOOL.semester}`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
        <StatCard icon={Users} label="Total Siswa" value={d.total_students} color="bg-indigo-50 text-indigo-600" />
        <StatCard icon={GraduationCap} label="Total Guru" value={d.total_teachers} color="bg-violet-50 text-violet-600" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Performa Kelas — Rata-rata Nilai">
            {(!d.class_averages || d.class_averages.length === 0) ? (
              <p className="py-4 text-center text-sm text-slate-400">Belum ada data nilai.</p>
            ) : (
              <div className="space-y-3">
                {d.class_averages.map((c: any) => (
                  <div key={c.class_id} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs font-bold text-slate-600">{c.class_name}</span>
                    <div className="flex-1"><ProgressBar value={c.average_grade} color={c.average_grade >= 80 ? 'bg-emerald-500' : c.average_grade >= 75 ? 'bg-indigo-500' : 'bg-amber-500'} /></div>
                    <span className="w-8 text-right text-sm font-bold text-slate-800">{c.average_grade}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Siswa Performa Rendah" subtitle="Rata-rata < 75 — perlu intervensi" className="border-rose-100">
            {(!d.low_performers || d.low_performers.length === 0) ? (
              <p className="py-4 text-center text-sm text-slate-400">Tidak ada siswa di bawah ambang batas.</p>
            ) : (
              <div className="space-y-2">
                {d.low_performers.map((s: any) => (
                  <div key={s.student_id} className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50/40 p-3">
                    <Avatar name={s.name} color="#f43f5e" size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-800">{s.name}</p>
                      <p className="text-[10px] text-slate-500">{s.class_name}</p>
                    </div>
                    <Badge color="rose">{s.average_grade}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card title="Rekap Presensi Hari Ini">
            <div className="grid grid-cols-2 gap-2">
              {[
                { l: 'Hadir', v: d.attendance_today?.hadir ?? 0, c: 'bg-emerald-50 text-emerald-700' },
                { l: 'Izin', v: d.attendance_today?.izin ?? 0, c: 'bg-sky-50 text-sky-700' },
                { l: 'Sakit', v: d.attendance_today?.sakit ?? 0, c: 'bg-amber-50 text-amber-700' },
                { l: 'Alpa', v: d.attendance_today?.alpa ?? 0, c: 'bg-rose-50 text-rose-700' },
              ].map(x => (
                <div key={x.l} className={cn('rounded-xl p-3 text-center', x.c)}>
                  <p className="font-display text-lg font-bold">{x.v}</p>
                  <p className="text-[10px] font-semibold">{x.l}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AdminDash({ d }: { d: Record<string, any> }) {
  return (
    <div>
      <Greeting title="Panel Administrasi Sekolah 🏫" sub="Kelola data akademik, pengguna, dan sistem" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Siswa" value={d.total_students} color="bg-indigo-50 text-indigo-600" />
        <StatCard icon={GraduationCap} label="Guru" value={d.total_teachers} color="bg-violet-50 text-violet-600" />
        <StatCard icon={BookOpen} label="Kelas / Mapel" value={`${d.total_classes} / ${d.total_subjects}`} color="bg-sky-50 text-sky-600" />
        <StatCard icon={CalendarCheck} label="Kehadiran Hari Ini" value={`${d.attendance_today_pct}%`} color="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="mt-6">
        <Card title="Statistik Tugas & Pengumpulan">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-indigo-50 p-4 text-center">
              <p className="font-display text-2xl font-bold text-indigo-700">{d.assignments_total}</p>
              <p className="text-[11px] font-semibold text-indigo-600">Tugas dibuat</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4 text-center">
              <p className="font-display text-2xl font-bold text-emerald-700">{d.submissions_collected}</p>
              <p className="text-[11px] font-semibold text-emerald-600">Pengumpulan masuk</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4 text-center">
              <p className="font-display text-2xl font-bold text-amber-700">{d.submissions_pending_grade}</p>
              <p className="text-[11px] font-semibold text-amber-600">Menunggu dinilai</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
