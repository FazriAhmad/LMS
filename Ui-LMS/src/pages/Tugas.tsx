import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Clock, Plus, AlertTriangle } from 'lucide-react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { fmtDate, daysUntil, isOverdue, cn } from '../lib/utils';
import { Badge, Button, Card, Modal, PageHeader, inputCls } from '../components/ui';
import QuestionPicker, { type ApiQuestion } from '../components/QuestionPicker';

interface ApiCourse {
  id: number;
  teaching_assignment: { subject: { id: number; name: string; code: string; color: string }; school_class: { name: string } };
}

interface ApiAssignment {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  deadline: string;
  my_submission: { status: string; score: number | null } | null;
}

const isStaffRole = (role: string) => ['guru', 'walikelas', 'admin', 'superadmin', 'kepsek'].includes(role);

export default function Tugas() {
  const { user, toast } = useStore();
  const [courses, setCourses] = useState<ApiCourse[]>([]);
  const [assignments, setAssignments] = useState<(ApiAssignment & { course: ApiCourse })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [courseId, setCourseId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Soal tugas — dipilih dari bank soal atau ditulis baru (yang baru tetap masuk bank).
  const [picked, setPicked] = useState<ApiQuestion[]>([]);

  const isStaff = !!user && isStaffRole(user.role);
  const selectedCourse = courses.find(c => c.id === courseId);
  const subjectId = selectedCourse?.teaching_assignment.subject.id;

  const load = () => {
    setLoading(true);
    api.get<{ data: ApiCourse[] }>('/courses')
      .then(async ({ data: cs }) => {
        setCourses(cs);
        setCourseId(prev => prev ?? cs[0]?.id ?? null);
        const lists = await Promise.all(cs.map(c => api.get<{ data: ApiAssignment[] }>(`/courses/${c.id}/assignments`).then(r => r.data.map(a => ({ ...a, course: c })))));
        setAssignments(lists.flat());
      })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setTitle(''); setDeadline(''); setPicked([]);
    setCreateOpen(true);
  };

  const createAssignment = async () => {
    if (!title || !deadline || !courseId) return;
    setSaving(true);
    try {
      await api.post(`/courses/${courseId}/assignments`, {
        title,
        deadline: deadline.replace('T', ' ') + ':00',
        question_ids: picked.map(q => q.id),
      });
      toast('Tugas berhasil dibuat', 'success');
      setCreateOpen(false);
      setTitle('');
      setDeadline('');
      setPicked([]);
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal membuat tugas', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-10 text-center text-sm text-slate-400">Memuat tugas…</div>;
  if (error) return <Card className="border-rose-200 bg-rose-50/60"><p className="text-sm font-semibold text-rose-700">{error}</p></Card>;

  return (
    <div>
      <PageHeader
        title="Tugas"
        desc="Pembuatan, pengumpulan online, rubrik penilaian, revisi, dan feedback"
        action={isStaff ? <Button onClick={openCreate}><Plus className="h-4 w-4" /> Buat Tugas</Button> : undefined}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {assignments.map(a => {
          const m = a.course.teaching_assignment.subject;
          const overdue = isOverdue(a.deadline);
          const sub = a.my_submission;
          return (
            <Link key={a.id} to={`/tugas/${a.id}`}>
              <Card className="h-full transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white" style={{ backgroundColor: m.color }}>{m.code}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">{a.title}</p>
                    <p className="text-xs text-slate-500">{m.name} · {a.course.teaching_assignment.school_class.name}</p>
                  </div>
                  {!isStaff && sub && (
                    <Badge color={sub.status === 'dinilai' ? 'emerald' : sub.status === 'sudah' ? 'sky' : sub.status === 'revisi' ? 'amber' : overdue ? 'rose' : 'slate'}>
                      {sub.status === 'dinilai' ? `Nilai ${sub.score}` : sub.status === 'sudah' ? 'Terkumpul' : sub.status === 'revisi' ? 'Revisi' : 'Belum'}
                    </Badge>
                  )}
                  {!isStaff && !sub && <Badge color={overdue ? 'rose' : 'slate'}>{overdue ? 'Terlambat' : 'Belum'}</Badge>}
                </div>
                {a.description && <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-500">{a.description}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-50 pt-3">
                  <span className={cn('flex items-center gap-1 text-[11px] font-semibold', overdue ? 'text-rose-600' : 'text-slate-500')}>
                    <Clock className="h-3.5 w-3.5" /> {fmtDate(a.deadline)}
                    {!overdue && daysUntil(a.deadline) >= 0 && ` · ${daysUntil(a.deadline)} hari lagi`}
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Buat Tugas Baru">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Judul tugas</label>
            <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="cth: Latihan Soal Limit Fungsi" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Course</label>
            <select className={inputCls} value={courseId ?? ''} onChange={e => setCourseId(Number(e.target.value))}>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.teaching_assignment.subject.name} — {c.teaching_assignment.school_class.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Deadline</label>
            <input type="datetime-local" className={inputCls} value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>

          <QuestionPicker subjectId={subjectId} picked={picked} onChange={setPicked} />

          <Button className="w-full" disabled={!title || !deadline || saving} onClick={createAssignment}>
            <ClipboardList className="h-4 w-4" /> {saving ? 'Menyimpan…' : 'Publikasikan Tugas'}
          </Button>
        </div>
      </Modal>

      {assignments.length === 0 && (
        <Card><div className="py-8 text-center text-sm text-slate-400"><AlertTriangle className="mx-auto mb-2 h-6 w-6" />Belum ada tugas.</div></Card>
      )}
    </div>
  );
}
