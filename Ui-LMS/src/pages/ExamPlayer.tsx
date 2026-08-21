import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Timer, Save, ShieldAlert, Flag, CheckCircle2, XCircle, MonitorCheck } from 'lucide-react';
import { EXAMS, QUESTIONS, COURSES, getMapel, getClass } from '../lib/data';
import { useStore } from '../lib/store';
import { cn, fmtCountdown } from '../lib/utils';
import { Badge, Button, Card, Modal, ProgressBar } from '../components/ui';
import { gradeQuestion } from './QuizPlayer';

export default function ExamPlayer() {
  const { id } = useParams();
  const { user, examParticipants, updateExamParticipant, toast } = useStore();
  const exam = EXAMS.find(e => e.id === id);
  const [phase, setPhase] = useState<'intro' | 'run' | 'result'>('intro');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [warnOpen, setWarnOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const questions = (exam?.questionIds || []).map(qid => QUESTIONS.find(q => q.id === qid)!).filter(Boolean);

  // Timer
  useEffect(() => {
    if (phase !== 'run') return;
    const iv = window.setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => window.clearInterval(iv);
  }, [phase]);

  // Auto-save every 10s
  useEffect(() => {
    if (phase !== 'run' || !exam || !user) return;
    const iv = window.setInterval(() => {
      const now = new Date();
      setLastSaved(now);
      updateExamParticipant(exam.id, user.id, { status: 'sedang', lastSaved: now.toISOString() });
    }, 10000);
    return () => window.clearInterval(iv);
  }, [phase, exam, user, updateExamParticipant]);

  // Tab switch detection
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

  useEffect(() => {
    if (phase === 'run' && timeLeft <= 0) finish(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase]);

  if (!exam || !user) return <div className="py-10 text-center text-sm text-slate-400">Ujian tidak ditemukan.</div>;
  const course = COURSES.find(c => c.id === exam.courseId)!;
  const m = getMapel(course.mapelId);

  const start = () => {
    setAnswers({});
    setTabSwitches(0);
    setTimeLeft(exam.durationMin * 60);
    setLastSaved(new Date());
    updateExamParticipant(exam.id, user.id, { status: 'sedang', tabSwitches: 0, lastSaved: new Date().toISOString() });
    setPhase('run');
  };

  const finish = (auto = false) => {
    let earned = 0, total = 0;
    questions.forEach(q => {
      total += q.points;
      if (gradeQuestion(q, answers[q.id])) earned += q.points;
    });
    const final = Math.round((earned / total) * 100);
    setScore(final);
    updateExamParticipant(exam.id, user.id, { status: 'selesai', score: final, tabSwitches, lastSaved: new Date().toISOString() });
    setPhase('result');
    toast(auto ? 'Waktu habis — ujian dikumpulkan otomatis (auto submit)' : 'Jawaban berhasil dikumpulkan', auto ? 'info' : 'success');
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
            <p className="text-sm text-slate-500">{exam.type} · {m.name} · Kelas {getClass(exam.classId).name} · CBT</p>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-slate-50 p-3"><p className="font-display text-lg font-bold">{questions.length}</p><p className="text-[10px] font-semibold text-slate-500">Soal</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="font-display text-lg font-bold">{exam.durationMin} mnt</p><p className="text-[10px] font-semibold text-slate-500">Durasi</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="font-display text-lg font-bold">Auto</p><p className="text-[10px] font-semibold text-slate-500">Grading</p></div>
          </div>
          <div className="mt-6 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
            <p className="flex items-center gap-2 font-bold"><ShieldAlert className="h-4 w-4" /> Aturan Secure Exam</p>
            <p>· Jawaban <b>disimpan otomatis</b> setiap 10 detik — aman jika koneksi terputus.</p>
            <p>· <b>Pindah tab / keluar layar terdeteksi</b> dan dicatat; ≥ 3× akan ditandai ke pengawas.</p>
            <p>· Saat waktu habis, ujian <b>di-submit otomatis</b>.</p>
            <p className="text-amber-600">· Proctoring webcam (fase lanjutan) memerlukan persetujuan orang tua untuk siswa di bawah umur.</p>
          </div>
          <Button className="mt-6 w-full" variant="success" onClick={start}>Masuk Ruang Ujian</Button>
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
                    <input type="radio" name={q.id} checked={answers[q.id] === opt} onChange={() => setAnswers(a => ({ ...a, [q.id]: opt }))} className="accent-violet-600" />
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

        <Modal open={warnOpen} onClose={() => setWarnOpen(false)} title="⚠️ Peringatan: Kamu keluar dari layar ujian">
          <p className="text-sm text-slate-600">
            Sistem mendeteksi kamu <b>pindah tab / keluar dari layar ujian</b>. Kejadian ini <b>dicatat</b> dan terlihat oleh pengawas.
          </p>
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
            Jumlah pelanggaran saat ini: <b>{tabSwitches}×</b> {tabSwitches >= 3 && '— kamu telah ditandai ke pengawas ujian!'}
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
        </div>
      </Card>
      <div className="mt-6 space-y-4">
        <Card title="Rekap & Analisis Jawaban">
          <div className="space-y-3">
            {questions.map((q, i) => {
              const correct = gradeQuestion(q, answers[q.id]);
              return (
                <div key={q.id} className="flex items-start gap-3 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  {correct ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-700">{i + 1}. {q.text}</p>
                    <p className="mt-1 text-[11px] text-slate-500">Jawaban: <b>{answers[q.id] || '(kosong)'}</b> {!correct && <>· Kunci: <b className="text-emerald-700">{q.answer}</b></>}</p>
                  </div>
                  <Badge color={correct ? 'emerald' : 'rose'}>{correct ? `+${q.points}` : '0'}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
      <div className="mt-6 flex justify-center">
        <Link to="/ujian"><Button>Kembali ke Menu Ujian</Button></Link>
      </div>
    </div>
  );
}
