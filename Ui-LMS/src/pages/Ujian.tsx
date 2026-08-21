import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MonitorPlay, Timer, Shuffle, Eye, Play, Plus, ShieldAlert, Save, CheckCircle2, HelpCircle } from 'lucide-react';
import { EXAMS, QUIZZES, COURSES, getMapel, getClass, getStudent, STUDENTS } from '../lib/data';
import { useStore } from '../lib/store';
import { cn, fmtDate, fmtTime } from '../lib/utils';
import { Badge, Button, Card, PageHeader, Tabs, TableWrap, Th, Td, Avatar } from '../components/ui';

export default function Ujian() {
  const { user, examParticipants, quizAttempts, toast } = useStore();
  const [tab, setTab] = useState('ujian');
  const isStaff = user && ['guru', 'walikelas', 'admin', 'superadmin', 'kepsek'].includes(user.role);

  return (
    <div>
      <PageHeader
        title="Ujian & Quiz"
        desc="CBT dengan timer, soal acak, auto-save, auto grading, dan monitoring integritas"
        action={isStaff ? <Button onClick={() => toast('Wizard pembuatan ujian CBT (demo): pilih bank soal, atur timer & acak, publikasikan.', 'info')}><Plus className="h-4 w-4" /> Buat Ujian/Quiz</Button> : undefined}
      />
      <div className="mb-6"><Tabs tabs={[{ id: 'ujian', label: `Ujian Online (${EXAMS.length})` }, { id: 'quiz', label: `Quiz (${QUIZZES.length})` }]} active={tab} onChange={setTab} /></div>

      {tab === 'ujian' && (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            {EXAMS.map(e => {
              const course = COURSES.find(c => c.id === e.courseId)!;
              const m = getMapel(course.mapelId);
              const myPart = e.participants.find(p => p.studentId === user?.id);
              const canStart = e.status === 'aktif' && user?.role === 'siswa' && (!myPart || myPart.status !== 'selesai');
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
                      <p className="mt-0.5 text-xs text-slate-500">{e.type} · {m.name} · Kelas {getClass(e.classId).name}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge color="slate"><Timer className="h-3 w-3" /> {e.durationMin} menit</Badge>
                    <Badge color="slate"><Shuffle className="h-3 w-3" /> Soal acak</Badge>
                    <Badge color="slate"><Save className="h-3 w-3" /> Auto-save</Badge>
                    <Badge color="slate"><ShieldAlert className="h-3 w-3" /> Deteksi pindah tab</Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-3">
                    <p className="text-xs text-slate-500">{fmtDate(e.date)} · {fmtTime(e.date)} · {e.questionIds.length} soal</p>
                    {canStart && <Link to={`/ujian/${e.id}`}><Button size="sm" variant="success"><Play className="h-3.5 w-3.5" /> Mulai Ujian</Button></Link>}
                    {user?.role === 'siswa' && myPart?.status === 'selesai' && <Badge color="emerald"><CheckCircle2 className="h-3 w-3" /> Skor {myPart.score}</Badge>}
                  </div>
                </Card>
              );
            })}
          </div>

          {isStaff && (
            <Card title="Exam Monitoring — Ujian Harian: Fungsi Komposisi" subtitle="Deteksi pindah tab / keluar layar (level dasar) · proctoring webcam opsional fase berikutnya (perlu persetujuan orang tua)" pad={false}>
              <TableWrap>
                <thead className="bg-slate-50">
                  <tr><Th>Siswa</Th><Th>Status</Th><Th>Pindah Tab</Th><Th>Skor</Th><Th>Auto-save Terakhir</Th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(examParticipants['e1'] || []).map(p => {
                    const s = STUDENTS.find(x => x.id === p.studentId);
                    if (!s) return null;
                    return (
                      <tr key={p.studentId} className="hover:bg-slate-50/60">
                        <Td><div className="flex items-center gap-2"><Avatar name={s.name} color="#8b5cf6" size="sm" /><span className="text-xs font-semibold">{s.name}</span></div></Td>
                        <Td><Badge color={p.status === 'selesai' ? 'emerald' : p.status === 'sedang' ? 'amber' : 'slate'}>{p.status}</Badge></Td>
                        <Td>
                          <span className={cn('text-xs font-bold', p.tabSwitches >= 2 ? 'text-rose-600' : p.tabSwitches === 1 ? 'text-amber-600' : 'text-slate-400')}>
                            {p.tabSwitches > 0 && <ShieldAlert className="mr-1 inline h-3.5 w-3.5" />}{p.tabSwitches}×
                          </span>
                        </Td>
                        <Td className="font-bold">{p.score ?? '—'}</Td>
                        <Td className="text-xs text-slate-400">{p.lastSaved ? fmtTime(p.lastSaved) : '—'}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableWrap>
            </Card>
          )}
        </div>
      )}

      {tab === 'quiz' && (
        <div className="grid gap-4 md:grid-cols-2">
          {QUIZZES.map(q => {
            const course = COURSES.find(c => c.id === q.courseId)!;
            const m = getMapel(course.mapelId);
            const attempts = quizAttempts.filter(a => a.quizId === q.id);
            const left = q.maxAttempts - attempts.length;
            return (
              <Card key={q.id}>
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600"><HelpCircle className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">{q.title}</p>
                    <p className="text-xs text-slate-500">{m.name} · {getClass(course.classId).name}</p>
                  </div>
                  <Badge color={left > 0 ? 'emerald' : 'rose'}>{left > 0 ? `${left} kesempatan` : 'Habis'}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge color="indigo">{q.questionIds.length} soal</Badge>
                  <Badge color="slate"><Timer className="h-3 w-3" /> {q.durationMin} menit</Badge>
                  {q.randomize && <Badge color="slate"><Shuffle className="h-3 w-3" /> Acak</Badge>}
                  <Badge color="amber">Essay dinilai manual</Badge>
                </div>
                {attempts.length > 0 && (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3">
                    {attempts.map((a, i) => (
                      <p key={i} className="text-xs text-slate-600">Percobaan {i + 1}: <b className="text-indigo-700">{a.autoScore}/{a.maxAuto}</b> auto-grading {a.essayPending > 0 && `· ${a.essayPending} essay menunggu penilaian guru`}</p>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex justify-end border-t border-slate-50 pt-3">
                  <Link to={`/quiz/${q.id}`}>
                    <Button size="sm" disabled={left <= 0}><Play className="h-3.5 w-3.5" /> {attempts.length ? 'Kerjakan Lagi' : 'Kerjakan'}</Button>
                  </Link>
                </div>
              </Card>
            );
          })}
          <Card className="border-dashed">
            <div className="flex h-full flex-col items-center justify-center py-6 text-center">
              <Eye className="mb-2 h-6 w-6 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">Tipe soal didukung</p>
              <p className="mt-1 max-w-xs text-xs text-slate-400">Pilihan ganda & benar/salah (auto grading) · Isian (exact match/keyword) · Essay (manual, opsional AI-assisted fase lanjutan)</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
