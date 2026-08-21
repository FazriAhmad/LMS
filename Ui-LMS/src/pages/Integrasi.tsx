import { Chrome, HardDrive, Video, Youtube, Mail, MessageCircle, CalendarDays, Plug, CheckCircle2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { Badge, Card, PageHeader, Toggle } from '../components/ui';
import type { LucideIcon } from 'lucide-react';

const INTEGRATIONS: { key: string; name: string; desc: string; icon: LucideIcon; color: string }[] = [
  { key: 'gworkspace', name: 'Google Workspace', desc: 'SSO login siswa & guru menggunakan akun belajar.id', icon: Chrome, color: 'bg-blue-50 text-blue-600' },
  { key: 'gdrive', name: 'Google Drive', desc: 'Sinkronisasi materi berukuran besar tanpa membebani storage LMS', icon: HardDrive, color: 'bg-emerald-50 text-emerald-600' },
  { key: 'meet', name: 'Google Meet', desc: 'Link kelas virtual otomatis di jadwal & course', icon: Video, color: 'bg-teal-50 text-teal-600' },
  { key: 'zoom', name: 'Zoom', desc: 'Alternatif video conference untuk webinar sekolah', icon: Video, color: 'bg-sky-50 text-sky-600' },
  { key: 'youtube', name: 'YouTube (Unlisted)', desc: 'Opsi default untuk konten video materi — hemat storage', icon: Youtube, color: 'bg-red-50 text-red-600' },
  { key: 'email', name: 'Email', desc: 'Notifikasi nilai, deadline, dan laporan via SMTP sekolah', icon: Mail, color: 'bg-violet-50 text-violet-600' },
  { key: 'whatsapp', name: 'WhatsApp', desc: 'Broadcast pengumuman & pengingat orang tua via WA Gateway', icon: MessageCircle, color: 'bg-green-50 text-green-600' },
  { key: 'gcalendar', name: 'Google Calendar', desc: 'Kalender akademik & jadwal ujian tersinkron dua arah', icon: CalendarDays, color: 'bg-indigo-50 text-indigo-600' },
];

export default function Integrasi() {
  const { settings, toggleSetting, toast } = useStore();
  const active = INTEGRATIONS.filter(i => settings[i.key]).length;

  return (
    <div>
      <PageHeader
        title="Integrasi Layanan"
        desc="Hubungkan EduNusa LMS dengan layanan eksternal"
        action={<Badge color="emerald"><Plug className="h-3 w-3" /> {active}/{INTEGRATIONS.length} terhubung</Badge>}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {INTEGRATIONS.map(i => {
          const on = !!settings[i.key];
          return (
            <Card key={i.key} className={on ? 'border-emerald-200' : ''}>
              <div className="flex items-start gap-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${i.color}`}>
                  <i.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{i.name}</h3>
                    {on && <Badge color="emerald"><CheckCircle2 className="h-3 w-3" /> Terhubung</Badge>}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{i.desc}</p>
                </div>
                <Toggle checked={on} onChange={() => { toggleSetting(i.key); toast(`${i.name} ${on ? 'diputus' : 'terhubung'} ✓`, on ? 'info' : 'success'); }} />
              </div>
            </Card>
          );
        })}
      </div>
      <p className="mt-6 text-center text-[11px] text-slate-400">
        Kredensial OAuth disimpan terenkripsi. Admin dapat memutus integrasi kapan saja tanpa kehilangan data LMS.
      </p>
    </div>
  );
}
