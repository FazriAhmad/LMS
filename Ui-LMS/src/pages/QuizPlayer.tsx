import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Timer, Shuffle, CheckCircle2, XCircle, PenLine, Flag } from 'lucide-react';
import { QUIZZES, QUESTIONS, COURSES, getMapel } from '../lib/data';
import { useStore } from '../lib/store';
import { cn, fmtCountdown } from '../lib/utils';
import { Badge, Button, Card, ProgressBar } from '../components/ui';
import type { Question } from '../lib/types';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export function gradeQuestion(q: Question, answer: string | undefined): boolean | null {
  if (answer === undefined || answer === '') return false;
  if (q.type === 'pg' || q.type === 'tf') return answer === q.answer;
  if (q.type === 'isian') {
    const ans = normalize(answer);
    return normalize(q.answer) === ans || (q.keywords || []).some(k => ans.includes(normalize(k)));
  }
  return null; // essay → manual
}

export default function QuizPlayer() {
  const { id } = useParams();
  const { user, quizAttempts, addQuizAttempt, toast } = useStore();
  const quiz = QUIZZES.find(q => q.id === id);
  const [phase, setPhase] = useState<'intro' | 'run' | 'result'>('intro');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [order, setOrder] = useState<Question[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<{ autoScore: number; maxAuto: number; essayPending: number; total: number } | null>(null);

  const questions = useMemo(() => (quiz ? quiz.questionIds.map(qid => QUESTIONS.find(q => q.id === qid)!) : []), [quiz]);
  const attempts = quizAttempts.filter(a => a.quizId === id);

  useEffect(() => {
    if (phase !== 'run') return;
    const iv = window.setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => window.clearInterval(iv);
  }, [phase]);

  useEffect(() => {
    if (phase === 'run' && timeLeft <= 0) {
      finish(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase]);

  if (!quiz || !user) return <div className="py-10 text-center text-sm text-slate-400">Quiz tidak ditemukan.</div>;
  const course = COURSES.find(c => c.id === quiz.courseId)!;
  const m = getMapel(course.mapelId);

  const start = () => {
    setOrder(quiz.randomize ? shuffle(questions) : questions);
    setAnswers({});
    setTimeLeft(quiz.durationMin * 60);
    setPhase('run');
  };

  const finish = (auto = false) => {
    let autoScore = 0, maxAuto = 0, essayPending = 0, total = 0;
    questions.forEach(q => {
      total += q.points;
      const res = gradeQuestion(q, answers[q.id]);
      if (res === null) { essayPending++; return; }
      maxAuto += q.points;
      if (res) autoScore += q.points;
    });
    setResult({ autoScore, maxAuto, essayPending, total });
    addQuizAttempt({ quizId: quiz.id, date: new Date().toISOString(), autoScore, maxAuto, essayPending, totalPoints: total });
    setPhase('result');
    if (auto) toast('Waktu habis — jawaban dikumpulkan otomatis', 'info');
  };

  if (phase === 'intro') {
    return (
      <div className="mx-auto max-w-2xl">
        <Link to="/ujian" className="mb-4 inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600"><ChevronLeft className="h-4 w-4" /> Kembali</Link>
        <Card>
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg" style={{ backgroundColor: m.color }}>
              <PenLine className="h-7 w-7" />
            </div>
            <h1 className="mt-4 font-display text-xl font-bold text-slate-900">{quiz.title}</h1>
            <p className="text-sm text-slate-500">{m.name} · {attempts.length}/{quiz.maxAttempts} percobaan terpakai</p>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="font-display text-lg font-bold text-slate-900">{questions.length}</p>
              <p className="text-[10px] font-semibold text-slate-500">Soal</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="font-display text-lg font-bold text-slate-900">{quiz.durationMin} mnt</p>
              <p className="text-[10px] font-semibold text-slate-500">Timer</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="font-display text-lg font-bold text-slate-900">{quiz.maxAttempts}×</p>
              <p className="text-[10px] font-semibold text-slate-500">Batas percobaan</p>
            </div>
          </div>
          <ul className="mt-6 space-y-2 rounded-xl bg-indigo-50/60 p-4 text-xs text-indigo-900">
            <li>· Pilihan ganda, benar/salah, dan isian dinilai <b>otomatis</b>.</li>
            <li>· Essay dinilai <b>manual oleh guru</b> setelah pengumpulan.</li>
            {quiz.randomize && <li>· Urutan soal <b>diacak</b> setiap percobaan.</li>}
            <li>· Saat timer habis, jawaban dikumpulkan otomatis.</li>
          </ul>
          <Button className="mt-6 w-full" onClick={start} disabled={attempts.length >= quiz.maxAttempts}>
            {attempts.length >= quiz.maxAttempts ? 'Kesempatan habis' : 'Mulai Quiz'}
          </Button>
        </Card>
      </div>
    );
  }

  if (phase === 'run') {
    const answered = order.filter(q => answers[q.id]).length;
    return (
      <div className="mx-auto max-w-3xl">
        <div className="sticky top-16 z-20 mb-4 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-700">{quiz.title}</p>
            <ProgressBar value={(answered / order.length) * 100} className="mt-1.5" />
          </div>
          <div className={cn('flex items-center gap-1.5 rounded-xl px-3 py-2 font-mono text-sm font-bold', timeLeft < 60 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-700')}>
            <Timer className="h-4 w-4" /> {fmtCountdown(Math.max(0, timeLeft))}
          </div>
        </div>
        <div className="space-y-4">
          {order.map((q, i) => (
            <Card key={q.id}>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-[11px] font-bold text-white">{i + 1}</span>
                <Badge color={q.type === 'pg' ? 'indigo' : q.type === 'tf' ? 'sky' : q.type === 'isian' ? 'emerald' : 'amber'}>
                  {q.type === 'pg' ? 'Pilihan Ganda' : q.type === 'tf' ? 'Benar/Salah' : q.type === 'isian' ? 'Isian' : 'Essay'}
                </Badge>
                <span className="ml-auto text-[11px] font-bold text-slate-400">{q.points} poin</span>
              </div>
              <p className="text-sm font-medium leading-relaxed text-slate-800">{q.text}</p>
              <div className="mt-3 space-y-2">
                {(q.type === 'pg' || q.type === 'tf') && (q.options || []).map(opt => (
                  <label key={opt} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition', answers[q.id] === opt ? 'border-indigo-400 bg-indigo-50 font-semibold text-indigo-800' : 'border-slate-200 hover:border-indigo-200')}>
                    <input type="radio" name={q.id} checked={answers[q.id] === opt} onChange={() => setAnswers(a => ({ ...a, [q.id]: opt }))} className="accent-indigo-600" />
                    {opt}
                  </label>
                ))}
                {q.type === 'isian' && (
                  <input value={answers[q.id] || ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} placeholder="Ketik jawabanmu…" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                )}
                {q.type === 'essay' && (
                  <textarea rows={4} value={answers[q.id] || ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} placeholder="Tulis jawaban essay… (dinilai manual oleh guru)" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                )}
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-slate-500">{answered}/{order.length} terjawab</p>
          <Button onClick={() => finish()}><Flag className="h-4 w-4" /> Kumpulkan Jawaban</Button>
        </div>
      </div>
    );
  }

  // result
  const r = result!;
  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="mt-3 font-display text-xl font-bold text-slate-900">Quiz Selesai!</h1>
          <p className="font-display mt-2 text-3xl font-bold text-indigo-700">{r.autoScore}<span className="text-lg text-slate-400">/{r.maxAuto}</span></p>
          <p className="text-xs text-slate-500">poin auto-grading (PG · Benar/Salah · Isian)</p>
          {r.essayPending > 0 && <Badge color="amber" className="mt-3">{r.essayPending} essay menunggu penilaian guru</Badge>}
        </div>
      </Card>
      <div className="mt-6 space-y-4">
        {order.map((q, i) => {
          const res = gradeQuestion(q, answers[q.id]);
          return (
            <Card key={q.id} className={cn(res === true && 'border-emerald-200', res === false && 'border-rose-200')}>
              <div className="flex items-start gap-3">
                {res === null ? <PenLine className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" /> : res ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-400">Soal {i + 1} · {q.points} poin</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">{q.text}</p>
                  <p className="mt-2 text-xs">Jawabanmu: <b className={res ? 'text-emerald-700' : 'text-rose-700'}>{answers[q.id] || '(kosong)'}</b></p>
                  {res !== null && !res && <p className="text-xs">Kunci: <b className="text-emerald-700">{q.answer}</b></p>}
                  {res === null && <p className="text-xs text-amber-600">Menilai manual oleh guru{q.keywords ? '' : ''}</p>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <div className="mt-6 flex justify-center gap-3">
        <Link to="/ujian"><Button variant="secondary">Kembali ke Ujian & Quiz</Button></Link>
        <Link to="/nilai"><Button>Lihat Nilai</Button></Link>
      </div>
    </div>
  );
}
