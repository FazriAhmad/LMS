import { useEffect, useState } from 'react';
import { CalendarDays, GraduationCap, Palmtree, PartyPopper, UsersRound, BookCheck, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { fmtDateLong } from '../lib/utils';
import { Badge, Button, Card, Modal, PageHeader, inputCls } from '../components/ui';
import type { LucideIcon } from 'lucide-react';

const TYPE_META: Record<string, { label: string; color: string; icon: LucideIcon; chip: string }> = {
  ujian: { label: 'Ujian', color: 'bg-rose-50 text-rose-600 border-rose-200', icon: BookCheck, chip: 'rose' },
  libur: { label: 'Libur', color: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: Palmtree, chip: 'emerald' },
  kegiatan: { label: 'Kegiatan', color: 'bg-amber-50 text-amber-600 border-amber-200', icon: PartyPopper, chip: 'amber' },
  rapat: { label: 'Rapat Dinas', color: 'bg-sky-50 text-sky-600 border-sky-200', icon: UsersRound, chip: 'sky' },
  semester: { label: 'Akademik', color: 'bg-violet-50 text-violet-600 border-violet-200', icon: GraduationCap, chip: 'violet' },
};

interface ApiCalendarEvent { id: string; title: string; date: string; type: keyof typeof TYPE_META }

const isAdminRole = (role: string) => ['admin', 'superadmin'].includes(role);

export default function Kalender() {
  const { user, toast } = useStore();
  const [events, setEvents] = useState<ApiCalendarEvent[] | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState<'libur' | 'kegiatan' | 'rapat' | 'semester'>('libur');
  const [saving, setSaving] = useState(false);

  const isAdmin = !!user && isAdminRole(user.role);

  const load = () => {
    api.get<{ data: ApiCalendarEvent[] }>('/calendar-events').then(r => setEvents(r.data)).catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'));
  };
  useEffect(load, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/calendar-events', { title, date, type });
      toast('Agenda ditambahkan');
      setOpen(false); setTitle(''); setDate('');
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/calendar-events/${id.replace('event-', '')}`);
      toast('Agenda dihapus');
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menghapus', 'error');
    }
  };

  if (error) return <Card className="border-rose-200 bg-rose-50/60"><p className="text-sm font-semibold text-rose-700">{error}</p></Card>;
  if (events === null) return <div className="py-10 text-center text-sm text-slate-400">Memuat kalender…</div>;

  const months = [...new Set(events.map(e => new Date(e.date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })))];

  return (
    <div>
      <PageHeader
        title="Kalender Akademik"
        desc="Agenda sekolah (libur, kegiatan, rapat) digabung dengan jadwal ujian nyata"
        action={
          <div className="flex items-center gap-2">
            <Badge color="indigo"><CalendarDays className="h-3 w-3" /> {events.length} agenda</Badge>
            {isAdmin && <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Tambah Agenda</Button>}
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {months.map(m => (
            <Card key={m} title={m} pad={false}>
              <div className="divide-y divide-slate-50">
                {events.filter(e => new Date(e.date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) === m).map(e => {
                  const meta = TYPE_META[e.type];
                  const d = new Date(e.date);
                  return (
                    <div key={e.id} className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50/60">
                      <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border ${meta.color}`}>
                        <span className="font-display text-lg font-bold leading-none">{d.getDate()}</span>
                        <span className="text-[9px] font-bold uppercase">{d.toLocaleDateString('id-ID', { month: 'short' })}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800">{e.title}</p>
                        <p className="text-xs text-slate-500">{fmtDateLong(e.date)}</p>
                      </div>
                      <Badge color={meta.chip}><meta.icon className="h-3 w-3" /> {meta.label}</Badge>
                      {isAdmin && e.id.startsWith('event-') && (
                        <button onClick={() => remove(e.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
          {events.length === 0 && <Card><p className="py-8 text-center text-sm text-slate-400">Belum ada agenda.</p></Card>}
        </div>
        <div className="space-y-4">
          <Card title="Legenda">
            <div className="space-y-2">
              {Object.entries(TYPE_META).map(([k, v]) => (
                <div key={k} className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${v.color}`}><v.icon className="h-4 w-4" /></div>
                  <span className="text-xs font-semibold text-slate-600">{v.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Tambah Agenda">
        <div className="space-y-3">
          <input className={inputCls} placeholder="Judul agenda" value={title} onChange={e => setTitle(e.target.value)} />
          <input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} />
          <select className={inputCls} value={type} onChange={e => setType(e.target.value as typeof type)}>
            <option value="libur">Libur</option>
            <option value="kegiatan">Kegiatan</option>
            <option value="rapat">Rapat Dinas</option>
            <option value="semester">Akademik</option>
          </select>
          <Button className="w-full" disabled={!title || !date || saving} onClick={save}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
        </div>
      </Modal>
    </div>
  );
}
