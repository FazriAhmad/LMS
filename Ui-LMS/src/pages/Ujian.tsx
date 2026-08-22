import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MonitorPlay, Timer, Shuffle, Eye, Play, Plus, ShieldAlert, Save,
  CheckCircle2, HelpCircle, Lock, Unlock, FastForward, ChevronDown,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { cn, fmtDate, fmtTime } from '../lib/utils';
import { Badge, Button, Card, PageHeader, Tabs, TableWrap, Th, Td, Avatar } from '../components/ui';

interface ApiCourseRef {
  id: number;
  teaching_assignment: { teacher: { id: number }; subject: { name: string; code: string; color: string }; school_class: { name: string } };
}
interface ApiQuizItem { id: number; title: string; duration_min: number; max_attempts: number; randomize: boolean; questions_count: number }
interface ApiExamItem { id: number; title: string; type: string; scheduled_at: string; duration_min: number; status: string; questions_count: number }
interface ApiParticipant {
  student_id: number; student_name: string; status: string; tab_switches: number;
  score: number | null; last_saved_at: string | null; submitted_at: string | null;
}

const isStaffRole = (role: string) => ['guru', 'walikelas', 'admin', 'superadmin', 'kepsek'].includes(role);

export default function Ujian() {
  const { user, toast } = useStore();
  const [tab, setTab] = useState('ujian');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exams, setExams] = useState<(ApiExamItem & { course: ApiCourseRef })[]>([]);
  const [quizzes, setQuizzes] = useState<(ApiQuizItem & { course: ApiCourseRef })[]>([]);
  const [monitorId, setMonitorId] = useState<number | null>(null);
  const [participants, setParticipants] = useState<ApiParticipant[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const isStaff = !!user && isStaffRole(user.role);

  const load = () => {
    setLoading(true);
    api.get<{ data: ApiCourseRef[] }>('/courses')
      .then(async ({ data: cs }) => {
        const examLists = await Promise.all(cs.map(c => api.get<{ data: ApiExamItem[] }>(`/courses/${c.id}/exams`).then(r => r.data.map(e => ({ ...e, course: c })))));
        const quizLists = await Promise.all(cs.map(c => api.get<{ data: ApiQuizItem[] }>(`/courses/${c.id}/quizzes`).then(r => r.data.map(q => ({ ...q, course: c })))));
        setExams(examLists.flat());
        setQuizzes(quizLists.flat());
      })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const fetchParticipants = (examId: number) => {
    setParticipants(null);
    api.get<{ data: ApiParticipant[] }>(`/exams/${examId}/participants`)
      .then(res => setParticipants(res.data))
      .catch(e => { toast(e instanceof ApiError ? e.message : 'Gagal memuat monitoring', 'error'); setParticipants([]); });
  };

  const toggleMonitor = (examId: number) => {
    if (monitorId === examId) { setMonitorId(null); return; }
    setMonitorId(examId);
    fetchParticipants(examId);
  };

  const openExam = async (examId: number) => {
    setBusyId(examId);
    try {
      await api.post(`/exams/${examId}/open`);
      toast('Ujian dibuka untuk siswa');
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal membuka ujian', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const closeExam = async (examId: number) => {
    setBusyId(examId);
    try {
      await api.post(`/exams/${examId}/close`);
      toast('Ujian ditutup');
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menutup ujian', 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="py-10 text-center text-sm text-slate-400">Memuat ujian & quiz…</div>;
  if (error) return <Card className="border-rose-200 bg-rose-50/60"><p className="text-sm font-semibold text-rose-700">{error}</p></Card>;

  return (
    <div>
      <PageHeader
        title="Ujian & Quiz"
        desc="CBT dengan timer, soal acak, auto-save, auto grading, dan monitoring integritas"
        action={isStaff ? <Button onClick={() => toast('Pembuatan ujian/quiz baru lewat form belum tersedia di tampilan ini — dibuat lewat API langsung untuk saat ini.', 'info')}><Plus className="h-4 w-4" /> Buat Ujian/Quiz</Button> : undefined}
      />
      <div className="mb-6"><Tabs tabs={[{ id: 'ujian', label: `Ujian Online (${exams.length})` }, { id: 'quiz', label: `Quiz (${quizzes.length})` }]} active={tab} onChange={setTab} /></div>

      {tab === 'ujian' && (
        <div className="space-y-4">
          {exams.length === 0 && <Card><div className="py-8 text-center text-sm text-slate-400">Belum ada ujian.</div></Card>}
          <div className="grid gap-4 md:grid-cols-2">
            {exams.map(e => {
              const ta = e.course.teaching_assignment;
              return (
                <Card key={e.id} className={cn(e.status === 'aktif' && 'border-emerald-300 ring-2 ring-emerald-100')}>
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600"><MonitorPlay className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">{e.title}</p>
                        <Badge color={e.status === 'aktif' ? 'emerald' : e.status === 'selesai' ? 'slate' : 'sky'}>
                          {e.status === 'aktif' ? '● Dibuka' : e.status === 'selesai' ? 'Selesai' : 'Terjadwal'}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{e.type} · {ta.subject.name} · Kelas {ta.school_class.name}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge color="slate"><Timer className="h-3 w-3" /> {e.duration_min} menit</Badge>
                    <Badge color="slate">{e.questions_count} soal</Badge>
                    <Badge color="slate"><Save className="h-3 w-3" /> Auto-save</Badge>
                    <Badge color="slate"><ShieldAlert className="h-3 w-3" /> Kunci fullscreen</Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-3">
                    <p className="text-xs text-slate-500">{fmtDate(e.scheduled_at)} · {fmtTime(e.scheduled_at)}</p>
                    <div className="flex items-center gap-2">
                      {!isStaff && e.status !== 'terjadwal' && (
                        <Link to={`/ujian/${e.id}`}><Button size="sm" variant="success"><Play className="h-3.5 w-3.5" /> Buka Ujian</Button></Link>
                      )}
                      {isStaff && e.status === 'terjadwal' && (
                        <Button size="sm" variant="success" disabled={busyId === e.id} onClick={() => openExam(e.id)}>Buka Ujian</Button>
                      )}
                      {isStaff && e.status === 'aktif' && (
                        <Button size="sm" variant="secondary" disabled={busyId === e.id} onClick={() => closeExam(e.id)}>Tutup Ujian</Button>
                      )}
                      {isStaff && (
                        <Button size="sm" variant="ghost" onClick={() => toggleMonitor(e.id)}>
                          <ChevronDown className={cn('h-3.5 w-3.5 transition', monitorId === e.id && 'rotate-180')} /> Monitoring
                        </Button>
                      )}
                    </div>
                  </div>

                  {isStaff && monitorId === e.id && (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      {participants === null && <p className="py-4 text-center text-xs text-slate-400">Memuat peserta…</p>}
                      {participants?.length === 0 && <p className="py-4 text-center text-xs text-slate-400">Belum ada siswa yang mengerjakan.</p>}
                      {participants && participants.length > 0 && (
                        <TableWrap>
                          <thead className="bg-slate-50">
                            <tr><Th>Siswa</Th><Th>Status</Th><Th>Pindah Tab</Th><Th>Skor</Th><Th>Aksi</Th></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {participants.map(p => (
                              <tr key={p.student_id} className="hover:bg-slate-50/60">
                                <Td><div className="flex items-center gap-2"><Avatar name={p.student_name} color="#8b5cf6" size="sm" /><span className="text-xs font-semibold">{p.student_name}</span></div></Td>
                                <Td>
                                  <Badge color={p.status === 'selesai' ? 'emerald' : p.status === 'sedang' ? 'amber' : p.status === 'terkunci' ? 'rose' : 'slate'}>
                                    {p.status === 'terkunci' && <Lock className="mr-1 inline h-3 w-3" />}{p.status}
                                  </Badge>
                                </Td>
                                <Td>
                                  <span className={cn('text-xs font-bold', p.tab_switches >= 2 ? 'text-rose-600' : p.tab_switches === 1 ? 'text-amber-600' : 'text-slate-400')}>
                                    {p.tab_switches > 0 && <ShieldAlert className="mr-1 inline h-3.5 w-3.5" />}{p.tab_switches}×
                                  </span>
                                </Td>
                                <Td className="font-bold">{p.score ?? '—'}</Td>
                                <Td>
                                  <div className="flex gap-1.5">
                                    {p.status === 'terkunci' && (
                                      <Button size="sm" variant="secondary" onClick={async () => {
                                        try { await api.post(`/exam-participants/${p.student_id}/unlock`); toast('Peserta dibuka kembali'); fetchParticipants(e.id); }
                                        catch (err) { toast(err instanceof ApiError ? err.message : 'Gagal unlock', 'error'); }
                                      }}><Unlock className="h-3.5 w-3.5" /></Button>
                                    )}
                                    {(p.status === 'terkunci' || p.status === 'sedang') && (
                                      <Button size="sm" variant="secondary" onClick={async () => {
                                        try { await api.post(`/exam-participants/${p.student_id}/force-finish`); toast('Ujian siswa diselesaikan paksa'); fetchParticipants(e.id); }
                                        catch (err) { toast(err instanceof ApiError ? err.message : 'Gagal force-finish', 'error'); }
                                      }}><FastForward className="h-3.5 w-3.5" /></Button>
                                    )}
                                  </div>
                                </Td>
                              </tr>
                            ))}
                          </tbody>
                        </TableWrap>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'quiz' && (
        <div className="grid gap-4 md:grid-cols-2">
          {quizzes.map(q => {
            const ta = q.course.teaching_assignment;
            return (
              <Card key={q.id}>
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600"><HelpCircle className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">{q.title}</p>
                    <p className="text-xs text-slate-500">{ta.subject.name} · {ta.school_class.name}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge color="indigo">{q.questions_count} soal</Badge>
                  <Badge color="slate"><Timer className="h-3 w-3" /> {q.duration_min} menit</Badge>
                  {q.randomize && <Badge color="slate"><Shuffle className="h-3 w-3" /> Acak</Badge>}
                  <Badge color="amber">maks {q.max_attempts}× percobaan</Badge>
                </div>
                <div className="mt-4 flex justify-end border-t border-slate-50 pt-3">
                  <Link to={`/quiz/${q.id}`}>
                    <Button size="sm"><Play className="h-3.5 w-3.5" /> Kerjakan</Button>
                  </Link>
                </div>
              </Card>
            );
          })}
          {quizzes.length === 0 && (
            <Card className="md:col-span-2"><div className="py-8 text-center text-sm text-slate-400">Belum ada quiz.</div></Card>
          )}
          <Card className="border-dashed md:col-span-2">
            <div className="flex h-full flex-col items-center justify-center py-6 text-center">
              <Eye className="mb-2 h-6 w-6 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">Tipe soal didukung</p>
              <p className="mt-1 max-w-xs text-xs text-slate-400">Pilihan ganda & benar/salah (auto grading) · Isian (exact match/keyword) · Essay (manual)</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
