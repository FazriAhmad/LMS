import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, CalendarCheck, CalendarRange, ClipboardList, MessageSquareText, TrendingUp } from 'lucide-react';
import { STUDENTS, GRADES, ATTENDANCE_HISTORY, SCHEDULE, MAPEL, TEACHER_NOTES, ASSIGNMENTS, COURSES, getMapel, getClass, getTeacherName } from '../lib/data';
import { useStore } from '../lib/store';
import { cn, finalScore, gradeLetter, gradeColor, attendancePct, fmtDate, isOverdue } from '../lib/utils';
import { Avatar, Badge, Card, PageHeader, ProgressBar, Tabs } from '../components/ui';

const TABS = [
  { id: 'nilai', label: 'Nilai' },
  { id: 'presensi', label: 'Presensi' },
  { id: 'tugas', label: 'Tugas' },
  { id: 'jadwal', label: 'Jadwal' },
  { id: 'progress', label: 'Progress' },
  { id: 'catatan', label: 'Catatan Guru' },
];

export default function OrangTua() {
  const { user } = useStore();
  const children = (user?.childIds || []).map(id => STUDENTS.find(s => s.id === id)!).filter(Boolean);
  const [childId, setChildId] = useState(children[0]?.id || 's1');
  const [tab, setTab] = useState('nilai');
  const child = STUDENTS.find(s => s.id === childId)!;
  const kelas = getClass(child.classId);

  const grades = GRADES.filter(g => g.studentId === childId);
  const att = ATTENDANCE_HISTORY.find(a => a.studentId === childId);
  const notes = TEACHER_NOTES.filter(n => n.studentId === childId);
  const schedule = SCHEDULE.filter(s => s.classId === child.classId);
  const classAssignments = ASSIGNMENTS.filter(a => COURSES.find(c => c.id === a.courseId)?.classId === child.classId);

  return (
    <div>
      <PageHeader title="Data Anak" desc="Pantau nilai, presensi, tugas, jadwal, progress, dan catatan guru untuk setiap anak" />

      {/* Child selector — multiple children */}
      <div className="mb-6 flex flex-wrap gap-3">
        {children.map(c => (
          <button key={c.id} onClick={() => setChildId(c.id)} className={cn('flex items-center gap-3 rounded-2xl border-2 bg-white p-4 pr-6 text-left transition', childId === c.id ? 'border-indigo-500 shadow-md shadow-indigo-100' : 'border-slate-200 hover:border-indigo-200')}>
            <Avatar name={c.name} color={c.id === 's1' ? '#d97706' : '#e11d48'} size="lg" />
            <div>
              <p className="text-sm font-bold text-slate-900">{c.name}</p>
              <p className="text-xs text-slate-500">Kelas {getClass(c.classId).name} · NIS {c.nis}</p>
            </div>
            {childId === c.id && <Badge color="indigo" className="ml-2">Dipilih</Badge>}
          </button>
        ))}
      </div>

      <div className="mb-6"><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>

      {tab === 'nilai' && (
        grades.length === 0 ? (
          <Card><p className="py-8 text-center text-sm text-slate-400">Nilai {child.name.split(' ')[0]} belum dipublikasikan semester ini.</p></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {grades.map(g => {
              const f = finalScore(g); const m = getMapel(g.mapelId);
              return (
                <Card key={g.mapelId}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl text-[10px] font-bold text-white" style={{ backgroundColor: m.color }}>{m.code}</div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">{m.name}</p>
                      <p className="text-[11px] text-slate-400">{getTeacherName(MAPEL.find(x => x.id === g.mapelId)!.teacherId)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-xl font-bold text-slate-900">{f}</p>
                      <span className={cn('rounded-lg px-2 py-0.5 text-[10px] font-bold', gradeColor(gradeLetter(f)))}>Grade {gradeLetter(f)}</span>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[10px]">
                    {[['Tugas', g.tugas], ['Quiz', g.quiz], ['PTS', g.pts], ['PAS', g.pas]].map(([l, v]) => (
                      <div key={String(l)} className="rounded-lg bg-slate-50 p-2"><p className="font-bold text-slate-700">{v}</p><p className="text-slate-400">{l}</p></div>
                    ))}
                  </div>
                  <ProgressBar value={f} className="mt-3" color={f >= 80 ? 'bg-emerald-500' : f >= 70 ? 'bg-amber-500' : 'bg-rose-500'} />
                </Card>
              );
            })}
          </div>
        )
      )}

      {tab === 'presensi' && att && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Kehadiran {child.name.split(' ')[0]}</p>
            <p className="font-display mt-2 text-5xl font-bold text-emerald-600">{attendancePct(att)}%</p>
            <ProgressBar value={attendancePct(att)} className="mt-4" color="bg-emerald-500" />
          </Card>
          <Card title="Rincian Semester" className="lg:col-span-2">
            <div className="grid grid-cols-5 gap-3">
              {[['Hadir', att.hadir, 'text-emerald-600'], ['Izin', att.izin, 'text-sky-600'], ['Sakit', att.sakit, 'text-amber-600'], ['Alpa', att.alpa, 'text-rose-600'], ['Terlambat', att.terlambat, 'text-violet-600']].map(([l, v, c]) => (
                <div key={String(l)} className="rounded-xl bg-slate-50 p-4 text-center">
                  <p className={cn('font-display text-2xl font-bold', String(c))}>{v}</p>
                  <p className="mt-1 text-[10px] font-bold text-slate-500">{l}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] text-slate-400">Anda otomatis menerima notifikasi WhatsApp/email saat anak tidak hadir.</p>
          </Card>
        </div>
      )}

      {tab === 'tugas' && (
        <div className="space-y-3">
          {classAssignments.map(a => {
            const sub = a.submissions.find(s => s.studentId === childId);
            const course = COURSES.find(c => c.id === a.courseId)!;
            return (
              <Card key={a.id}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><ClipboardList className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">{a.title}</p>
                    <p className="text-xs text-slate-500">{getMapel(course.mapelId).name} · tenggat {fmtDate(a.deadline)} {isOverdue(a.deadline) ? '' : `(${Math.max(0, Math.ceil((new Date(a.deadline).getTime() - Date.now()) / 86400000))} hari lagi)`}</p>
                  </div>
                  {sub ? (
                    <Badge color={sub.status === 'dinilai' ? 'emerald' : sub.status === 'sudah' ? 'sky' : sub.status === 'revisi' ? 'amber' : 'slate'}>
                      {sub.status === 'dinilai' ? `Nilai ${sub.score}` : sub.status === 'sudah' ? 'Sudah dikumpulkan' : sub.status === 'revisi' ? 'Perlu revisi' : 'Belum dikumpulkan'}
                    </Badge>
                  ) : <Badge color="slate">Belum dikumpulkan</Badge>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'jadwal' && (
        <Card title={`Jadwal Kelas ${kelas.name}`} subtitle="Minggu ini" pad={false}>
          <div className="divide-y divide-slate-50">
            {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map((d, di) => {
              const items = schedule.filter(s => s.day === di);
              if (!items.length) return null;
              return (
                <div key={d} className="px-5 py-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">{d}</p>
                  <div className="flex flex-wrap gap-2">
                    {items.map(s => {
                      const m = getMapel(s.mapelId);
                      return (
                        <span key={s.id} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-1.5 text-xs">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                          <b>{m.name}</b> <span className="text-slate-400">{s.start}–{s.end}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {tab === 'progress' && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card><div className="text-center"><TrendingUp className="mx-auto h-6 w-6 text-indigo-500" /><p className="font-display mt-2 text-3xl font-bold">{childId === 's1' ? '68%' : '54%'}</p><p className="text-xs text-slate-500">Materi diselesaikan</p></div></Card>
          <Card><div className="text-center"><Award className="mx-auto h-6 w-6 text-amber-500" /><p className="font-display mt-2 text-3xl font-bold">{childId === 's1' ? '14,5' : '9,2'} jam</p><p className="text-xs text-slate-500">Durasi belajar 30 hari</p></div></Card>
          <Card><div className="text-center"><CalendarRange className="mx-auto h-6 w-6 text-emerald-500" /><p className="font-display mt-2 text-3xl font-bold">{childId === 's1' ? '9/11' : '6/9'}</p><p className="text-xs text-slate-500">Tugas & quiz selesai</p></div></Card>
          <Card className="md:col-span-3" title="Progress Mata Pelajaran">
            <div className="space-y-3">
              {COURSES.filter(c => c.classId === child.classId).map((c, i) => {
                const m = getMapel(c.mapelId);
                const pct = Math.min(100, 40 + ((i * 21 + (childId === 's1' ? 15 : 0)) % 55));
                return (
                  <div key={c.id}>
                    <div className="mb-1 flex justify-between text-xs"><span className="font-semibold text-slate-700">{m.name}</span><span className="text-slate-400">{pct}%</span></div>
                    <ProgressBar value={pct} color="bg-indigo-500" />
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {tab === 'catatan' && (
        <div className="space-y-4">
          {notes.length === 0 ? (
            <Card><p className="py-8 text-center text-sm text-slate-400">Belum ada catatan guru untuk {child.name}.</p></Card>
          ) : notes.map((n, i) => (
            <Card key={i}>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><MessageSquareText className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs font-bold text-slate-800">{n.from}</p>
                  <p className="text-[10px] text-slate-400">{fmtDate(n.at)}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">“{n.note}”</p>
                </div>
              </div>
            </Card>
          ))}
          <p className="text-center text-[11px] text-slate-400">
            Ingin berdiskusi dengan guru? <Link to="/komunikasi" className="font-bold text-indigo-600 hover:underline">Buka chat wali kelas</Link>
          </p>
        </div>
      )}
    </div>
  );
}
