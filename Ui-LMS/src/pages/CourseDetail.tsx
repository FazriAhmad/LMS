import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FileText, Presentation, FileImage, Film, Youtube, Link2, File, Download,
  CheckCircle2, Circle, Play, MessageSquare, ClipboardList, ChevronLeft, Eye, Plus, Trash2,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { cn, fmtDate, fmtDateTime } from '../lib/utils';
import { Avatar, Badge, Button, Card, EmptyState, Modal, PageHeader, ProgressBar, Tabs } from '../components/ui';
import type { MaterialType } from '../lib/types';

const MAT_ICON: Record<MaterialType, { icon: typeof FileText; color: string; label: string }> = {
  pdf: { icon: FileText, color: 'bg-rose-50 text-rose-600', label: 'PDF' },
  doc: { icon: File, color: 'bg-sky-50 text-sky-600', label: 'Word' },
  ppt: { icon: Presentation, color: 'bg-amber-50 text-amber-600', label: 'PPT' },
  image: { icon: FileImage, color: 'bg-emerald-50 text-emerald-600', label: 'Gambar' },
  video: { icon: Film, color: 'bg-violet-50 text-violet-600', label: 'Video' },
  youtube: { icon: Youtube, color: 'bg-red-50 text-red-600', label: 'YouTube' },
  link: { icon: Link2, color: 'bg-indigo-50 text-indigo-600', label: 'Link' },
};

interface ApiMaterial {
  id: number; course_module_id: number; type: MaterialType; title: string;
  url: string | null; youtube_id: string | null; size: string | null; duration: string | null; order: number;
}
interface ApiModule { id: number; title: string; pertemuan: string | null; order: number; materials: ApiMaterial[] }
interface ApiCourseDetail {
  id: number; description: string | null; modules: ApiModule[]; completed_material_ids?: number[];
  teaching_assignment: { teacher: { id: number; name: string }; subject: { name: string; code: string; color: string }; school_class: { name: string } };
}
interface ApiAssignment {
  id: number; title: string; deadline: string; my_submission: { status: string; score: number | null } | null;
}
interface ApiQuiz { id: number; title: string; duration_min: number; max_attempts: number; randomize: boolean; questions_count: number }
interface ApiExam { id: number; title: string; type: string; scheduled_at: string; duration_min: number; status: string; questions_count: number }
interface ApiForumAuthor { id: number; name: string }
interface ApiForumReply { id: number; body: string; author: ApiForumAuthor; created_at: string }
interface ApiForumThread { id: number; title: string; body: string; author: ApiForumAuthor; created_at: string; replies_count?: number; replies?: ApiForumReply[] }
interface ApiProgressRow { student_id: number; student_name: string; done: number; total: number; percent: number }

const isStaffRole = (role: string) => ['guru', 'walikelas', 'admin', 'superadmin', 'kepsek'].includes(role);

