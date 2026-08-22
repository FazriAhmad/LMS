import { useEffect, useState } from 'react';
import { CalendarClock, Clock, DoorOpen } from 'lucide-react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { cn, DAYS, fmtDate, fmtTime } from '../lib/utils';
import { Badge, Card, PageHeader, Tabs } from '../components/ui';

interface ScheduleItem {
  id: number;
  day: number;
  start_time: string;
  end_time: string;
  room: string | null;
  teaching_assignment: { teacher: { name: string }; subject: { name: string; color: string } };
}
interface ParentScheduleItem { day: number; subject_name: string; teacher_name: string; start_time: string; end_time: string; room: string | null }
interface ApiCourse { id: number; teaching_assignment: { subject: { name: string }; school_class: { name: string } } }
interface ApiExam { id: number; title: string; type: string; scheduled_at: string; duration_min: number; status: string }
interface SchoolClassRow { id: number; name: string; homeroom_teacher_id: number | null }

const isStaffRole = (role: string) => ['superadmin', 'admin', 'kepsek', 'guru', 'walikelas'].includes(role);

export default function Jadwal() {
  const { user } = useStore();
  if (!user) return null;
  const isStaff = isStaffRole(user.role);

  const [tab, setTab] = useState(user.role === 'ortu' ? 'jadwal' : isStaff ? 'kelas' : 'jadwal');
  const [classes, setClasses] = useState<SchoolClassRow[]>([]);
  const [classId, setClassId] = useState<number | null>(null);
  const [items, setItems] = useState<(ScheduleItem | ParentScheduleItem)[]>([]);
  const [exams, setExams] = useState<(ApiExam & { course: ApiCourse })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isStaff) {
      api.get<{ data: SchoolClassRow[] }>('/school-classes')
        .then(res => {
          setClasses(res.data);
          const mine = res.data.find(c => String(c.homeroom_teacher_id) === user.id);
          setClassId((mine ?? res.data[0])?.id ?? null);
        })
        .catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'));
    }
  }, [isStaff, user.id]);

  useEffect(() => {
    setLoading(true);
    setError('');
    const loadSchedule = async () => {
      if (user.role === 'ortu') {
        const children = await api.get<{ data: { student_id: number }[] }>('/parent/children');
        const child = children.data[0];
        if (!child) { setItems([]); return; }
        const res = await api.get<{ data: ParentScheduleItem[] }>(`/parent/schedule?student_id=${child.student_id}`);
        setItems(res.data);
        return;
      }
      if (tab === 'guru') {
        const res = await api.get<{ data: ScheduleItem[] }>('/schedule-items');
        setItems(res.data);
        return;
      }
      if (isStaff && classId) {
        const res = await api.get<{ data: ScheduleItem[] }>(`/schedule-items?school_class_id=${classId}`);
        setItems(res.data);
        return;
      }
      if (!isStaff) {
        const res = await api.get<{ data: ScheduleItem[] }>('/schedule-items');
        setItems(res.data);
      }
    };
    const loadExams = async () => {
      const courses = await api.get<{ data: ApiCourse[] }>('/courses');
      const lists = await Promise.all(courses.data.map(c => api.get<{ data: ApiExam[] }>(`/courses/${c.id}/exams`).then(r => r.data.map(e => ({ ...e, course: c })))));
      setExams(lists.flat());
    };

    (tab === 'ujian' ? loadExams() : loadSchedule())
      .catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'))
      .finally(() => setLoading(false));
  }, [tab, classId, isStaff, user.role]);

  const tabs = user.role === 'siswa'
    ? [{ id: 'jadwal', label: 'Jadwal Saya' }, { id: 'ujian', label: 'Jadwal Ujian' }]
    : user.role === 'ortu'
      ? [{ id: 'jadwal', label: 'Jadwal Anak' }]
      : [
          { id: 'kelas', label: 'Jadwal Kelas' },
          ...(user.role === 'guru' || user.role === 'walikelas' ? [{ id: 'guru', label: 'Jadwal Mengajar Saya' }] : []),
          { id: 'ujian', label: 'Jadwal Ujian' },
        ];

  if (error) return <Card className="border-rose-200 bg-rose-50/60"><p className="text-sm font-semibold text-rose-700">{error}</p></Card>;

  return (
    <div>
      <PageHeader
        title="Jadwal"
        desc="Jadwal siswa, guru, kelas, dan ujian — bentrok jadwal dicegah otomatis oleh server saat jadwal dibuat"
        action={
          tab === 'kelas' && isStaff ? (
            <select value={classId ?? ''} onChange={e => setClassId(Number(e.target.value))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-500">
              {classes.map(c => <option key={c.id} value={c.id}>Kelas {c.name}</option>)}
            </select>
          ) : undefined
        }
      />

      <div className="mb-6"><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-400">Memuat jadwal…</div>
      ) : tab === 'ujian' ? (
        <div className="space-y-3">
          {exams.map(e => (
            <Card key={e.id}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">{e.title}</p>
                  <p className="text-xs text-slate-500">
                    {e.type} · {e.course.teaching_assignment.subject.name} · {e.course.teaching_assignment.school_class.name} · {fmtDate(e.scheduled_at)} {fmtTime(e.scheduled_at)} · durasi {e.duration_min} menit
                  </p>
                </div>
                <Badge color={e.status === 'aktif' ? 'emerald' : e.status === 'selesai' ? 'slate' : 'sky'}>
                  {e.status === 'aktif' ? 'Berlangsung' : e.status === 'selesai' ? 'Selesai' : 'Terjadwal'}
                </Badge>
              </div>
            </Card>
          ))}
          {exams.length === 0 && <Card><p className="py-8 text-center text-sm text-slate-400">Belum ada ujian terjadwal.</p></Card>}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          {DAYS.map((dayName, d) => {
            const dayItems = items.filter(s => s.day === d).sort((a, b) => a.start_time.localeCompare(b.start_time));
            const isToday = (new Date().getDay() + 6) % 7 === d;
            return (
              <div key={dayName} className={cn('rounded-2xl border bg-white p-3 shadow-sm', isToday ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200')}>
                <p className={cn('mb-3 flex items-center justify-between px-1 text-xs font-bold uppercase tracking-wide', isToday ? 'text-indigo-700' : 'text-slate-500')}>
                  {dayName}
                  {isToday && <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] text-white">Hari ini</span>}
                </p>
                <div className="space-y-2">
                  {dayItems.length === 0 && <p className="px-1 py-4 text-center text-[11px] text-slate-300">Tidak ada jadwal</p>}
                  {dayItems.map(s => {
                    const subjectName = 'teaching_assignment' in s ? s.teaching_assignment.subject.name : s.subject_name;
                    const teacherName = 'teaching_assignment' in s ? s.teaching_assignment.teacher.name : s.teacher_name;
                    const color = 'teaching_assignment' in s ? s.teaching_assignment.subject.color : '#6366f1';
                    const key = 'id' in s ? s.id : `${s.day}-${s.start_time}`;
                    return (
                      <div key={key} className="rounded-xl border-l-4 bg-slate-50 p-2.5 transition hover:bg-slate-100" style={{ borderLeftColor: color }}>
                        <p className="text-xs font-bold text-slate-800">{subjectName}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500"><Clock className="h-3 w-3" /> {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}</p>
                        {s.room && <p className="flex items-center gap-1 text-[10px] text-slate-500"><DoorOpen className="h-3 w-3" /> {s.room}</p>}
                        <p className="mt-0.5 truncate text-[10px] text-slate-400">{teacherName}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
