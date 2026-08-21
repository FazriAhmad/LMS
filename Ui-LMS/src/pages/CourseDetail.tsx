import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FileText, Presentation, FileImage, Film, Youtube, Link2, File, Download,
  CheckCircle2, Circle, Play, MessageSquare, ClipboardList, MonitorPlay,
  ChevronLeft, Eye, Plus,
} from 'lucide-react';
import { COURSES, getMapel, getClass, getTeacherName, STUDENTS, QUESTIONS } from '../lib/data';
import { useStore } from '../lib/store';
import { cn, fmtDate } from '../lib/utils';
import { Badge, Button, Card, EmptyState, Modal, PageHeader, ProgressBar, Tabs, Avatar } from '../components/ui';
import type { Material, MaterialType } from '../lib/types';

const MAT_ICON: Record<MaterialType, { icon: typeof FileText; color: string; label: string }> = {
  pdf: { icon: FileText, color: 'bg-rose-50 text-rose-600', label: 'PDF' },
  doc: { icon: File, color: 'bg-sky-50 text-sky-600', label: 'Word' },
  ppt: { icon: Presentation, color: 'bg-amber-50 text-amber-600', label: 'PPT' },
  image: { icon: FileImage, color: 'bg-emerald-50 text-emerald-600', label: 'Gambar' },
  video: { icon: Film, color: 'bg-violet-50 text-violet-600', label: 'Video' },
  youtube: { icon: Youtube, color: 'bg-red-50 text-red-600', label: 'YouTube' },
  link: { icon: Link2, color: 'bg-indigo-50 text-indigo-600', label: 'Link' },
};