export default function CourseDetail() {
  const { id } = useParams();
  const { user, toast } = useStore();
  const [course, setCourse] = useState<ApiCourseDetail | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('materi');
  const [preview, setPreview] = useState<ApiMaterial | null>(null);

  const [assignments, setAssignments] = useState<ApiAssignment[] | null>(null);
  const [quizzes, setQuizzes] = useState<ApiQuiz[] | null>(null);
  const [exams, setExams] = useState<ApiExam[] | null>(null);
  const [threads, setThreads] = useState<ApiForumThread[] | null>(null);
  const [expandedThread, setExpandedThread] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [progress, setProgress] = useState<ApiProgressRow | ApiProgressRow[] | null>(null);

  const [newThread, setNewThread] = useState(false);
  const [threadTitle, setThreadTitle] = useState('');
  const [threadBody, setThreadBody] = useState('');

  const isSiswa = user?.role === 'siswa';
  const isTeacher = !!user && isStaffRole(user.role);

  const loadCourse = () => {
    api.get<{ data: ApiCourseDetail }>(`/courses/${id}`)
      .then(res => setCourse(res.data))
      .catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'));
  };
  useEffect(loadCourse, [id]);

  useEffect(() => {
    if (tab === 'tugas' && assignments === null) {
      api.get<{ data: ApiAssignment[] }>(`/courses/${id}/assignments`).then(res => setAssignments(res.data)).catch(() => setAssignments([]));
    }
    if (tab === 'quiz' && quizzes === null) {
      api.get<{ data: ApiQuiz[] }>(`/courses/${id}/quizzes`).then(res => setQuizzes(res.data)).catch(() => setQuizzes([]));
      api.get<{ data: ApiExam[] }>(`/courses/${id}/exams`).then(res => setExams(res.data)).catch(() => setExams([]));
    }
    if (tab === 'forum' && threads === null) {
      api.get<{ data: ApiForumThread[] }>(`/courses/${id}/forum-threads`).then(res => setThreads(res.data)).catch(() => setThreads([]));
    }
    if (tab === 'progress' && progress === null) {
      api.get<{ data: ApiProgressRow | ApiProgressRow[] }>(`/courses/${id}/progress`).then(res => setProgress(res.data)).catch(() => setProgress(isSiswa ? { student_id: 0, student_name: '', done: 0, total: 0, percent: 0 } : []));
    }
  }, [tab, id, assignments, quizzes, threads, progress, isSiswa]);

  if (error) return <Card className="border-rose-200 bg-rose-50/60"><p className="text-sm font-semibold text-rose-700">{error}</p></Card>;
  if (!course) return <div className="py-10 text-center text-sm text-slate-400">Memuat course…</div>;

  const ta = course.teaching_assignment;
  const allMats = course.modules.flatMap(mo => mo.materials);
  const completedIds = course.completed_material_ids ?? [];
  const doneCount = allMats.filter(x => completedIds.includes(x.id)).length;

  const markComplete = async (matId: number) => {
    try {
      await api.post(`/materials/${matId}/complete`);
      toast('Materi ditandai selesai ✓');
      loadCourse();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menandai materi', 'error');
    }
  };

  const loadThreadDetail = (threadId: number) => {
    api.get<{ data: ApiForumThread }>(`/forum-threads/${threadId}`)
      .then(res => setThreads(list => (list ?? []).map(t => t.id === threadId ? res.data : t)));
  };

  const submitThread = async () => {
    try {
      await api.post(`/courses/${id}/forum-threads`, { title: threadTitle, body: threadBody });
      setNewThread(false); setThreadTitle(''); setThreadBody('');
      toast('Thread diskusi berhasil dibuat');
      setThreads(null);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal membuat thread', 'error');
    }
  };

  const submitReply = async (threadId: number) => {
    if (!replyText.trim()) return;
    try {
      await api.post(`/forum-threads/${threadId}/replies`, { body: replyText });
      setReplyText('');
      loadThreadDetail(threadId);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal mengirim balasan', 'error');
    }
  };

  const deleteThread = async (threadId: number) => {
    try {
      await api.delete(`/forum-threads/${threadId}`);
      toast('Thread dihapus');
      setThreads(list => (list ?? []).filter(t => t.id !== threadId));
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menghapus thread', 'error');
    }
  };

  const deleteReply = async (threadId: number, replyId: number) => {
    try {
      await api.delete(`/forum-replies/${replyId}`);
      loadThreadDetail(threadId);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menghapus balasan', 'error');
    }
  };

  const tabs = [
    { id: 'materi', label: `Modul & Materi (${allMats.length})` },
    { id: 'tugas', label: `Tugas${assignments ? ` (${assignments.length})` : ''}` },
    { id: 'quiz', label: 'Quiz & Ujian' },
    { id: 'forum', label: `Forum${threads ? ` (${threads.length})` : ''}` },
    { id: 'progress', label: 'Progress' },
  ];

  const progressRows = Array.isArray(progress) ? progress : [];
  const myProgress = !Array.isArray(progress) ? progress : null;

  return (
    <div>
      <Link to="/courses" className="mb-4 inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600">
        <ChevronLeft className="h-4 w-4" /> Semua Mata Pelajaran
      </Link>
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-2" style={{ backgroundColor: ta.subject.color }} />
        <div className="flex flex-wrap items-center gap-4 p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-base font-bold text-white shadow" style={{ backgroundColor: ta.subject.color }}>{ta.subject.code}</div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-bold text-slate-900">{ta.subject.name}</h1>
              <Badge color="indigo">{ta.school_class.name}</Badge>
            </div>
            {course.description && <p className="mt-0.5 text-sm text-slate-500">{course.description}</p>}
            <p className="mt-1 text-xs text-slate-400">Diampu oleh {ta.teacher.name} · {course.modules.length} modul</p>
          </div>
          {isSiswa && allMats.length > 0 && (
            <div className="w-full sm:w-56">
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-semibold text-slate-600">Progress kamu</span>
                <span className="font-bold text-slate-800">{Math.round((doneCount / allMats.length) * 100)}%</span>
              </div>
              <ProgressBar value={(doneCount / allMats.length) * 100} color="bg-violet-500" />
            </div>
          )}
        </div>
      </div>

      <div className="mb-6"><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

      {tab === 'materi' && (
        <div className="space-y-5">
          {course.modules.length === 0 && <Card><EmptyState icon={FileText} title="Belum ada modul" /></Card>}
          {course.modules.map((mod, mi) => (
            <Card key={mod.id} title={`Modul ${mi + 1}: ${mod.title}`} subtitle={mod.pertemuan ?? undefined}>
              <div className="space-y-2">
                {mod.materials.map(mat => {
                  const meta = MAT_ICON[mat.type];
                  const done = completedIds.includes(mat.id);
                  return (
                    <div key={mat.id} className={cn('flex flex-wrap items-center gap-3 rounded-xl border p-3 transition', done ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-100 hover:border-indigo-200')}>
                      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', meta.color)}>
                        <meta.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{mat.title}</p>
                        <p className="text-[11px] text-slate-400">
                          {meta.label}{mat.size && ` · ${mat.size}`}{mat.duration && ` · ${mat.duration}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => setPreview(mat)}><Eye className="h-3.5 w-3.5" /> Preview</Button>
                        {mat.url && (
                          <a href={mat.url} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="ghost"><Download className="h-3.5 w-3.5" /></Button>
                          </a>
                        )}
                        {isSiswa && (
                          <button onClick={() => !done && markComplete(mat.id)} className="ml-1" title={done ? 'Sudah selesai' : 'Tandai selesai'}>
                            {done ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> : <Circle className="h-6 w-6 text-slate-300 hover:text-indigo-400" />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {mod.materials.length === 0 && <p className="py-4 text-center text-xs text-slate-400">Belum ada materi di modul ini.</p>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'tugas' && (
        <div className="space-y-3">
          {assignments === null && <p className="py-8 text-center text-sm text-slate-400">Memuat tugas…</p>}
          {assignments?.length === 0 && <Card><EmptyState icon={ClipboardList} title="Belum ada tugas" /></Card>}
          {assignments?.map(a => (
            <Link key={a.id} to={`/tugas/${a.id}`}>
              <Card className="transition hover:border-indigo-200 hover:shadow-md">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><ClipboardList className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">{a.title}</p>
                    <p className="text-xs text-slate-500">Deadline {fmtDate(a.deadline)}</p>
                  </div>
                  {isSiswa && a.my_submission && (
                    <Badge color={a.my_submission.status === 'dinilai' ? 'emerald' : a.my_submission.status === 'sudah' ? 'sky' : a.my_submission.status === 'revisi' ? 'amber' : 'slate'}>
                      {a.my_submission.status === 'dinilai' ? `Nilai ${a.my_submission.score}` : a.my_submission.status}
                    </Badge>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {tab === 'quiz' && (
        <div className="grid gap-4 md:grid-cols-2">
          {quizzes === null && <p className="py-8 text-center text-sm text-slate-400">Memuat quiz & ujian…</p>}
          {quizzes?.map(q => (
            <Card key={`quiz-${q.id}`} title={q.title} subtitle={`${q.questions_count} soal · ${q.duration_min} menit · maks ${q.max_attempts} percobaan`}>
              <div className="flex flex-wrap gap-2">
                <Badge color="indigo">Quiz</Badge>{q.randomize && <Badge color="sky">Acak soal</Badge>}
              </div>
              <div className="mt-4 flex justify-end">
                <Link to={`/quiz/${q.id}`}><Button size="sm"><Play className="h-3.5 w-3.5" /> Kerjakan</Button></Link>
              </div>
            </Card>
          ))}
          {exams?.map(e => (
            <Card key={`exam-${e.id}`} title={e.title} subtitle={`${e.questions_count} soal · ${e.duration_min} menit · CBT`}>
              <div className="flex flex-wrap gap-2">
                <Badge color="violet">Ujian</Badge>
                <Badge color={e.status === 'aktif' ? 'emerald' : e.status === 'selesai' ? 'slate' : 'amber'}>{e.status}</Badge>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-slate-500">{fmtDateTime(e.scheduled_at)}</p>
                <Link to={`/ujian/${e.id}`}><Button size="sm" variant="secondary">Buka</Button></Link>
              </div>
            </Card>
          ))}
          {quizzes?.length === 0 && exams?.length === 0 && (
            <Card className="md:col-span-2"><EmptyState icon={ClipboardList} title="Belum ada quiz atau ujian" /></Card>
          )}
        </div>
      )}

      {tab === 'forum' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setNewThread(true)}><Plus className="h-4 w-4" /> Thread Baru</Button>
          </div>
          {threads === null && <p className="py-8 text-center text-sm text-slate-400">Memuat forum…</p>}
          {threads?.length === 0 && <Card><EmptyState icon={MessageSquare} title="Belum ada diskusi" /></Card>}
          {threads?.map(t => {
            const canModerateThread = user && (user.id === String(t.author.id) || isTeacher);
            const expanded = expandedThread === t.id;
            return (
              <Card key={t.id}>
                <div className="flex items-start gap-3">
                  <Avatar name={t.author.name} color="#6366f1" size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{t.title}</p>
                        <p className="text-[11px] text-slate-400">{t.author.name} · {fmtDateTime(t.created_at)}</p>
                      </div>
                      {canModerateThread && (
                        <button onClick={() => deleteThread(t.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">{t.body}</p>

                    {!expanded && (
                      <button
                        onClick={() => { setExpandedThread(t.id); if (!t.replies) loadThreadDetail(t.id); }}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Lihat balasan ({t.replies_count ?? 0})
                      </button>
                    )}

                    {expanded && (
                      <div className="mt-3 space-y-2">
                        {(t.replies ?? []).map(r => (
                          <div key={r.id} className="flex items-start justify-between gap-2 rounded-xl bg-slate-50 p-3">
                            <div>
                              <p className="text-[11px] font-bold text-slate-700">{r.author.name}</p>
                              <p className="mt-1 text-xs text-slate-600">{r.body}</p>
                            </div>
                            {user && (user.id === String(r.author.id) || isTeacher) && (
                              <button onClick={() => deleteReply(t.id, r.id)} className="shrink-0 text-slate-300 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
                            )}
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Tulis balasan…" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-indigo-500" />
                          <Button size="sm" onClick={() => submitReply(t.id)}>Kirim</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'progress' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {isSiswa && myProgress && (
            <Card title="Progress per Modul" subtitle="Berdasarkan materi yang kamu selesaikan">
              <div className="space-y-4">
                {course.modules.map((mod, mi) => {
                  const mats = mod.materials;
                  const done = mats.filter(x => completedIds.includes(x.id)).length;
                  const pct = mats.length > 0 ? Math.round((done / mats.length) * 100) : 0;
                  return (
                    <div key={mod.id}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="font-semibold text-slate-700">Modul {mi + 1}: {mod.title}</span>
                        <span className="text-slate-400">{pct}%</span>
                      </div>
                      <ProgressBar value={pct} color={pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'} />
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
          {!isSiswa && (
            <Card title="Progress Siswa" subtitle="% materi diselesaikan per siswa">
              <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                {progressRows.map(r => (
                  <div key={r.student_id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5">
                    <Avatar name={r.student_name} color={r.percent < 50 ? '#f43f5e' : '#6366f1'} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-800">{r.student_name}</p>
                      <ProgressBar value={r.percent} className="mt-1" color={r.percent < 50 ? 'bg-rose-400' : 'bg-indigo-500'} />
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-800">{r.percent}%</p>
                      <p className="text-[10px] text-slate-400">{r.done}/{r.total} materi</p>
                    </div>
                  </div>
                ))}
                {progressRows.length === 0 && <p className="py-4 text-center text-xs text-slate-400">Belum ada siswa di kelas ini.</p>}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Preview modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.title || ''} wide>
        {preview?.type === 'youtube' && preview.youtube_id ? (
          <div className="aspect-video overflow-hidden rounded-xl bg-black">
            <iframe
              className="h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${preview.youtube_id}`}
              title={preview.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : preview?.type === 'image' && preview.url ? (
          <img src={preview.url} alt={preview.title} className="w-full rounded-xl" />
        ) : (
          <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-14 text-center">
            <FileText className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Preview dokumen</p>
            <p className="mt-1 max-w-sm text-xs text-slate-400">Gunakan tombol Unduh untuk membuka file ini.</p>
            {preview?.url && (
              <a href={preview.url} target="_blank" rel="noreferrer">
                <Button className="mt-4"><Download className="h-4 w-4" /> Unduh File</Button>
              </a>
            )}
          </div>
        )}
      </Modal>

      {/* New thread modal */}
      <Modal open={newThread} onClose={() => setNewThread(false)} title="Buat Thread Diskusi">
        <div className="space-y-3">
          <input value={threadTitle} onChange={e => setThreadTitle(e.target.value)} placeholder="Judul diskusi…" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
          <textarea value={threadBody} onChange={e => setThreadBody(e.target.value)} rows={4} placeholder="Tulis pertanyaan atau topik…" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
          <Button className="w-full" disabled={!threadTitle || !threadBody} onClick={submitThread}>Publikasikan</Button>
        </div>
      </Modal>
    </div>
  );
}
