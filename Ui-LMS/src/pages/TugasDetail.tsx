import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ChevronLeft, Clock, Paperclip, Upload, Star, MessageSquareText, RotateCcw,
  ClipboardCheck, FileText, Send,
} from 'lucide-react';
import { COURSES, STUDENTS, getMapel, getClass, getStudent } from '../lib/data';
import { useStore } from '../lib/store';
import { cn, fmtDate, fmtDateTime, daysUntil, isOverdue } from '../lib/utils';
import { Avatar, Badge, Button, Card, Modal, TableWrap, Td, Th } from '../components/ui';

export default function TugasDetail() {
  const { id } = useParams();
  const { user, assignments, submitAssignment, gradeSubmission, requestRevision, toast } = useStore();
  const [fileName, setFileName] = useState('');
  const [gradeOpen, setGradeOpen] = useState<string | null>(null);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const assignment = assignments.find(a => a.id === id);
  if (!assignment || !user) return <div className="py-10 text-center text-sm text-slate-400">Tugas tidak ditemukan.</div>;
  const course = COURSES.find(c => c.id === assignment.courseId)!;
  const m = getMapel(course.mapelId);
  const isTeacher = ['guru', 'walikelas', 'admin', 'superadmin', 'kepsek'].includes(user.role);
  const mySub = assignment.submissions.find(s => s.studentId === user.id);
  const overdue = isOverdue(assignment.deadline);
  const grading = assignment.submissions.find(s => s.studentId === gradeOpen);

  const submit = () => {
    if (!fileName) return;
    submitAssignment(assignment.id, user.id, fileName);
    toast('Tugas berhasil dikumpulkan ✓ Guru akan memberi notifikasi penilaian.');
    setFileName('');
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
            <p className="mt-0.5 text-sm text-slate-500">{m.name} · {getClass(course.classId).name} · {COURSES.find(c => c.id === assignment.courseId) && 'dipublikasikan di Course'}</p>
          </div>
          <div className={cn('rounded-xl px-4 py-2 text-center', overdue ? 'bg-rose-50' : 'bg-indigo-50')}>
            <p className={cn('flex items-center gap-1 text-[10px] font-bold uppercase', overdue ? 'text-rose-600' : 'text-indigo-600')}><Clock className="h-3 w-3" /> Deadline</p>
            <p className={cn('text-sm font-bold', overdue ? 'text-rose-700' : 'text-indigo-700')}>{fmtDate(assignment.deadline)}</p>
            {!overdue && <p className="text-[10px] text-slate-400">{daysUntil(assignment.deadline)} hari lagi</p>}
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">{assignment.description}</p>
        {assignment.attachments.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {assignment.attachments.map(f => (
              <button key={f} onClick={() => toast(`Mengunduh lampiran ${f}…`, 'info')} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50">
                <Paperclip className="h-3.5 w-3.5 text-indigo-500" /> {f}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {!isTeacher && (
            <Card title="Pengumpulan Saya" subtitle="Pengumpulan online dengan dukungan revisi">
              {mySub?.status === 'dinilai' && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">Nilai kamu</p>
                  <p className="font-display text-4xl font-bold text-emerald-700">{mySub.score}</p>
                  <p className="mt-2 flex items-center justify-center gap-1 text-xs text-emerald-700"><MessageSquareText className="h-3.5 w-3.5" /> {mySub.feedback}</p>
                  <p className="mt-1 text-[10px] text-slate-400">File: {mySub.file} · dikumpulkan {mySub.submittedAt && fmtDateTime(mySub.submittedAt)}</p>
                </div>
              )}
              {mySub?.status === 'sudah' && (
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-5 text-center">
                  <ClipboardCheck className="mx-auto h-8 w-8 text-sky-500" />
                  <p className="mt-2 text-sm font-bold text-sky-700">Tugas terkumpul — menunggu penilaian</p>
                  <p className="mt-1 text-xs text-slate-500">File: {mySub.file} · {mySub.submittedAt && fmtDateTime(mySub.submittedAt)}</p>
                </div>
              )}
              {(mySub?.status === 'belum' || mySub?.status === 'revisi') && (
                <div>
                  {mySub.status === 'revisi' && (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="flex items-center gap-2 text-xs font-bold text-amber-700"><RotateCcw className="h-4 w-4" /> Guru meminta revisi (revisi ke-{mySub.revisions})</p>
                      <p className="mt-1 text-xs text-amber-700">“{mySub.feedback}”</p>
                    </div>
                  )}
                  <input ref={fileRef} type="file" className="hidden" onChange={e => setFileName(e.target.files?.[0]?.name || '')} />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-8 transition hover:border-indigo-400 hover:bg-indigo-50/40"
                  >
                    <Upload className="mb-2 h-8 w-8 text-slate-400" />
                    <p className="text-sm font-bold text-slate-700">{fileName || 'Klik untuk pilih file jawaban'}</p>
                    <p className="mt-1 text-[11px] text-slate-400">PDF/Word/gambar · maks 25 MB · pengumpulan online</p>
                  </button>
                  <Button className="mt-4 w-full" disabled={!fileName} onClick={submit}>
                    <Send className="h-4 w-4" /> {mySub.status === 'revisi' ? 'Kumpulkan Ulang (Revisi)' : 'Kumpulkan Tugas'}
                  </Button>
                </div>
              )}
            </Card>
          )}

          {isTeacher && (
            <Card title={`Pengumpulan Siswa (${assignment.submissions.filter(s => s.status !== 'belum').length}/${assignment.submissions.length})`} pad={false}>
              <TableWrap>
                <thead className="bg-slate-50">
                  <tr><Th>Siswa</Th><Th>File</Th><Th>Status</Th><Th>Nilai</Th><Th>Aksi</Th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignment.submissions.map(s => {
                    const st = STUDENTS.find(x => x.id === s.studentId);
                    if (!st) return null;
                    return (
                      <tr key={s.studentId} className="hover:bg-slate-50/60">
                        <Td>
                          <div className="flex items-center gap-2">
                            <Avatar name={st.name} color="#6366f1" size="sm" />
                            <span className="text-xs font-semibold">{st.name}</span>
                          </div>
                        </Td>
                        <Td className="max-w-[140px]">
                          {s.file ? <span className="flex items-center gap-1 truncate text-xs text-indigo-600"><FileText className="h-3.5 w-3.5 shrink-0" />{s.file}</span> : <span className="text-xs text-slate-300">—</span>}
                        </Td>
                        <Td>
                          <Badge color={s.status === 'dinilai' ? 'emerald' : s.status === 'sudah' ? 'sky' : s.status === 'revisi' ? 'amber' : 'slate'}>
                            {s.status === 'belum' ? 'Belum' : s.status === 'sudah' ? 'Terkumpul' : s.status === 'revisi' ? `Revisi ${s.revisions}×` : 'Dinilai'}
                          </Badge>
                        </Td>
                        <Td className="font-bold">{s.score ?? '—'}</Td>
                        <Td>
                          {(s.status === 'sudah' || s.status === 'dinilai' || s.status === 'revisi') && (
                            <Button size="sm" variant="secondary" onClick={() => { setGradeOpen(s.studentId); setScore(String(s.score ?? '')); setFeedback(s.feedback ?? ''); }}>
                              <Star className="h-3.5 w-3.5" /> {s.status === 'sudah' ? 'Nilai' : 'Detail'}
                            </Button>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableWrap>
            </Card>
          )}
        </div>

        <div className="space-y-6">
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
          <Card title="Statistik Pengumpulan">
            <div className="grid grid-cols-2 gap-2 text-center">
              {[
                { l: 'Terkumpul', v: assignment.submissions.filter(s => s.status !== 'belum').length, c: 'bg-sky-50 text-sky-700' },
                { l: 'Dinilai', v: assignment.submissions.filter(s => s.status === 'dinilai').length, c: 'bg-emerald-50 text-emerald-700' },
                { l: 'Revisi', v: assignment.submissions.filter(s => s.status === 'revisi').length, c: 'bg-amber-50 text-amber-700' },
                { l: 'Belum', v: assignment.submissions.filter(s => s.status === 'belum').length, c: 'bg-rose-50 text-rose-700' },
              ].map(x => (
                <div key={x.l} className={cn('rounded-xl p-3', x.c)}>
                  <p className="font-display text-lg font-bold">{x.v}</p>
                  <p className="text-[10px] font-semibold">{x.l}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Grading modal */}
      <Modal open={!!gradeOpen} onClose={() => setGradeOpen(null)} title={grading ? `Penilaian — ${getStudent(grading.studentId).name}` : ''}>
        {grading && (
          <div className="space-y-4">
            {grading.file && (
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600">
                <FileText className="h-4 w-4 text-indigo-500" /> {grading.file}
                <button className="ml-auto text-indigo-600 hover:underline" onClick={() => toast('Membuka preview file…', 'info')}>Preview</button>
              </div>
            )}
            <div className="rounded-xl border border-slate-100 p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Rubrik</p>
              {assignment.rubric.map(r => (
                <p key={r.criterion} className="flex justify-between text-xs text-slate-600">
                  <span>{r.criterion}</span><b>{r.weight}%</b>
                </p>
              ))}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Nilai (0–100)</label>
              <input type="number" min={0} max={100} value={score} onChange={e => setScore(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Feedback untuk siswa</label>
              <textarea rows={3} value={feedback} onChange={e => setFeedback(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" placeholder="Tulis feedback konstruktif…" />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => {
                requestRevision(assignment.id, grading.studentId, feedback || 'Mohon perbaiki sesuai rubrik.');
                setGradeOpen(null);
                toast('Permintaan revisi dikirim ke siswa', 'info');
              }}>
                <RotateCcw className="h-4 w-4" /> Minta Revisi
              </Button>
              <Button className="flex-1" disabled={score === ''} onClick={() => {
                gradeSubmission(assignment.id, grading.studentId, Number(score), feedback);
                setGradeOpen(null);
                toast('Nilai tersimpan & siswa dinotifikasi');
              }}>
                <Star className="h-4 w-4" /> Simpan Nilai
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
