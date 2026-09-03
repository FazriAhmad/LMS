import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Clock, Plus, AlertTriangle, Search, Pencil, Trash2, HelpCircle } from 'lucide-react';
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
  questions: ApiQuestion[];
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

  // Filter daftar tugas — kelas, deadline, dan status soal.
  const [search, setSearch] = useState('');
  const [kelasF, setKelasF] = useState('all');
  const [deadlineF, setDeadlineF] = useState('all');
  const [soalF, setSoalF] = useState('all');

  const isStaff = !!user && isStaffRole(user.role);
  const selectedCourse = courses.find(c => c.id === courseId);
  const subjectId = selectedCourse?.teaching_assignment.subject.id;
  const kelasOptions = useMemo(
    () => Array.from(new Set(courses.map(c => c.teaching_assignment.school_class.name))).sort(),
    [courses]
  );

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

  const deleteAssignment = async (a: ApiAssignment) => {
    if (!window.confirm(`Hapus tugas "${a.title}"? Semua pengumpulan siswa untuk tugas ini ikut terhapus.`)) return;
    try {
      await api.delete(`/assignments/${a.id}`);
      toast('Tugas dihapus');
      setAssignments(list => list.filter(x => x.id !== a.id));
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menghapus tugas', 'error');
    }
  };

  const filtered = useMemo(() => assignments.filter(a => {
    const matchSearch = search === '' || a.title.toLowerCase().includes(search.toLowerCase());
    const matchKelas = kelasF === 'all' || a.course.teaching_assignment.school_class.name === kelasF;
    const matchDeadline = deadlineF === 'all'
      || (deadlineF === 'akan_datang' && !isOverdue(a.deadline))
      || (deadlineF === 'lewat' && isOverdue(a.deadline));
    const matchSoal = soalF === 'all'
      || (soalF === 'bersoal' && a.questions.length > 0)
      || (soalF === 'tanpa_soal' && a.questions.length === 0);
    return matchSearch && matchKelas && matchDeadline && matchSoal;
  }), [assignments, search, kelasF, deadlineF, soalF]);

  if (loading) return <div className="py-10 text-center text-sm text-slate-400">Memuat tugas…</div>;
  if (error) return <Card className="border-rose-200 bg-rose-50/60"><p className="text-sm font-semibold text-rose-700">{error}</p></Card>;

  return (
    <div>
      <PageHeader
        title="Tugas"
        desc="Pembuatan, pengumpulan online, rubrik penilaian, revisi, dan feedback"
        action={isStaff ? <Button onClick={openCreate}><Plus className="h-4 w-4" /> Buat Tugas</Button> : undefined}
      />
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari judul tugas…" className="w-full bg-transparent text-sm outline-none" />
          </div>
          <select value={kelasF} onChange={e => setKelasF(e.target.value)} className={cn(inputCls, 'w-auto')}>
            <option value="all">Semua Kelas</option>
            {kelasOptions.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <select value={deadlineF} onChange={e => setDeadlineF(e.target.value)} className={cn(inputCls, 'w-auto')}>
            <option value="all">Semua Deadline</option>
            <option value="akan_datang">Belum Lewat</option>
            <option value="lewat">Sudah Lewat</option>
          </select>
          <select value={soalF} onChange={e => setSoalF(e.target.value)} className={cn(inputCls, 'w-auto')}>
            <option value="all">Semua Status Soal</option>
            <option value="bersoal">Bersoal</option>
            <option value="tanpa_soal">Tanpa Soal</option>
          </select>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map(a => {
          const m = a.course.teaching_assignment.subject;
          const overdue = isOverdue(a.deadline);
          const sub = a.my_submission;
          return (
            <Card key={a.id} className="flex h-full flex-col transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
              <Link to={`/tugas/${a.id}`} className="flex-1">
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
                  {isStaff && a.questions.length > 0 && (
                    <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-violet-500"><HelpCircle className="h-3 w-3" /> {a.questions.length} soal</span>
                  )}
                </div>
                {a.description && <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-500">{a.description}</p>}
              </Link>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-50 pt-3">
                <span className={cn('flex items-center gap-1 text-[11px] font-semibold', overdue ? 'text-rose-600' : 'text-slate-500')}>
                  <Clock className="h-3.5 w-3.5" /> {fmtDate(a.deadline)}
                  {!overdue && daysUntil(a.deadline) >= 0 && ` · ${daysUntil(a.deadline)} hari lagi`}
                </span>
                {isStaff && (
                  <div className="flex items-center gap-1">
                    <Link to={`/tugas/${a.id}?edit=1`} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600" title="Edit tugas">
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    <button onClick={() => deleteAssignment(a)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" title="Hapus tugas">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {assignments.length > 0 && filtered.length === 0 && (
        <Card><p className="py-8 text-center text-sm text-slate-400">Tidak ada tugas yang cocok dengan filter ini.</p></Card>
      )}

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
