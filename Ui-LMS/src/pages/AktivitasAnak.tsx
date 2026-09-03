import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ClipboardList, MessageSquareText } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { cn, gradeColor, attendancePct, fmtDate, fmtDateTime, isOverdue, daysUntil } from '../lib/utils';
import { Avatar, Badge, Card, PageHeader, ProgressBar } from '../components/ui';

/** Judul per tab — tab-nya datang dari URL (`/aktivitas/:tab`), digerakkan menu sidebar ortu. */
const TAB_META: Record<string, { title: string; desc: string }> = {
  nilai: { title: 'Nilai Anak', desc: 'Nilai tugas, quiz, PTS, dan PAS beserta nilai akhir tiap mata pelajaran' },
  presensi: { title: 'Presensi Anak', desc: 'Rekap kehadiran anak semester ini — hadir, izin, sakit, alpa, terlambat' },
  tugas: { title: 'Tugas Anak', desc: 'Daftar tugas beserta tenggat dan status pengumpulannya' },
  jadwal: { title: 'Jadwal Anak', desc: 'Jadwal pelajaran mingguan di kelas anak' },
  progress: { title: 'Progress Belajar Anak', desc: 'Progres penyelesaian materi per mata pelajaran' },
  catatan: { title: 'Catatan Guru', desc: 'Catatan kualitatif dari guru tentang perkembangan anak' },
};
const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

interface ApiChild { student_id: number; name: string; nis: string | null; class_name: string | null }
interface ApiGradeRow { student_id: number; tugas: number; quiz: number; pts: number; pas: number; final: number; letter: string; feedback: string | null; subject_name: string }
interface ApiAttendanceSummary { student_id: number; hadir: number; izin: number; sakit: number; alpa: number; terlambat: number }
interface ApiParentAssignment { id: number; title: string; deadline: string; status: string; score: number | null }
interface ApiParentSchedule { day: number; subject_name: string; teacher_name: string; start_time: string; end_time: string; room: string | null }
interface ApiCourseRef { id: number; teaching_assignment: { subject: { name: string; code: string; color: string }; school_class: { name: string } } }
interface ApiProgressRow { student_id: number; done: number; total: number; percent: number }
interface ApiTeacherNote { id: number; note: string; created_at: string; teacher: { id: number; name: string } }

const statusLabel: Record<string, string> = { belum: 'Belum dikumpulkan', sudah: 'Sudah dikumpulkan', revisi: 'Perlu revisi', dinilai: 'Dinilai' };
const statusColor: Record<string, string> = { belum: 'slate', sudah: 'sky', revisi: 'amber', dinilai: 'emerald' };

