import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Clock, Plus, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { COURSES, getMapel, getClass } from '../lib/data';
import { useStore } from '../lib/store';
import { fmtDate, daysUntil, isOverdue, cn } from '../lib/utils';
import { Badge, Button, Card, Modal, PageHeader, inputCls } from '../components/ui';

export default function Tugas() {
  const { user, assignments, toast } = useStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [courseId, setCourseId] = useState('c1');

  const isStaff = user && ['guru', 'walikelas', 'admin', 'superadmin', 'kepsek'].includes(user.role);
  const visible = assignments.filter(a => {
    const c = COURSES.find(x => x.id === a.courseId)!;
    if (!user) return false;
    if (user.role === 'siswa') return c.classId === user.classId;
    if (user.role === 'ortu') return c.classId === 'k3';
    if (user.role === 'guru' || user.role === 'walikelas') return true;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Tugas"
        desc="Pembuatan, pengumpulan online, rubrik penilaian, revisi, dan feedback"
        action={isStaff ? <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Buat Tugas</Button> : undefined}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {visible.map(a => {
          const c = COURSES.find(x => x.id === a.courseId)!;
          const m = getMapel(c.mapelId);
          const sub = a.submissions.find(s => s.studentId === user?.id);
          const collected = a.submissions.filter(s => s.status !== 'belum').length;
          const overdue = isOverdue(a.deadline);
          return (
            <Link key={a.id} to={`/tugas/${a.id}`}>
              <Card className="h-full transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white" style={{ backgroundColor: m.color }}>{m.code}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">{a.title}</p>
                    <p className="text-xs text-slate-500">{m.name} · {getClass(c.classId).name}</p>
                  </div>
                  {user?.role === 'siswa' && sub ? (
                    <Badge color={sub.status === 'dinilai' ? 'emerald' : sub.status === 'sudah' ? 'sky' : sub.status === 'revisi' ? 'amber' : overdue ? 'rose' : 'slate'}>
                      {sub.status === 'dinilai' ? `Nilai ${sub.score}` : sub.status === 'sudah' ? 'Terkumpul' : sub.status === 'revisi' ? 'Revisi' : overdue ? 'Terlambat' : 'Belum'}
                    </Badge>
                  ) : (
                    <Badge color="indigo">{collected}/{a.submissions.length} kumpul</Badge>
                  )}
                </div>
                <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-500">{a.description}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-50 pt-3">
                  <span className={cn('flex items-center gap-1 text-[11px] font-semibold', overdue ? 'text-rose-600' : 'text-slate-500')}>
                    <Clock className="h-3.5 w-3.5" /> {fmtDate(a.deadline)}
                    {!overdue && daysUntil(a.deadline) >= 0 && ` · ${daysUntil(a.deadline)} hari lagi`}
                  </span>
                  <span className="ml-auto flex items-center gap-2 text-[11px] text-slate-400">
                    {a.attachments.length > 0 && <span className="flex items-center gap-1"><Upload className="h-3 w-3" /> {a.attachments.length} lampiran</span>}
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> rubrik</span>
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Buat Tugas Baru">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Judul tugas</label>
            <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="cth: Latihan Soal Limit Fungsi" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Course</label>
            <select className={inputCls} value={courseId} onChange={e => setCourseId(e.target.value)}>
              {COURSES.map(c => <option key={c.id} value={c.id}>{getMapel(c.mapelId).name} — {getClass(c.classId).name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Deadline</label>
            <input type="datetime-local" className={inputCls} value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500">
            <p className="font-bold text-slate-600">Fitur otomatis aktif:</p>
            <p>· Pengumpulan online + attachment · Rubrik penilaian · Revisi & feedback · Status pengumpulan · Notifikasi deadline ke siswa & orang tua</p>
          </div>
          <Button className="w-full" disabled={!title || !deadline} onClick={() => {
            setCreateOpen(false); setTitle(''); setDeadline('');
            toast('Tugas berhasil dibuat & notifikasi dikirim ke siswa', 'success');
          }}>
            <ClipboardList className="h-4 w-4" /> Publikasikan Tugas
          </Button>
        </div>
      </Modal>

      {visible.length === 0 && (
        <Card><div className="py-8 text-center text-sm text-slate-400"><AlertTriangle className="mx-auto mb-2 h-6 w-6" />Belum ada tugas.</div></Card>
      )}
    </div>
  );
}
