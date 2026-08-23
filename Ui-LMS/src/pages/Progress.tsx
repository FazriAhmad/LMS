import { Fragment, useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, ChevronDown, Star, Upload, UserX, Zap, TrendingUp } from 'lucide-react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { cn, fmtDate, timeAgo } from '../lib/utils';
import { Badge, Card, PageHeader, ProgressBar, StatCard, TableWrap, Td, Th, Avatar, inputCls } from '../components/ui';

const ACT_ICON: Record<string, typeof Zap> = {
  materi_selesai: CheckCircle2, tugas_dikumpulkan: Upload, quiz_dikerjakan: Zap, ujian_disubmit: Star,
};

interface ApiCourseRef { id: number; teaching_assignment: { subject: { name: string; color: string }; school_class: { id: number; name: string } } }
interface ApiProgressRow { student_id: number; student_name: string; done: number; total: number; percent: number }
interface ApiActivityEvent { type: string; description: string; at: string | null }
interface ApiInactiveStudent { student_id: number; student_name: string; last_activity_at: string | null }

const isStaffRole = (role: string) => ['guru', 'walikelas', 'admin', 'superadmin', 'kepsek'].includes(role);

function ActivityFeed({ events }: { events: ApiActivityEvent[] }) {
  if (events.length === 0) return <p className="py-4 text-center text-xs text-slate-400">Belum ada aktivitas.</p>;
  return (
    <div className="space-y-3">
      {events.slice(0, 8).map((ac, i) => {
        const Ic = ACT_ICON[ac.type] || Zap;
        return (
          <div key={i} className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
              <Ic className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-xs text-slate-700">{ac.description}</p>
              <p className="text-[10px] text-slate-400">{ac.at ? timeAgo(ac.at) : '—'}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Progress() {
  const { user } = useStore();
  const isStaff = !!user && isStaffRole(user.role);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // siswa/ortu
  const [studentName, setStudentName] = useState('');
  const [courseRows, setCourseRows] = useState<{ course: ApiCourseRef; progress: ApiProgressRow }[] | null>(null);
  const [events, setEvents] = useState<ApiActivityEvent[]>([]);

  // staff
  const [courses, setCourses] = useState<ApiCourseRef[]>([]);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [rows, setRows] = useState<ApiProgressRow[]>([]);
  const [inactive, setInactive] = useState<ApiInactiveStudent[]>([]);
  const [expandedStudent, setExpandedStudent] = useState<number | null>(null);
  const [studentEvents, setStudentEvents] = useState<ApiActivityEvent[] | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError('');

    if (isStaff) {
      api.get<{ data: ApiCourseRef[] }>('/courses')
        .then(res => { setCourses(res.data); setCourseId(res.data[0]?.id ?? null); })
        .catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'))
        .finally(() => setLoading(false));
      return;
    }

    const loadFor = async (studentId: number, name: string) => {
      setStudentName(name);
      const actRes = await api.get<{ data: ApiActivityEvent[] }>(`/students/${studentId}/activity`);
      setEvents(actRes.data);
    };

    if (user.role === 'siswa') {
      api.get<{ data: ApiCourseRef[] }>('/courses')
        .then(async cs => {
          const rowsRes = await Promise.all(cs.data.map(c => api.get<{ data: ApiProgressRow }>(`/courses/${c.id}/progress`).then(r => ({ course: c, progress: r.data }))));
          setCourseRows(rowsRes);
          await loadFor(Number(user.id), user.name);
        })
        .catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'))
        .finally(() => setLoading(false));
    } else if (user.role === 'ortu') {
      api.get<{ data: { student_id: number; name: string }[] }>('/parent/children')
        .then(async res => {
          const child = res.data[0];
          if (!child) { setLoading(false); return; }
          setCourseRows(null);
          await loadFor(child.student_id, child.name);
        })
        .catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user, isStaff]);

  useEffect(() => {
    if (!isStaff || !courseId) return;
    const course = courses.find(c => c.id === courseId);
    if (!course) return;
    setRows([]);
    setInactive([]);
    setExpandedStudent(null);
    Promise.all([
      api.get<{ data: ApiProgressRow[] }>(`/courses/${courseId}/progress`),
      api.get<{ data: ApiInactiveStudent[] }>(`/students/inactive?days=5&school_class_id=${course.teaching_assignment.school_class.id}`),
    ]).then(([progRes, inactiveRes]) => {
      setRows(progRes.data);
      setInactive(inactiveRes.data);
    }).catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'));
  }, [isStaff, courseId, courses]);

  const toggleStudent = (studentId: number) => {
    if (expandedStudent === studentId) { setExpandedStudent(null); return; }
    setExpandedStudent(studentId);
    setStudentEvents(null);
    api.get<{ data: ApiActivityEvent[] }>(`/students/${studentId}/activity`)
      .then(res => setStudentEvents(res.data))
      .catch(() => setStudentEvents([]));
  };

  if (loading) return <div className="py-10 text-center text-sm text-slate-400">Memuat progress…</div>;
  if (error) return <Card className="border-rose-200 bg-rose-50/60"><p className="text-sm font-semibold text-rose-700">{error}</p></Card>;

  if (!isStaff) {
    const totalDone = courseRows?.reduce((a, r) => a + r.progress.done, 0) ?? 0;
    const totalMats = courseRows?.reduce((a, r) => a + r.progress.total, 0) ?? 0;
    const tugasCount = events.filter(e => e.type === 'tugas_dikumpulkan').length;
    const quizCount = events.filter(e => e.type === 'quiz_dikerjakan' || e.type === 'ujian_disubmit').length;
    const materiCount = events.filter(e => e.type === 'materi_selesai').length;
    const recent30 = events.filter(e => e.at && (Date.now() - new Date(e.at).getTime()) < 30 * 86400000).length;

    return (
      <div>
        <PageHeader title="Progress Belajar" desc={user?.role === 'ortu' ? `Perkembangan ${studentName}` : 'Perkembangan belajar kamu di LMS'} />
        {user?.role === 'ortu' && !studentName ? (
          <Card><p className="py-8 text-center text-sm text-slate-400">Belum ada data anak yang terhubung ke akun ini.</p></Card>
        ) : (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {courseRows ? (
                <StatCard icon={BookOpen} label="Materi Selesai" value={`${totalDone}/${totalMats}`} color="bg-indigo-50 text-indigo-600" />
              ) : (
                <StatCard icon={BookOpen} label="Materi Diselesaikan" value={`${materiCount}×`} color="bg-indigo-50 text-indigo-600" />
              )}
              <StatCard icon={Upload} label="Tugas Dikumpulkan" value={tugasCount} color="bg-emerald-50 text-emerald-600" />
              <StatCard icon={Zap} label="Quiz & Ujian Dikerjakan" value={quizCount} color="bg-violet-50 text-violet-600" />
              <StatCard icon={TrendingUp} label="Aktivitas 30 Hari" value={recent30} color="bg-amber-50 text-amber-600" />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {courseRows && (
                <Card title="Progress per Mata Pelajaran">
                  <div className="space-y-4">
                    {courseRows.map(({ course, progress }) => (
                      <div key={course.id}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="font-semibold text-slate-700">{course.teaching_assignment.subject.name}</span>
                          <span className="text-slate-400">{progress.done}/{progress.total} materi</span>
                        </div>
                        <ProgressBar value={progress.percent} color="bg-indigo-500" />
                      </div>
                    ))}
                    {courseRows.length === 0 && <p className="py-4 text-center text-xs text-slate-400">Belum ada mata pelajaran.</p>}
                  </div>
                </Card>
              )}
              <Card title="Aktivitas Terbaru" className={cn(!courseRows && 'lg:col-span-2')}>
                <ActivityFeed events={events} />
              </Card>
            </div>
          </>
        )}
      </div>
    );
  }

  // staff view
  const activeCount = rows.length - inactive.length;
  const avgPct = rows.length ? Math.round(rows.reduce((a, r) => a + r.percent, 0) / rows.length) : 0;
  const selectedCourse = courses.find(c => c.id === courseId);

  return (
    <div>
      <PageHeader title="Progress & Aktivitas Siswa" desc="Progress materi per mata pelajaran dan deteksi siswa tidak aktif" />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-slate-600">Mata Pelajaran</span>
          <select className={cn(inputCls, 'w-auto')} value={courseId ?? ''} onChange={e => setCourseId(Number(e.target.value))}>
            {courses.map(c => <option key={c.id} value={c.id}>{c.teaching_assignment.subject.name} — {c.teaching_assignment.school_class.name}</option>)}
          </select>
        </div>
      </Card>

      {courses.length === 0 && <Card><p className="py-8 text-center text-sm text-slate-400">Belum ada mata pelajaran yang diampu.</p></Card>}

      {selectedCourse && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard icon={TrendingUp} label="Rata-rata Progress Materi" value={`${avgPct}%`} color="bg-indigo-50 text-indigo-600" />
            <StatCard icon={CheckCircle2} label="Siswa Aktif" value={`${activeCount}/${rows.length}`} color="bg-emerald-50 text-emerald-600" />
            <StatCard icon={UserX} label="Siswa Tidak Aktif" value={inactive.length} sub="Tidak ada aktivitas LMS > 5 hari" color="bg-rose-50 text-rose-600" />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <TableWrap>
                <thead className="bg-slate-50">
                  <tr><Th>Siswa</Th><Th>Progress Materi</Th><Th>Status</Th><Th></Th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map(r => {
                    const aktif = !inactive.some(i => i.student_id === r.student_id);
                    const expanded = expandedStudent === r.student_id;
                    return (
                      <Fragment key={r.student_id}>
                        <tr className="cursor-pointer hover:bg-slate-50/60" onClick={() => toggleStudent(r.student_id)}>
                          <Td>
                            <div className="flex items-center gap-2">
                              <Avatar name={r.student_name} color={aktif ? '#6366f1' : '#f43f5e'} size="sm" />
                              <p className="text-xs font-bold">{r.student_name}</p>
                            </div>
                          </Td>
                          <Td><div className="flex items-center gap-2"><ProgressBar value={r.percent} className="w-20" color={r.percent < 45 ? 'bg-rose-400' : 'bg-indigo-500'} /><span className="text-xs font-bold">{r.percent}%</span><span className="text-[10px] text-slate-400">({r.done}/{r.total})</span></div></Td>
                          <Td>{aktif ? <Badge color="emerald">Aktif</Badge> : <Badge color="rose"><UserX className="h-3 w-3" /> Tidak aktif</Badge>}</Td>
                          <Td><ChevronDown className={cn('h-4 w-4 text-slate-400 transition', expanded && 'rotate-180')} /></Td>
                        </tr>
                        {expanded && (
                          <tr>
                            <td colSpan={4} className="bg-slate-50/60 px-4 py-3">
                              {studentEvents === null ? <p className="text-xs text-slate-400">Memuat aktivitas…</p> : <ActivityFeed events={studentEvents} />}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </TableWrap>
              {rows.length === 0 && <Card><p className="py-8 text-center text-sm text-slate-400">Belum ada siswa di kelas ini.</p></Card>}
            </div>
            <div>
              <Card title="Siswa Tidak Aktif" subtitle="Tidak ada aktivitas LMS > 5 hari" className="border-rose-100">
                {inactive.length === 0 ? <p className="py-4 text-center text-xs text-slate-400">Semua siswa aktif 🎉</p> : (
                  <div className="space-y-2">
                    {inactive.map(s => (
                      <div key={s.student_id} className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50/40 p-3">
                        <Avatar name={s.student_name} color="#f43f5e" size="sm" />
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-800">{s.student_name}</p>
                          <p className="text-[10px] text-slate-500">{s.last_activity_at ? `Aktivitas terakhir ${fmtDate(s.last_activity_at)}` : 'Belum pernah ada aktivitas tercatat'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