export default function AktivitasAnak() {
  const { tab = 'nilai' } = useParams();
  const [children, setChildren] = useState<ApiChild[] | null>(null);
  const [childId, setChildId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const [grades, setGrades] = useState<{ grades: ApiGradeRow[]; average: number } | null>(null);
  const [attendance, setAttendance] = useState<ApiAttendanceSummary | null>(null);
  const [assignments, setAssignments] = useState<ApiParentAssignment[] | null>(null);
  const [schedule, setSchedule] = useState<ApiParentSchedule[] | null>(null);
  const [progressRows, setProgressRows] = useState<{ course: ApiCourseRef; progress: ApiProgressRow | null }[] | null>(null);
  const [notes, setNotes] = useState<ApiTeacherNote[] | null>(null);

  useEffect(() => {
    api.get<{ data: ApiChild[] }>('/parent/children')
      .then(res => { setChildren(res.data); setChildId(res.data[0]?.student_id ?? null); })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'));
  }, []);

  // reset cache tiap ganti anak
  useEffect(() => {
    setGrades(null); setAttendance(null); setAssignments(null); setSchedule(null); setProgressRows(null); setNotes(null);
  }, [childId]);

  useEffect(() => {
    if (!childId) return;
    const q = `?student_id=${childId}`;

    if (tab === 'nilai' && grades === null) {
      api.get<{ data: { grades: ApiGradeRow[]; average: number } }>(`/grades/me${q}`).then(r => setGrades(r.data)).catch(() => setGrades({ grades: [], average: 0 }));
    }
    if (tab === 'presensi' && attendance === null) {
      api.get<{ data: ApiAttendanceSummary[] }>(`/attendance/summary${q}`)
        .then(r => setAttendance(r.data[0] ?? { student_id: childId, hadir: 0, izin: 0, sakit: 0, alpa: 0, terlambat: 0 }))
        .catch(() => setAttendance({ student_id: childId, hadir: 0, izin: 0, sakit: 0, alpa: 0, terlambat: 0 }));
    }
    if (tab === 'tugas' && assignments === null) {
      api.get<{ data: ApiParentAssignment[] }>(`/parent/assignments${q}`).then(r => setAssignments(r.data)).catch(() => setAssignments([]));
    }
    if (tab === 'jadwal' && schedule === null) {
      api.get<{ data: ApiParentSchedule[] }>(`/parent/schedule${q}`).then(r => setSchedule(r.data)).catch(() => setSchedule([]));
    }
    if (tab === 'progress' && progressRows === null) {
      const child = children?.find(c => c.student_id === childId);
      api.get<{ data: ApiCourseRef[] }>('/courses')
        .then(async res => {
          const myCourses = child?.class_name ? res.data.filter(c => c.teaching_assignment.school_class.name === child.class_name) : res.data;
          const rows = await Promise.all(myCourses.map(c => api.get<{ data: ApiProgressRow[] }>(`/courses/${c.id}/progress`)
            .then(r => ({ course: c, progress: r.data.find(row => row.student_id === childId) ?? null }))));
          setProgressRows(rows);
        })
        .catch(() => setProgressRows([]));
    }
    if (tab === 'catatan' && notes === null) {
      api.get<{ data: ApiTeacherNote[] }>(`/students/${childId}/notes`).then(r => setNotes(r.data)).catch(() => setNotes([]));
    }
  }, [tab, childId, children, grades, attendance, assignments, schedule, progressRows, notes]);

  const meta = TAB_META[tab];
  if (!meta) return <Navigate to="/aktivitas/nilai" replace />;

  if (error) return <Card className="border-rose-200 bg-rose-50/60"><p className="text-sm font-semibold text-rose-700">{error}</p></Card>;
  if (children === null) return <div className="py-10 text-center text-sm text-slate-400">Memuat data anak…</div>;
  if (children.length === 0) return (
    <div>
      <PageHeader title={meta.title} desc={meta.desc} />
      <Card><p className="py-8 text-center text-sm text-slate-400">Belum ada data anak yang terhubung ke akun ini.</p></Card>
    </div>
  );

  const child = children.find(c => c.student_id === childId)!;

  return (
    <div>
      <PageHeader title={meta.title} desc={meta.desc} />

      {/* Pemilih anak hanya relevan kalau anaknya lebih dari satu. */}
      {children.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-3">
          {children.map(c => (
            <button key={c.student_id} onClick={() => setChildId(c.student_id)} className={cn('flex items-center gap-3 rounded-2xl border-2 bg-white p-4 pr-6 text-left transition', childId === c.student_id ? 'border-indigo-500 shadow-md shadow-indigo-100' : 'border-slate-200 hover:border-indigo-200')}>
              <Avatar name={c.name} color="#6366f1" size="lg" />
              <div>
                <p className="text-sm font-bold text-slate-900">{c.name}</p>
                <p className="text-xs text-slate-500">{c.class_name ? `Kelas ${c.class_name}` : ''}{c.nis ? ` · NIS ${c.nis}` : ''}</p>
              </div>
              {childId === c.student_id && <Badge color="indigo" className="ml-2">Dipilih</Badge>}
            </button>
          ))}
        </div>
      )}
      {children.length === 1 && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <Avatar name={child.name} color="#6366f1" size="lg" />
          <div>
            <p className="text-sm font-bold text-slate-900">{child.name}</p>
            <p className="text-xs text-slate-500">{child.class_name ? `Kelas ${child.class_name}` : ''}{child.nis ? ` · NIS ${child.nis}` : ''}</p>
          </div>
        </div>
      )}

      {tab === 'nilai' && (
        grades === null ? <p className="py-8 text-center text-sm text-slate-400">Memuat nilai…</p> :
        grades.grades.length === 0 ? (
          <Card><p className="py-8 text-center text-sm text-slate-400">Nilai {child.name.split(' ')[0]} belum dipublikasikan semester ini.</p></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {grades.grades.map(g => (
              <Card key={g.subject_name}>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">{g.subject_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl font-bold text-slate-900">{g.final}</p>
                    <span className={cn('rounded-lg px-2 py-0.5 text-[10px] font-bold', gradeColor(g.letter))}>Grade {g.letter}</span>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[10px]">
                  {[['Tugas', g.tugas], ['Quiz', g.quiz], ['PTS', g.pts], ['PAS', g.pas]].map(([l, v]) => (
                    <div key={String(l)} className="rounded-lg bg-slate-50 p-2"><p className="font-bold text-slate-700">{v}</p><p className="text-slate-400">{l}</p></div>
                  ))}
                </div>
                <ProgressBar value={g.final} className="mt-3" color={g.final >= 80 ? 'bg-emerald-500' : g.final >= 70 ? 'bg-amber-500' : 'bg-rose-500'} />
              </Card>
            ))}
          </div>
        )
      )}

      {tab === 'presensi' && (
        attendance === null ? <p className="py-8 text-center text-sm text-slate-400">Memuat presensi…</p> : (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="text-center">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Kehadiran {child.name.split(' ')[0]}</p>
              <p className="font-display mt-2 text-5xl font-bold text-emerald-600">{attendancePct(attendance)}%</p>
              <ProgressBar value={attendancePct(attendance)} className="mt-4" color="bg-emerald-500" />
            </Card>
            <Card title="Rincian Semester" className="lg:col-span-2">
              <div className="grid grid-cols-5 gap-3">
                {[['Hadir', attendance.hadir, 'text-emerald-600'], ['Izin', attendance.izin, 'text-sky-600'], ['Sakit', attendance.sakit, 'text-amber-600'], ['Alpa', attendance.alpa, 'text-rose-600'], ['Terlambat', attendance.terlambat, 'text-violet-600']].map(([l, v, c]) => (
                  <div key={String(l)} className="rounded-xl bg-slate-50 p-4 text-center">
                    <p className={cn('font-display text-2xl font-bold', String(c))}>{v}</p>
                    <p className="mt-1 text-[10px] font-bold text-slate-500">{l}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )
      )}

      {tab === 'tugas' && (
        assignments === null ? <p className="py-8 text-center text-sm text-slate-400">Memuat tugas…</p> :
        assignments.length === 0 ? <Card><p className="py-8 text-center text-sm text-slate-400">Belum ada tugas.</p></Card> : (
          <div className="space-y-3">
            {assignments.map(a => (
              <Card key={a.id}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><ClipboardList className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">{a.title}</p>
                    <p className="text-xs text-slate-500">tenggat {fmtDate(a.deadline)} {!isOverdue(a.deadline) && `(${Math.max(0, daysUntil(a.deadline))} hari lagi)`}</p>
                  </div>
                  <Badge color={statusColor[a.status] ?? 'slate'}>{a.status === 'dinilai' ? `Nilai ${a.score}` : statusLabel[a.status] ?? a.status}</Badge>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {tab === 'jadwal' && (
        schedule === null ? <p className="py-8 text-center text-sm text-slate-400">Memuat jadwal…</p> : (
          <Card title={`Jadwal Kelas ${child.class_name ?? ''}`} subtitle="Minggu ini" pad={false}>
            <div className="divide-y divide-slate-50">
              {DAYS.map((d, di) => {
                const items = schedule.filter(s => s.day === di);
                if (!items.length) return null;
                return (
                  <div key={d} className="px-5 py-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">{d}</p>
                    <div className="flex flex-wrap gap-2">
                      {items.map((s, i) => (
                        <span key={i} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-1.5 text-xs">
                          <b>{s.subject_name}</b> <span className="text-slate-400">{s.start_time}–{s.end_time} · {s.teacher_name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
              {schedule.length === 0 && <p className="py-8 text-center text-xs text-slate-400">Belum ada jadwal.</p>}
            </div>
          </Card>
        )
      )}

      {tab === 'progress' && (
        progressRows === null ? <p className="py-8 text-center text-sm text-slate-400">Memuat progress…</p> : (
          <Card title="Progress Mata Pelajaran">
            <div className="space-y-3">
              {progressRows.map(({ course, progress }) => (
                <div key={course.id}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">{course.teaching_assignment.subject.name}</span>
                    <span className="text-slate-400">{progress ? `${progress.done}/${progress.total} materi` : '—'}</span>
                  </div>
                  <ProgressBar value={progress?.percent ?? 0} color="bg-indigo-500" />
                </div>
              ))}
              {progressRows.length === 0 && <p className="py-4 text-center text-xs text-slate-400">Belum ada mata pelajaran.</p>}
            </div>
          </Card>
        )
      )}

      {tab === 'catatan' && (
        notes === null ? <p className="py-8 text-center text-sm text-slate-400">Memuat catatan…</p> : (
          <div className="space-y-4">
            {notes.length === 0 ? (
              <Card><p className="py-8 text-center text-sm text-slate-400">Belum ada catatan guru untuk {child.name}.</p></Card>
            ) : notes.map(n => (
              <Card key={n.id}>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><MessageSquareText className="h-5 w-5" /></div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{n.teacher.name}</p>
                    <p className="text-[10px] text-slate-400">{fmtDateTime(n.created_at)}</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">"{n.note}"</p>
                  </div>
                </div>
              </Card>
            ))}
            <p className="text-center text-[11px] text-slate-400">
              Ingin berdiskusi dengan wali kelas? <Link to="/komunikasi" className="font-bold text-indigo-600 hover:underline">Buka komunikasi</Link>
            </p>
          </div>
        )
      )}
    </div>
  );
}
