import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, Clock, DoorOpen } from 'lucide-react';
import { SCHEDULE, EXAMS, CLASSES, getMapel, getClass, getTeacherName } from '../lib/data';
import { useStore } from '../lib/store';
import { cn, DAYS, detectConflicts, fmtDate, fmtTime } from '../lib/utils';
import { Badge, Card, PageHeader, Tabs } from '../components/ui';

export default function Jadwal() {
  const { user } = useStore();
  const isStaff = user && ['superadmin', 'admin', 'kepsek', 'guru', 'walikelas'].includes(user.role);
  const [tab, setTab] = useState(isStaff ? 'kelas' : 'jadwal');
  const [classId, setClassId] = useState(user?.classId || user?.homeroomClassId || 'k3');

  const items = useMemo(() => {
    if (!user) return [];
    if (user.role === 'siswa') return SCHEDULE.filter(s => s.classId === user.classId);
    if (user.role === 'guru' || user.role === 'walikelas') {
      return tab === 'guru' ? SCHEDULE.filter(s => s.teacherId === user.id) : SCHEDULE.filter(s => s.classId === classId);
    }
    return SCHEDULE.filter(s => s.classId === classId);
  }, [user, tab, classId]);

  const conflicts = useMemo(() => detectConflicts(SCHEDULE), []);
  const relevantConflicts = conflicts.filter(c =>
    user?.role === 'siswa' ? c.a.classId === user.classId || c.b.classId === user.classId : true
  );

  const tabs = user?.role === 'siswa'
    ? [{ id: 'jadwal', label: 'Jadwal Saya' }, { id: 'ujian', label: 'Jadwal Ujian' }]
    : user?.role === 'ortu'
      ? [{ id: 'jadwal', label: 'Jadwal Anak' }, { id: 'ujian', label: 'Jadwal Ujian' }]
      : [
          { id: 'kelas', label: 'Jadwal Kelas' },
          ...(user && (user.role === 'guru' || user.role === 'walikelas') ? [{ id: 'guru', label: 'Jadwal Mengajar Saya' }] : []),
          { id: 'ujian', label: 'Jadwal Ujian' },
        ];

  return (
    <div>
      <PageHeader
        title="Jadwal"
        desc="Jadwal siswa, guru, kelas, dan ujian — dengan deteksi bentrok otomatis"
        action={
          tab !== 'ujian' && (isStaff || user?.role === 'ortu') ? (
            <select value={classId} onChange={e => setClassId(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-500">
              {CLASSES.map(c => <option key={c.id} value={c.id}>Kelas {c.name}</option>)}
            </select>
          ) : undefined
        }
      />

      {relevantConflicts.length > 0 && tab !== 'ujian' && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-800">
            <AlertTriangle className="h-4 w-4" /> Terdeteksi {relevantConflicts.length} bentrok jadwal
          </p>
          <ul className="mt-2 space-y-1.5">
            {relevantConflicts.map((c, i) => (
              <li key={i} className="text-xs text-amber-700">
                <b>{DAYS[c.a.day]}</b> · {getMapel(c.a.mapelId).name} ({c.a.start}–{c.a.end}, {getClass(c.a.classId).name})
                bertabrakan dengan <b>{getMapel(c.b.mapelId).name}</b> ({c.b.start}–{c.b.end}, {getClass(c.b.classId).name})
                {c.kind === 'guru' && <> — guru <b>{getTeacherName(c.a.teacherId)}</b> terjadwal di dua kelas</>}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-amber-600">Sistem mendeteksi overlap otomatis berdasarkan waktu, kelas, dan guru. Perbaiki melalui menu Manajemen Akademik.</p>
        </div>
      )}

      <div className="mb-6"><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

      {tab === 'ujian' ? (
        <div className="space-y-3">
          {EXAMS.map(e => (
            <Card key={e.id}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">{e.title}</p>
                  <p className="text-xs text-slate-500">
                    {e.type} · Kelas {getClass(e.classId).name} · {fmtDate(e.date)} {fmtTime(e.date)} · durasi {e.durationMin} menit
                  </p>
                </div>
                <Badge color={e.status === 'aktif' ? 'emerald' : e.status === 'selesai' ? 'slate' : 'sky'}>
                  {e.status === 'aktif' ? 'Berlangsung' : e.status === 'selesai' ? 'Selesai' : 'Terjadwal'}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          {DAYS.map((dayName, d) => {
            const dayItems = items.filter(s => s.day === d).sort((a, b) => a.start.localeCompare(b.start));
            const isToday = (new Date().getDay() + 6) % 7 === d;
            return (
              <div key={dayName} className={cn('rounded-2xl border bg-white p-3 shadow-sm', isToday ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200')}>
                <p className={cn('mb-3 flex items-center justify-between px-1 text-xs font-bold uppercase tracking-wide', isToday ? 'text-indigo-700' : 'text-slate-500')}>
                  {dayName}
                  {isToday && <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] text-white">Hari ini</span>}
                </p>
                <div className="space-y-2">
                  {dayItems.length === 0 && <p className="px-1 py-4 text-center text-[11px] text-slate-300">Tidak ada jadwal</p>}
                  {dayItems.map(s => {
                    const m = getMapel(s.mapelId);
                    const inConflict = relevantConflicts.some(c => c.a.id === s.id || c.b.id === s.id);
                    return (
                      <div key={s.id} className={cn('rounded-xl border-l-4 bg-slate-50 p-2.5 transition hover:bg-slate-100', inConflict && 'ring-2 ring-amber-300')} style={{ borderLeftColor: m.color }}>
                        <p className="text-xs font-bold text-slate-800">{m.name}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500"><Clock className="h-3 w-3" /> {s.start}–{s.end}</p>
                        <p className="flex items-center gap-1 text-[10px] text-slate-500"><DoorOpen className="h-3 w-3" /> {s.room}</p>
                        <p className="mt-0.5 truncate text-[10px] text-slate-400">{getTeacherName(s.teacherId)}</p>
                        {inConflict && <p className="mt-1 flex items-center gap-1 text-[9px] font-bold text-amber-600"><AlertTriangle className="h-3 w-3" /> Bentrok!</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
