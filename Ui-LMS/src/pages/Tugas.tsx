import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Clock, Plus, AlertTriangle, Database, Trash2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { fmtDate, daysUntil, isOverdue, cn } from '../lib/utils';
import { Badge, Button, Card, Modal, PageHeader, inputCls } from '../components/ui';

interface ApiCourse {
  id: number;
  teaching_assignment: { subject: { id: number; name: string; code: string; color: string }; school_class: { name: string } };
}

interface ApiQuestion {
  id: number;
  type: 'pg' | 'tf' | 'isian' | 'essay';
  text: string;
  options: string[] | null;
  answer: string | null;
  points: number;
  difficulty: string;
}

const TYPE_LABEL: Record<string, string> = { pg: 'Pilihan Ganda', tf: 'Benar/Salah', isian: 'Isian', essay: 'Esai' };

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
  const [bankOpen, setBankOpen] = useState(false);
  const [bank, setBank] = useState<ApiQuestion[] | null>(null);
  const [writeOpen, setWriteOpen] = useState(false);
  const [qType, setQType] = useState<'pg' | 'essay'>('pg');
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qAnswer, setQAnswer] = useState('');
  const [qPoints, setQPoints] = useState('10');
  const [qSaving, setQSaving] = useState(false);

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
    setTitle(''); setDeadline(''); setPicked([]); setBankOpen(false); setWriteOpen(false); setBank(null);
    setCreateOpen(true);
  };

  const loadBank = () => {
    if (!subjectId) return;
    setBank(null);
    setBankOpen(true);
    api.get<{ data: ApiQuestion[] }>(`/questions?subject_id=${subjectId}`)
      .then(r => setBank(r.data))
      .catch(() => setBank([]));
  };

  const togglePick = (q: ApiQuestion) => {
    setPicked(p => p.some(x => x.id === q.id) ? p.filter(x => x.id !== q.id) : [...p, q]);
  };

  const resetWrite = () => { setQType('pg'); setQText(''); setQOptions(['', '', '', '']); setQAnswer(''); setQPoints('10'); };

  /** Soal baru ditulis langsung ke bank soal, lalu dipasang ke tugas — jadi bisa dipakai ulang di quiz/ujian. */
  const saveNewQuestion = async () => {
    if (!subjectId) return;
    setQSaving(true);
    try {
      const body: Record<string, unknown> = {
        subject_id: subjectId,
        type: qType,
        text: qText,
        points: Number(qPoints) || 10,
        difficulty: 'Sedang',
      };
      if (qType === 'pg') {
        body.options = qOptions.filter(o => o.trim());
        body.answer = qAnswer;
      }
      const res = await api.post<{ data: ApiQuestion }>('/questions', body);
      setPicked(p => [...p, res.data]);
      toast('Soal ditambahkan ke bank soal');
      resetWrite();
      setWriteOpen(false);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menyimpan soal', 'error');
    } finally {
      setQSaving(false);
    }
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

          <div className="border-t border-slate-100 pt-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-600">
                Soal {picked.length > 0 && <span className="text-slate-400">({picked.length} soal)</span>}
              </label>
              <div className="flex gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => { setWriteOpen(false); bankOpen ? setBankOpen(false) : loadBank(); }}>
                  <Database className="h-3.5 w-3.5" /> Bank Soal
                </Button>
                <Button size="sm" variant="secondary" onClick={() => { setBankOpen(false); setWriteOpen(o => !o); }}>
                  <Plus className="h-3.5 w-3.5" /> Tulis Soal
                </Button>
              </div>
            </div>
            <p className="mb-2 text-[11px] text-slate-400">
              Opsional. Tanpa soal, siswa mengumpulkan berkas seperti biasa. Soal objektif dinilai otomatis; esai dinilai guru.
            </p>

            {picked.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {picked.map((q, i) => (
                  <div key={q.id} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <span className="mt-0.5 text-[10px] font-bold text-slate-400">{i + 1}.</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-700">{q.text}</p>
                      <p className="text-[10px] text-slate-400">{TYPE_LABEL[q.type]} · {q.points} poin</p>
                    </div>
                    <button onClick={() => togglePick(q)} className="text-slate-400 hover:text-rose-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {bankOpen && (
              <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {bank === null && <p className="py-3 text-center text-xs text-slate-400">Memuat bank soal…</p>}
                {bank?.length === 0 && <p className="py-3 text-center text-xs text-slate-400">Belum ada soal untuk mapel ini.</p>}
                {bank?.map(q => {
                  const on = picked.some(x => x.id === q.id);
                  return (
                    <button key={q.id} onClick={() => togglePick(q)} className={cn('flex w-full items-start gap-2 rounded-lg border p-2 text-left transition', on ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50')}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-700">{q.text}</p>
                        <p className="text-[10px] text-slate-400">{TYPE_LABEL[q.type]} · {q.points} poin · {q.difficulty}</p>
                      </div>
                      {on && <Badge color="indigo">Dipilih</Badge>}
                    </button>
                  );
                })}
              </div>
            )}

            {writeOpen && (
              <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                <select className={inputCls} value={qType} onChange={e => setQType(e.target.value as 'pg' | 'essay')}>
                  <option value="pg">Pilihan Ganda</option>
                  <option value="essay">Esai</option>
                </select>
                <textarea rows={2} className={inputCls} placeholder="Tulis pertanyaan…" value={qText} onChange={e => setQText(e.target.value)} />
                {qType === 'pg' && (
                  <>
                    {qOptions.map((opt, i) => (
                      <input
                        key={i}
                        className={inputCls}
                        placeholder={`Opsi ${String.fromCharCode(65 + i)}`}
                        value={opt}
                        onChange={e => setQOptions(o => o.map((v, vi) => vi === i ? e.target.value : v))}
                      />
                    ))}
                    <select className={inputCls} value={qAnswer} onChange={e => setQAnswer(e.target.value)}>
                      <option value="">— Pilih kunci jawaban —</option>
                      {qOptions.filter(o => o.trim()).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </>
                )}
                <input type="number" min={1} max={100} className={inputCls} placeholder="Poin" value={qPoints} onChange={e => setQPoints(e.target.value)} />
                <Button
                  size="sm"
                  className="w-full"
                  disabled={qSaving || !qText || (qType === 'pg' && (!qAnswer || qOptions.filter(o => o.trim()).length < 2))}
                  onClick={saveNewQuestion}
                >
                  {qSaving ? 'Menyimpan…' : 'Tambahkan Soal'}
                </Button>
              </div>
            )}
          </div>

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
