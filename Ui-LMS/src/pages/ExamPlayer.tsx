import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Timer, Save, ShieldAlert, Flag, CheckCircle2, MonitorCheck, Lock, Maximize } from 'lucide-react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { cn, fmtCountdown } from '../lib/utils';
import { Badge, Button, Card, Modal, ProgressBar } from '../components/ui';

interface ApiQuestion { id: number; type: 'pg' | 'tf' | 'isian'; text: string; options: string[] | null; points: number }
interface ApiParticipant {
  status: 'sedang' | 'terkunci' | 'selesai'; answers: Record<string, string> | null;
  tab_switches: number; score: number | null;
}
interface ApiExamDetail {
  id: number; course_id: number; title: string; type: string; scheduled_at: string;
  duration_min: number; status: string; questions: ApiQuestion[]; my_participation: ApiParticipant | null;
}
interface ApiCourseRef { teaching_assignment: { school_class: { name: string } } }

const POLL_MS = 4000;

export default function ExamPlayer() {
  const { id } = useParams();
  const { toast } = useStore();
  const [exam, setExam] = useState<ApiExamDetail | null>(null);
  const [course, setCourse] = useState<ApiCourseRef | null>(null);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<'intro' | 'run' | 'locked' | 'result'>('intro');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [warnOpen, setWarnOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const tabSwitchesRef = useRef(tabSwitches);
  tabSwitchesRef.current = tabSwitches;

  const load = () => {
    api.get<{ data: ApiExamDetail }>(`/exams/${id}`)
      .then(res => {
        setExam(res.data);
        return api.get<{ data: ApiCourseRef }>(`/courses/${res.data.course_id}`).then(c => ({ exam: res.data, course: c.data }));
      })
      .then(({ exam: e, course: c }) => {
        setCourse(c);
        const p = e.my_participation;
        if (!p) { setPhase('intro'); return; }
        if (p.status === 'sedang') {
          setAnswers(Object.fromEntries(Object.entries(p.answers ?? {}).map(([k, v]) => [Number(k), v])));
          setTabSwitches(p.tab_switches);
          setTimeLeft(e.duration_min * 60);
          setPhase('run');
        } else if (p.status === 'terkunci') {
          setTabSwitches(p.tab_switches);
          setPhase('locked');
        } else {
          setScore(p.score);
          setTabSwitches(p.tab_switches);
          setPhase('result');
        }
      })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'));
  };
  useEffect(load, [id]);

  // Timer
  useEffect(() => {
    if (phase !== 'run') return;
    const iv = window.setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => window.clearInterval(iv);
  }, [phase]);

  // Auto-save every 10s
  useEffect(() => {
    if (phase !== 'run' || !exam) return;
    const iv = window.setInterval(() => {
      api.patch(`/exams/${exam.id}/progress`, { answers: answersRef.current, tab_switches: tabSwitchesRef.current })
        .then(() => setLastSaved(new Date()))
        .catch(() => {});
    }, 10000);
    return () => window.clearInterval(iv);
  }, [phase, exam]);

  // Tab switch detection (informational — dicatat, tidak mengunci)
  useEffect(() => {
    if (phase !== 'run') return;
    const onVis = () => {
      if (document.hidden && phaseRef.current === 'run') {
        setTabSwitches(t => t + 1);
        setWarnOpen(true);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [phase]);

  // Fullscreen exit -> lock (modul 08 upgrade)
  useEffect(() => {
    if (phase !== 'run' || !exam) return;
    const onFsChange = () => {
      if (!document.fullscreenElement && phaseRef.current === 'run') {
        api.post(`/exams/${exam.id}/lock`).catch(() => {});
        setPhase('locked');
        toast('Kamu keluar dari mode layar penuh — ujian dikunci sampai guru membuka kembali.', 'error');
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [phase, exam, toast]);

  // Poll while locked, waiting for guru unlock/force-finish
  useEffect(() => {
    if (phase !== 'locked' || !exam) return;
    const iv = window.setInterval(() => {
      api.get<{ data: ApiExamDetail }>(`/exams/${exam.id}`).then(res => {
        const p = res.data.my_participation;
        if (!p) return;
        if (p.status === 'sedang') {
          setAnswers(Object.fromEntries(Object.entries(p.answers ?? {}).map(([k, v]) => [Number(k), v])));
          setTabSwitches(p.tab_switches);
        } else if (p.status === 'selesai') {
          setScore(p.score);
          setTabSwitches(p.tab_switches);
          setPhase('result');
        }
      }).catch(() => {});
    }, POLL_MS);
    return () => window.clearInterval(iv);
  }, [phase, exam]);

  useEffect(() => {
    if (phase === 'run' && timeLeft <= 0) finish(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase]);

  if (error) return <Card className="border-rose-200 bg-rose-50/60"><p className="text-sm font-semibold text-rose-700">{error}</p></Card>;
  if (!exam || !course) return <div className="py-10 text-center text-sm text-slate-400">Memuat ujian…</div>;
  const questions = exam.questions;

  const enterFullscreen = async () => {
    try {
      await Promise.race([
        document.documentElement.requestFullscreen(),
        new Promise((_, reject) => window.setTimeout(() => reject(new Error('timeout')), 1500)),
      ]);
    } catch { /* browser mungkin menolak/gagal tepat waktu — lanjut tanpa fullscreen */ }
  };

  const start = async () => {
    setStarting(true);
    try {
      await api.post(`/exams/${exam.id}/start`);
      await enterFullscreen();
      setAnswers({});
      setTabSwitches(0);
      setTimeLeft(exam.duration_min * 60);
      setLastSaved(new Date());
      setPhase('run');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal memulai ujian', 'error');
    } finally {
      setStarting(false);
    }
  };

  const resume = async () => {
    await enterFullscreen();
    setPhase('run');
  };

  const finish = async (auto = false) => {
    try {
      const res = await api.post<{ data: ApiParticipant }>(`/exams/${exam.id}/submit`, { answers, tab_switches: tabSwitches });
      setScore(res.data.score);
      setPhase('result');
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      toast(auto ? 'Waktu habis — ujian dikumpulkan otomatis (auto submit)' : 'Jawaban berhasil dikumpulkan', auto ? 'info' : 'success');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal mengumpulkan ujian', 'error');
    }
  };

  if (phase === 'intro') {
    return (
      <div className="mx-auto max-w-2xl">
        <Link to="/ujian" className="mb-4 inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600"><ChevronLeft className="h-4 w-4" /> Kembali</Link>
        <Card>
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg">
              <MonitorCheck className="h-7 w-7" />
            </div>
            <h1 className="mt-4 font-display text-xl font-bold text-slate-900">{exam.title}</h1>
            <p className="text-sm text-slate-500">{exam.type} · Kelas {course.teaching_assignment.school_class.name} · CBT</p>
          </div>

          {exam.status !== 'aktif' ? (
            <p className="mt-6 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
              {exam.status === 'terjadwal' ? 'Ujian belum dibuka oleh guru.' : 'Ujian sudah ditutup — kamu tidak mengikuti ujian ini.'}
            </p>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-slate-50 p-3"><p className="font-display text-lg font-bold">{questions.length}</p><p className="text-[10px] font-semibold text-slate-500">Soal</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="font-display text-lg font-bold">{exam.duration_min} mnt</p><p className="text-[10px] font-semibold text-slate-500">Durasi</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="font-display text-lg font-bold">Auto</p><p className="text-[10px] font-semibold text-slate-500">Grading</p></div>
              </div>
              <div className="mt-6 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
                <p className="flex items-center gap-2 font-bold"><ShieldAlert className="h-4 w-4" /> Aturan Secure Exam</p>
                <p>· Jawaban <b>disimpan otomatis</b> setiap 10 detik — aman jika koneksi terputus.</p>
                <p>· Ujian berjalan dalam <b>mode layar penuh</b>; keluar dari layar penuh akan <b>mengunci ujian</b> sampai guru membuka kembali.</p>
                <p>· Saat waktu habis, ujian <b>di-submit otomatis</b>.</p>
              </div>
              <Button className="mt-6 w-full" variant="success" disabled={starting} onClick={start}>
                <Maximize className="h-4 w-4" /> {starting ? 'Memulai…' : 'Masuk Ruang Ujian (Layar Penuh)'}
              </Button>
            </>
          )}
        </Card>
      </div>
    );
  }

  if (phase === 'locked') {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
              <Lock className="h-8 w-8 text-rose-600" />
            </div>
            <h1 className="mt-3 font-display text-xl font-bold text-slate-900">Ujian Terkunci</h1>
            <p className="mt-2 text-sm text-slate-500">Kamu keluar dari mode layar penuh. Jawabanmu tersimpan aman — tunggu guru membuka kembali ujian ini, atau lanjutkan sendiri di bawah setelah dibuka.</p>
          </div>
          <Button className="mt-6 w-full" onClick={resume}><Maximize className="h-4 w-4" /> Lanjutkan Ujian (Layar Penuh)</Button>
        </Card>
      </div>
    );
  }

  if (phase === 'run') {
    const answered = questions.filter(q => answers[q.id]).length;
    return (
      <div className="mx-auto max-w-3xl">
        <div className="sticky top-16 z-20 mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-700">{exam.title}</p>
              <ProgressBar value={(answered / questions.length) * 100} className="mt-1.5" />
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700">
              <Save className="h-3.5 w-3.5" />
              {lastSaved ? `Auto-save ${lastSaved.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Auto-save aktif'}
            </div>
            {tabSwitches > 0 && (
              <div className="flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[10px] font-bold text-rose-600">
                <ShieldAlert className="h-3.5 w-3.5" /> {tabSwitches}× pindah tab
              </div>
            )}
            <div className={cn('flex items-center gap-1.5 rounded-xl px-3 py-2 font-mono text-sm font-bold', timeLeft < 60 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-700')}>
              <Timer className="h-4 w-4" /> {fmtCountdown(Math.max(0, timeLeft))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {questions.map((q, i) => (
            <Card key={q.id}>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600 text-[11px] font-bold text-white">{i + 1}</span>
                <Badge color={q.type === 'pg' ? 'indigo' : q.type === 'tf' ? 'sky' : 'emerald'}>
                  {q.type === 'pg' ? 'Pilihan Ganda' : q.type === 'tf' ? 'Benar/Salah' : 'Isian'}
                </Badge>
                <span className="ml-auto text-[11px] font-bold text-slate-400">{q.points} poin</span>
              </div>
              <p className="text-sm font-medium leading-relaxed text-slate-800">{q.text}</p>
              <div className="mt-3 space-y-2">
                {q.options ? q.options.map(opt => (
                  <label key={opt} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition', answers[q.id] === opt ? 'border-violet-400 bg-violet-50 font-semibold text-violet-800' : 'border-slate-200 hover:border-violet-200')}>
                    <input type="radio" name={String(q.id)} checked={answers[q.id] === opt} onChange={() => setAnswers(a => ({ ...a, [q.id]: opt }))} className="accent-violet-600" />
                    {opt}
                  </label>
                )) : (
                  <input value={answers[q.id] || ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} placeholder="Ketik jawaban…" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
                )}
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-slate-500">{answered}/{questions.length} terjawab · jawaban aman tersimpan</p>
          <Button variant="success" onClick={() => finish()}><Flag className="h-4 w-4" /> Submit Ujian</Button>
        </div>

        <Modal open={warnOpen} onClose={() => setWarnOpen(false)} title="⚠️ Peringatan: Kamu berpindah tab">
          <p className="text-sm text-slate-600">
            Sistem mendeteksi kamu <b>berpindah tab / menyembunyikan jendela ujian</b>. Kejadian ini <b>dicatat</b> dan terlihat oleh pengawas.
          </p>
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
            Jumlah pelanggaran saat ini: <b>{tabSwitches}×</b>
          </div>
          <Button className="mt-4 w-full" onClick={() => setWarnOpen(false)}>Saya mengerti, lanjutkan ujian</Button>
        </Modal>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-100">
            <CheckCircle2 className="h-8 w-8 text-violet-600" />
          </div>
          <h1 className="mt-3 font-display text-xl font-bold text-slate-900">Ujian Selesai</h1>
          <p className="font-display mt-2 text-4xl font-bold text-violet-700">{score}</p>
          <p className="text-xs text-slate-500">Nilai akhir (auto grading)</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Badge color="emerald"><Save className="h-3 w-3" /> Auto-save aktif selama ujian</Badge>
            <Badge color={tabSwitches ? 'rose' : 'emerald'}><ShieldAlert className="h-3 w-3" /> {tabSwitches}× pindah tab</Badge>
          </div>
          <p className="mt-4 text-[11px] text-slate-400">Kunci jawaban tidak ditampilkan untuk ujian online (kebijakan keamanan CBT) — cuma nilai akhir.</p>
        </div>
      </Card>
      <div className="mt-6 flex justify-center">
        <Link to="/ujian"><Button>Kembali ke Menu Ujian</Button></Link>
      </div>
    </div>
  );
}
