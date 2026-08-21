import { CalendarDays, GraduationCap, Palmtree, PartyPopper, UsersRound, BookCheck } from 'lucide-react';
import { CALENDAR, SCHOOL } from '../lib/data';
import { fmtDateLong } from '../lib/utils';
import { Badge, Card, PageHeader } from '../components/ui';
import type { LucideIcon } from 'lucide-react';

const TYPE_META: Record<string, { label: string; color: string; icon: LucideIcon; chip: string }> = {
  ujian: { label: 'Ujian', color: 'bg-rose-50 text-rose-600 border-rose-200', icon: BookCheck, chip: 'rose' },
  libur: { label: 'Libur', color: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: Palmtree, chip: 'emerald' },
  kegiatan: { label: 'Kegiatan', color: 'bg-amber-50 text-amber-600 border-amber-200', icon: PartyPopper, chip: 'amber' },
  rapat: { label: 'Rapat Dinas', color: 'bg-sky-50 text-sky-600 border-sky-200', icon: UsersRound, chip: 'sky' },
  semester: { label: 'Akademik', color: 'bg-violet-50 text-violet-600 border-violet-200', icon: GraduationCap, chip: 'violet' },
};

export default function Kalender() {
  const months = [...new Set(CALENDAR.map(e => new Date(e.date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })))];

  return (
    <div>
      <PageHeader
        title="Kalender Akademik"
        desc={`Tahun ajaran ${SCHOOL.year} · Semester ${SCHOOL.semester} · tersinkron dengan Google Calendar`}
        action={<Badge color="indigo"><CalendarDays className="h-3 w-3" /> {CALENDAR.length} agenda</Badge>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {months.map(m => (
            <Card key={m} title={m} pad={false}>
              <div className="divide-y divide-slate-50">
                {CALENDAR.filter(e => new Date(e.date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) === m).map(e => {
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
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
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
          <Card title="Sinkronisasi">
            <p className="text-xs leading-relaxed text-slate-500">
              Kalender akademik otomatis tersinkron ke <b>Google Calendar</b> guru, siswa, dan orang tua.
              Jadwal ujian CBT juga muncul sebagai event dengan pengingat 1 hari sebelumnya.
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
              <span className="h-2 w-2 animate-pulse-dot rounded-full bg-emerald-500" /> Terhubung & tersinkron
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
