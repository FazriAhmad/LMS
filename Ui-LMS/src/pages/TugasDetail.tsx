import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, Clock, Paperclip, Upload, Star, MessageSquareText, RotateCcw,
  ClipboardCheck, FileText, Send, Pencil,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { cn, fmtDate, fmtDateTime, daysUntil, isOverdue } from '../lib/utils';
import { Avatar, Badge, Button, Card, Modal, TableWrap, Td, Th } from '../components/ui';
import QuestionPicker, { type ApiQuestion } from '../components/QuestionPicker';

interface SubmissionAnswer { question_id: number; answer: string | null; is_correct: boolean | null }

interface Submission {
  id: number;
  student_id: number;
  student_name: string;
  status: 'belum' | 'sudah' | 'dinilai' | 'revisi';
  file_url: string | null;
  submitted_at: string | null;
  score: number | null;
  feedback: string | null;
  revisions: number;
  answers: SubmissionAnswer[];
}

interface Question {
  id: number;
  type: 'pg' | 'tf' | 'isian' | 'essay';
  text: string;
  options: string[] | null;
  points: number;
  /** Hanya dikirim ke guru, atau ke siswa setelah dia mengumpulkan. */
  answer?: string | null;
}

interface Assignment {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  deadline: string;
  attachments: { name: string; url: string; size: number }[];
  rubric: { criterion: string; weight: number }[];
  questions: Question[];
  my_submission: Submission | null;
  submissions?: Submission[];
}

const TYPE_LABEL: Record<string, string> = { pg: 'Pilihan Ganda', tf: 'Benar/Salah', isian: 'Isian', essay: 'Esai' };

interface Course {
  teaching_assignment: { subject: { id: number; name: string; code: string; color: string }; school_class: { name: string } };
}

const isStaffRole = (role: string) => ['guru', 'walikelas', 'admin', 'superadmin', 'kepsek'].includes(role);