export default function CourseDetail() {
  const { id } = useParams();
  const { user, completedMaterials, toggleMaterial, toast, assignments, quizAttempts, forums, addForumThread } = useStore();
  const [tab, setTab] = useState('materi');
  const [preview, setPreview] = useState<Material | null>(null);
  const [newThread, setNewThread] = useState(false);
  const [threadTitle, setThreadTitle] = useState('');
  const [threadBody, setThreadBody] = useState('');

  const course = COURSES.find(c => c.id === id);
  if (!course) return <EmptyState icon={FileText} title="Course tidak ditemukan" />;
  const m = getMapel(course.mapelId);
  const isSiswa = user?.role === 'siswa';
  const allMats = course.modules.flatMap(mo => mo.materials);
  const doneCount = allMats.filter(x => completedMaterials.includes(x.id)).length;
  const courseAssignments = assignments.filter(a => a.courseId === course.id);
  const courseForums = forums.filter(f => f.courseId === course.id);

  const tabs = [
    { id: 'materi', label: `Modul & Materi (${allMats.length})` },
    { id: 'tugas', label: `Tugas (${courseAssignments.length})` },
    { id: 'quiz', label: 'Quiz & Ujian' },
    { id: 'forum', label: `Forum (${courseForums.length})` },
    { id: 'progress', label: 'Progress' },
  ];

  const progressRows = useMemo(() => STUDENTS.filter(s => s.classId === course.classId).map((s, i) => ({
    s,
    pct: Math.min(100, 35 + ((i * 17 + 11) % 60) + (s.id === user?.id ? Math.round((doneCount / allMats.length) * 20) : 0)),
    dur: 2 + ((i * 5) % 9),
  })), [course.classId, user, doneCount, allMats.length]);

  return (
    <div>
      <Link to="/courses" className="mb-4 inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600">
        <ChevronLeft className="h-4 w-4" /> Semua Mata Pelajaran
      </Link>
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-2" style={{ backgroundColor: m.color }} />
        <div className="flex flex-wrap items-center gap-4 p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-base font-bold text-white shadow" style={{ backgroundColor: m.color }}>{m.code}</div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-bold text-slate-900">{m.name}</h1>
              <Badge color="indigo">{getClass(course.classId).name}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">{course.description}</p>
            <p className="mt-1 text-xs text-slate-400">Diampu oleh {getTeacherName(course.teacherId)} · {course.modules.length} modul · TA 2024/2025 Genap</p>
          </div>
          <div className="w-full sm:w-56">
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-semibold text-slate-600">Progress kelas</span>
              <span className="font-bold text-slate-800">{Math.round((doneCount / allMats.length) * 100)}%</span>
            </div>
            <ProgressBar value={(doneCount / allMats.length) * 100} color="bg-violet-500" />
          </div>
        </div>
      </div>

      <div className="mb-6"><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

      {tab === 'materi' && (
        <div className="space-y-5">
          {course.modules.map((mod, mi) => (
            <Card key={mod.id} title={`Modul ${mi + 1}: ${mod.title}`} subtitle={mod.pertemuan}>
              <div className="space-y-2">
                {mod.materials.map(mat => {
                  const meta = MAT_ICON[mat.type];
                  const done = completedMaterials.includes(mat.id);
                  return (
                    <div key={mat.id} className={cn('flex flex-wrap items-center gap-3 rounded-xl border p-3 transition', done ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-100 hover:border-indigo-200')}>
                      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', meta.color)}>
                        <meta.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{mat.title}</p>
                        <p className="text-[11px] text-slate-400">
                          {meta.label}{mat.size && ` · ${mat.size}`}{mat.duration && ` · ${mat.duration}`}
                          {mat.type === 'youtube' && ' · video unlisted (default untuk konten video)'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => setPreview(mat)}><Eye className="h-3.5 w-3.5" /> Preview</Button>
                        <Button size="sm" variant="ghost" onClick={() => toast(`Mengunduh "${mat.title}"…`, 'info')}><Download className="h-3.5 w-3.5" /></Button>
                        {isSiswa && (
                          <button onClick={() => { toggleMaterial(mat.id); toast(done ? 'Ditandai belum selesai' : 'Materi ditandai selesai ✓'); }} className="ml-1">
                            {done ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> : <Circle className="h-6 w-6 text-slate-300 hover:text-indigo-400" />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
          <p className="text-center text-[11px] text-slate-400">
            Upload dibatasi maks 25 MB per file agar storage tidak cepat penuh — konten video disarankan embed YouTube (unlisted).
          </p>
        </div>
      )}

      {tab === 'tugas' && (
        <div className="space-y-3">
          {courseAssignments.length === 0 && <Card><EmptyState icon={ClipboardList} title="Belum ada tugas" /></Card>}
          {courseAssignments.map(a => {
            const sub = a.submissions.find(s => s.studentId === user?.id);
            return (
              <Link key={a.id} to={`/tugas/${a.id}`}>
                <Card className="transition hover:border-indigo-200 hover:shadow-md">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><ClipboardList className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900">{a.title}</p>
                      <p className="text-xs text-slate-500">Deadline {fmtDate(a.deadline)} · {a.submissions.filter(s => s.status !== 'belum').length}/{a.submissions.length} mengumpulkan</p>
                    </div>
                    {isSiswa && sub && (
                      <Badge color={sub.status === 'dinilai' ? 'emerald' : sub.status === 'sudah' ? 'sky' : sub.status === 'revisi' ? 'amber' : 'slate'}>
                        {sub.status === 'dinilai' ? `Nilai ${sub.score}` : sub.status}
                      </Badge>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {tab === 'quiz' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Quiz: Fungsi Komposisi" subtitle="5 soal · 10 menit · acak · maks 2 percobaan">
            <div className="flex flex-wrap gap-2">
              <Badge color="indigo">Pilihan ganda</Badge><Badge color="sky">Benar/Salah</Badge><Badge color="emerald">Isian</Badge><Badge color="amber">Essay (manual)</Badge>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-500">{quizAttempts.filter(a => a.quizId === 'quiz1').length}/2 percobaan dipakai</p>
              <Link to="/quiz/quiz1"><Button size="sm"><Play className="h-3.5 w-3.5" /> Kerjakan</Button></Link>
            </div>
          </Card>
          <Card title="Ujian Harian: Fungsi Komposisi" subtitle="6 soal · CBT · timer · auto-save · monitoring tab">
            <div className="flex flex-wrap gap-2">
              <Badge color="violet">CBT</Badge><Badge color="rose">Anti pindah tab</Badge><Badge color="emerald">Auto grading</Badge>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-500">Status: dibuka</p>
              <Link to="/ujian"><Button size="sm" variant="secondary">Lihat di menu Ujian</Button></Link>
            </div>
          </Card>
        </div>
      )}

      {tab === 'forum' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setNewThread(true)}><Plus className="h-4 w-4" /> Thread Baru</Button>
          </div>
          {courseForums.map(f => (
            <Card key={f.id}>
              <div className="flex items-start gap-3">
                <Avatar name={f.author} color="#6366f1" size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">{f.title}</p>
                  <p className="text-[11px] text-slate-400">{f.author} · {fmtDate(f.date)}</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{f.body}</p>
                  <div className="mt-3 space-y-2">
                    {f.replies.map((r, i) => (
                      <div key={i} className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[11px] font-bold text-slate-700">{r.author} <Badge color={r.role === 'Guru' ? 'indigo' : 'slate'} className="ml-1">{r.role}</Badge></p>
                        <p className="mt-1 text-xs text-slate-600">{r.text}</p>
                      </div>
                    ))}
                  </div>
                  <Link to="/komunikasi" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline">
                    <MessageSquare className="h-3.5 w-3.5" /> Balas di Forum Diskusi
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'progress' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Progress per Modul" subtitle={isSiswa ? 'Berdasarkan materi yang kamu selesaikan' : 'Rata-rata kelas'}>
            <div className="space-y-4">
              {course.modules.map((mod, mi) => {
                const mats = mod.materials;
                const done = mats.filter(x => completedMaterials.includes(x.id)).length;
                const pct = isSiswa ? Math.round((done / mats.length) * 100) : 40 + ((mi * 23) % 50);
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
          <Card title="Progress Siswa" subtitle="Durasi belajar dihitung dari aktivitas di LMS">
            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {progressRows.map(({ s, pct, dur }) => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5">
                  <Avatar name={s.name} color={pct < 50 ? '#f43f5e' : '#6366f1'} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-800">{s.name}</p>
                    <ProgressBar value={pct} className="mt-1" color={pct < 50 ? 'bg-rose-400' : 'bg-indigo-500'} />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-800">{pct}%</p>
                    <p className="text-[10px] text-slate-400">{dur} jam belajar</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Preview modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.title || ''} wide>
        {preview?.type === 'youtube' && preview.youtubeId ? (
          <div className="aspect-video overflow-hidden rounded-xl bg-black">
            <iframe
              className="h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${preview.youtubeId}`}
              title={preview.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : preview?.type === 'image' ? (
          <img src="/images/forum.jpg" alt={preview.title} className="w-full rounded-xl" />
        ) : (
          <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-14 text-center">
            <FileText className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Preview dokumen</p>
            <p className="mt-1 max-w-sm text-xs text-slate-400">
              Pratinjau {preview?.type.toUpperCase()} dirender di viewer internal. Pada demo ini, gunakan tombol Unduh untuk mengambil file.
            </p>
            <Button className="mt-4" onClick={() => toast(`Mengunduh "${preview?.title}"…`, 'info')}><Download className="h-4 w-4" /> Unduh File</Button>
          </div>
        )}
      </Modal>

      {/* New thread modal */}
      <Modal open={newThread} onClose={() => setNewThread(false)} title="Buat Thread Diskusi">
        <div className="space-y-3">
          <input value={threadTitle} onChange={e => setThreadTitle(e.target.value)} placeholder="Judul diskusi…" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
          <textarea value={threadBody} onChange={e => setThreadBody(e.target.value)} rows={4} placeholder="Tulis pertanyaan atau topik…" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
          <Button className="w-full" disabled={!threadTitle || !threadBody} onClick={() => {
            addForumThread(course.id, threadTitle, threadBody);
            setNewThread(false); setThreadTitle(''); setThreadBody('');
            toast('Thread diskusi berhasil dibuat');
          }}>Publikasikan</Button>
        </div>
      </Modal>
    </div>
  );
}