export default function TugasDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, toast } = useStore();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [gradeOpen, setGradeOpen] = useState<Submission | null>(null);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [gradeSaving, setGradeSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editPicked, setEditPicked] = useState<ApiQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const autoEditDone = useRef(false);

  const load = () => {
    api.get<{ data: Assignment }>(`/assignments/${id}`)
      .then(res => {
        setAssignment(res.data);
        return api.get<{ data: Course }>(`/courses/${res.data.course_id}`);
      })
      .then(res => setCourse(res.data))
      .catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'));
  };

  useEffect(load, [id]);

  // Datang dari tombol Edit di daftar tugas (`/tugas/{id}?edit=1`) — buka modal edit langsung
  // tanpa perlu klik "Edit Tugas" lagi begitu halamannya selesai dimuat.
  useEffect(() => {
    if (autoEditDone.current || !assignment || !user) return;
    if (searchParams.get('edit') !== '1' || !isStaffRole(user.role)) return;
    autoEditDone.current = true;
    setEditTitle(assignment.title);
    setEditDesc(assignment.description ?? '');
    setEditDeadline(assignment.deadline.slice(0, 16));
    setEditPicked(assignment.questions.map(q => ({ ...q, answer: q.answer ?? null, difficulty: '' })));
    setEditOpen(true);
    setSearchParams({}, { replace: true });
  }, [assignment, user, searchParams, setSearchParams]);

  if (error) return <Card className="border-rose-200 bg-rose-50/60"><p className="text-sm font-semibold text-rose-700">{error}</p></Card>;
  if (!assignment || !course || !user) return <div className="py-10 text-center text-sm text-slate-400">Memuat…</div>;

  const m = course.teaching_assignment.subject;
  const isTeacher = isStaffRole(user.role);
  const mySub = assignment.my_submission;
  const overdue = isOverdue(assignment.deadline);

  const hasQuestions = assignment.questions.length > 0;

  const submit = async () => {
    if (!hasQuestions && !file) return;
    setSubmitting(true);
    try {
      // Jawaban dikirim sebagai answers[<question_id>] supaya Laravel membacanya
      // sebagai array bertanda kunci — bentuk yang sama dipakai backend saat menilai.
      const fd = new FormData();
      if (file) fd.append('file', file);
      assignment.questions.forEach(q => fd.append(`answers[${q.id}]`, answers[q.id] ?? ''));
      await api.post(`/assignments/${assignment.id}/submit`, fd);
      toast('Tugas berhasil dikumpulkan ✓');
      setFile(null);
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal mengumpulkan tugas', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const saveGrade = async (status: 'dinilai' | 'revisi') => {
    if (!gradeOpen) return;
    setGradeSaving(true);
    try {
      await api.post(`/assignment-submissions/${gradeOpen.id}/grade`, {
        status,
        score: status === 'dinilai' ? Number(score) : undefined,
        feedback: feedback || (status === 'revisi' ? 'Mohon perbaiki sesuai rubrik.' : undefined),
      });
      toast(status === 'dinilai' ? 'Nilai tersimpan' : 'Permintaan revisi dikirim ke siswa');
      setGradeOpen(null);
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setGradeSaving(false);
    }
  };

  const submissions = assignment.submissions ?? [];

  /**
   * Backend mengirim deadline sebagai ISO8601 di zona waktu aplikasi (mis.
   * "2026-09-07T00:00:00+07:00"), sedangkan <input type="datetime-local"> minta
   * "YYYY-MM-DDTHH:mm" — 16 karakter pertamanya sudah persis jam dinding lokal,
   * jadi cukup dipotong. Waktu dikirim balik, formatnya disamakan dengan alur
   * "Buat Tugas" di Tugas.tsx supaya Laravel memparsenya dengan cara yang sama.
   */
  const openEdit = () => {
    setEditTitle(assignment.title);
    setEditDesc(assignment.description ?? '');
    setEditDeadline(assignment.deadline.slice(0, 16));
    // difficulty tidak dikirim balik oleh /assignments/{id} — cuma dipakai QuestionPicker
    // buat menampilkan badge kesulitan di daftar bank, tidak dibutuhkan di daftar soal terpilih.
    setEditPicked(assignment.questions.map(q => ({ ...q, answer: q.answer ?? null, difficulty: '' })));
    setEditOpen(true);
  };

  const saveEdit = async () => {
    setEditSaving(true);
    try {
      await api.put(`/assignments/${assignment.id}`, {
        title: editTitle,
        description: editDesc || null,
        deadline: editDeadline.replace('T', ' ') + ':00',
        question_ids: editPicked.map(q => q.id),
      });
      toast('Tugas diperbarui');
      setEditOpen(false);
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menyimpan perubahan', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div>
      <Link to="/tugas" className="mb-4 inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600">
        <ChevronLeft className="h-4 w-4" /> Semua Tugas
      </Link>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ backgroundColor: m.color }}>{m.code}</div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-bold text-slate-900">{assignment.title}</h1>
            <p className="mt-0.5 text-sm text-slate-500">{m.name} · {course.teaching_assignment.school_class.name}</p>
          </div>
          <div className={cn('rounded-xl px-4 py-2 text-center', overdue ? 'bg-rose-50' : 'bg-indigo-50')}>
            <p className={cn('flex items-center gap-1 text-[10px] font-bold uppercase', overdue ? 'text-rose-600' : 'text-indigo-600')}><Clock className="h-3 w-3" /> Deadline</p>
            <p className={cn('text-sm font-bold', overdue ? 'text-rose-700' : 'text-indigo-700')}>{fmtDate(assignment.deadline)}</p>
            {!overdue && <p className="text-[10px] text-slate-400">{daysUntil(assignment.deadline)} hari lagi</p>}
          </div>
          {isTeacher && (
            <Button variant="secondary" size="sm" onClick={openEdit}>
              <Pencil className="h-3.5 w-3.5" /> Edit Tugas
            </Button>
          )}
        </div>
        {assignment.description && <p className="mt-4 text-sm leading-relaxed text-slate-600">{assignment.description}</p>}
        {assignment.attachments.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {assignment.attachments.map(f => (
              <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50">
                <Paperclip className="h-3.5 w-3.5 text-indigo-500" /> {f.name}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Daftar soal — guru melihat lengkap dengan kunci, siswa mengerjakannya di sini. */}
          {hasQuestions && (
            <Card
              title={`Soal (${assignment.questions.length})`}
              subtitle={isTeacher ? 'Soal objektif dinilai otomatis saat siswa mengumpulkan' : 'Jawab semua soal, lalu kumpulkan'}
            >
              <div className="space-y-4">
                {assignment.questions.map((q, i) => {
                  const myAnswer = mySub?.answers?.find(a => a.question_id === q.id);
                  const locked = isTeacher || !!mySub?.submitted_at;
                  return (
                    <div key={q.id} className="rounded-xl border border-slate-100 p-4">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-slate-400">{i + 1}.</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800">{q.text}</p>
                          <p className="mt-0.5 text-[10px] text-slate-400">{TYPE_LABEL[q.type]} · {q.points} poin</p>
                        </div>
                        {myAnswer?.is_correct === true && <Badge color="emerald">Benar</Badge>}
                        {myAnswer?.is_correct === false && <Badge color="rose">Salah</Badge>}
                        {myAnswer && myAnswer.is_correct === null && <Badge color="amber">Dinilai guru</Badge>}
                      </div>

                      <div className="mt-3 space-y-2 pl-5">
                        {q.type === 'pg' && (q.options ?? []).map(opt => (
                          <label key={opt} className={cn('flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-xs transition',
                            (locked ? myAnswer?.answer : answers[q.id]) === opt ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50',
                            locked && 'cursor-default')}>
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              disabled={locked}
                              checked={(locked ? myAnswer?.answer : answers[q.id]) === opt}
                              onChange={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
                            />
                            <span className="text-slate-700">{opt}</span>
                            {isTeacher && q.answer === opt && <Badge color="emerald">Kunci</Badge>}
                          </label>
                        ))}

                        {q.type !== 'pg' && !locked && (
                          <textarea
                            rows={q.type === 'essay' ? 4 : 2}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                            placeholder={q.type === 'essay' ? 'Tulis jawaban esai…' : 'Jawaban singkat…'}
                            value={answers[q.id] ?? ''}
                            onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                          />
                        )}

                        {q.type !== 'pg' && locked && (
                          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                            {myAnswer?.answer || (isTeacher ? <span className="text-slate-400">Jawaban siswa tampil di daftar pengumpulan.</span> : <span className="text-slate-400">—</span>)}
                          </div>
                        )}

                        {isTeacher && q.type !== 'pg' && q.answer && (
                          <p className="text-[11px] text-emerald-700"><b>Kunci:</b> {q.answer}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {!isTeacher && (
            <Card title="Pengumpulan Saya" subtitle="Pengumpulan online dengan dukungan revisi">
              {mySub?.status === 'dinilai' && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">Nilai kamu</p>
                  <p className="font-display text-4xl font-bold text-emerald-700">{mySub.score}</p>
                  {mySub.feedback && <p className="mt-2 flex items-center justify-center gap-1 text-xs text-emerald-700"><MessageSquareText className="h-3.5 w-3.5" /> {mySub.feedback}</p>}
                  <p className="mt-1 text-[10px] text-slate-400">dikumpulkan {mySub.submitted_at && fmtDateTime(mySub.submitted_at)}</p>
                </div>
              )}
              {mySub?.status === 'sudah' && (
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-5 text-center">
                  <ClipboardCheck className="mx-auto h-8 w-8 text-sky-500" />
                  <p className="mt-2 text-sm font-bold text-sky-700">Tugas terkumpul — menunggu penilaian</p>
                  <p className="mt-1 text-xs text-slate-500">{mySub.submitted_at && fmtDateTime(mySub.submitted_at)}</p>
                </div>
              )}
              {(!mySub || mySub.status === 'revisi') && (
                <div>
                  {mySub?.status === 'revisi' && (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="flex items-center gap-2 text-xs font-bold text-amber-700"><RotateCcw className="h-4 w-4" /> Guru meminta revisi (revisi ke-{mySub.revisions})</p>
                      {mySub.feedback && <p className="mt-1 text-xs text-amber-700">"{mySub.feedback}"</p>}
                    </div>
                  )}
                  <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-8 transition hover:border-indigo-400 hover:bg-indigo-50/40"
                  >
                    <Upload className="mb-2 h-8 w-8 text-slate-400" />
                    <p className="text-sm font-bold text-slate-700">
                      {file?.name || (hasQuestions ? 'Lampirkan berkas (opsional)' : 'Klik untuk pilih file jawaban')}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">PDF/Word/gambar · maks 20 MB · pengumpulan online</p>
                  </button>
                  <Button className="mt-4 w-full" disabled={(!hasQuestions && !file) || submitting} onClick={submit}>
                    <Send className="h-4 w-4" /> {submitting ? 'Mengunggah…' : mySub?.status === 'revisi' ? 'Kumpulkan Ulang (Revisi)' : 'Kumpulkan Tugas'}
                  </Button>
                  {hasQuestions && (
                    <p className="mt-2 text-center text-[11px] text-slate-400">
                      Jawaban soal di atas ikut terkirim. Soal objektif langsung dinilai otomatis.
                    </p>
                  )}
                </div>
              )}
            </Card>
          )}

          {isTeacher && (
            <Card title={`Pengumpulan Siswa (${submissions.filter(s => s.status !== 'belum').length}/${submissions.length})`} pad={false}>
              <TableWrap>
                <thead className="bg-slate-50">
                  <tr><Th>Siswa</Th><Th>File</Th><Th>Status</Th><Th>Nilai</Th><Th>Aksi</Th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {submissions.map(s => (
                    <tr key={s.student_id} className="hover:bg-slate-50/60">
                      <Td>
                        <div className="flex items-center gap-2">
                          <Avatar name={s.student_name} color="#6366f1" size="sm" />
                          <span className="text-xs font-semibold">{s.student_name}</span>
                        </div>
                      </Td>
                      <Td className="max-w-[140px]">
                        {s.file_url ? <a href={s.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 truncate text-xs text-indigo-600"><FileText className="h-3.5 w-3.5 shrink-0" />file</a> : <span className="text-xs text-slate-300">—</span>}
                      </Td>
                      <Td>
                        <Badge color={s.status === 'dinilai' ? 'emerald' : s.status === 'sudah' ? 'sky' : s.status === 'revisi' ? 'amber' : 'slate'}>
                          {s.status === 'belum' ? 'Belum' : s.status === 'sudah' ? 'Terkumpul' : s.status === 'revisi' ? `Revisi ${s.revisions}×` : 'Dinilai'}
                        </Badge>
                      </Td>
                      <Td className="font-bold">{s.score ?? '—'}</Td>
                      <Td>
                        {(s.status === 'sudah' || s.status === 'dinilai' || s.status === 'revisi') && (
                          <Button size="sm" variant="secondary" onClick={() => { setGradeOpen(s); setScore(String(s.score ?? '')); setFeedback(s.feedback ?? ''); }}>
                            <Star className="h-3.5 w-3.5" /> {s.status === 'sudah' ? 'Nilai' : 'Detail'}
                          </Button>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {assignment.rubric.length > 0 && (
            <Card title="Rubrik Penilaian" subtitle="Total bobot 100%">
              <div className="space-y-3">
                {assignment.rubric.map(r => (
                  <div key={r.criterion} className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-700">{r.criterion}</p>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${r.weight}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-bold text-indigo-600">{r.weight}%</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {isTeacher && (
            <Card title="Statistik Pengumpulan">
              <div className="grid grid-cols-2 gap-2 text-center">
                {[
                  { l: 'Terkumpul', v: submissions.filter(s => s.status !== 'belum').length, c: 'bg-sky-50 text-sky-700' },
                  { l: 'Dinilai', v: submissions.filter(s => s.status === 'dinilai').length, c: 'bg-emerald-50 text-emerald-700' },
                  { l: 'Revisi', v: submissions.filter(s => s.status === 'revisi').length, c: 'bg-amber-50 text-amber-700' },
                  { l: 'Belum', v: submissions.filter(s => s.status === 'belum').length, c: 'bg-rose-50 text-rose-700' },
                ].map(x => (
                  <div key={x.l} className={cn('rounded-xl p-3', x.c)}>
                    <p className="font-display text-lg font-bold">{x.v}</p>
                    <p className="text-[10px] font-semibold">{x.l}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal open={!!gradeOpen} onClose={() => setGradeOpen(null)} title={gradeOpen ? `Penilaian — ${gradeOpen.student_name}` : ''}>
        {gradeOpen && (
          <div className="space-y-4">
            {gradeOpen.file_url && (
              <a href={gradeOpen.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600 hover:text-indigo-600">
                <FileText className="h-4 w-4 text-indigo-500" /> Buka file jawaban
              </a>
            )}
            {assignment.rubric.length > 0 && (
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Rubrik</p>
                {assignment.rubric.map(r => (
                  <p key={r.criterion} className="flex justify-between text-xs text-slate-600">
                    <span>{r.criterion}</span><b>{r.weight}%</b>
                  </p>
                ))}
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Nilai (0–100)</label>
              <input type="number" min={0} max={100} value={score} onChange={e => setScore(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Feedback untuk siswa</label>
              <textarea rows={3} value={feedback} onChange={e => setFeedback(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" placeholder="Tulis feedback konstruktif…" />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" disabled={gradeSaving} onClick={() => saveGrade('revisi')}>
                <RotateCcw className="h-4 w-4" /> Minta Revisi
              </Button>
              <Button className="flex-1" disabled={score === '' || gradeSaving} onClick={() => saveGrade('dinilai')}>
                <Star className="h-4 w-4" /> Simpan Nilai
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Tugas">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Judul</label>
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Deskripsi</label>
            <textarea rows={3} value={editDesc} onChange={e => setEditDesc(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" placeholder="Instruksi tugas…" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Deadline</label>
            <input type="datetime-local" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
          </div>

          <QuestionPicker subjectId={course.teaching_assignment.subject.id} picked={editPicked} onChange={setEditPicked} />

          <Button className="w-full" disabled={!editTitle || !editDeadline || editSaving} onClick={saveEdit}>
            {editSaving ? 'Menyimpan…' : 'Simpan Perubahan'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
