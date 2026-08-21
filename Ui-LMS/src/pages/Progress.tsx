import { AlertTriangle, BookOpen, CheckCircle2, Clock, MessageSquare, Star, TrendingUp, Upload, UserX, Zap } from 'lucide-react';
import { COURSES, STUDENTS, ACTIVITIES, ATTENDANCE_HISTORY, getMapel, getClass } from '../lib/data';
import { useStore } from '../lib/store';
import { cn, timeAgo, attendancePct } from '../lib/utils';
import { Badge, Card, PageHeader, ProgressBar, StatCard, TableWrap, Td, Th, Avatar } from '../components/ui';

const ACT_ICON: Record<string, typeof Zap> = {
  check: CheckCircle2, upload: Upload, star: Star, message: MessageSquare, quiz: Zap, alert: AlertTriangle, login: Zap,
};

export default function Progress() {
  const { user, completedMaterials } = useStore();
  const isStaff = user && ['guru', 'walikelas', 'admin', 'superadmin', 'kepsek'].includes(user.role);

  if (!isStaff) {
    const sid = user?.role === 'siswa' ? user.id : user?.childIds?.[0] || 's1';
    const name = STUDENTS.find(s => s.id === sid)?.name || '';
    const myCourses = COURSES.filter(c => c.classId === 'k3');
    const totalMats = myCourses.reduce((n, c) => n + c.modules.reduce((m, mo) => m + mo.materials.length, 0), 0);
    return (
      <div>
        <PageHeader title="Progress Belajar" desc={user?.role === 'ortu' ? `Perkembangan ${name}` : 'Perkembangan belajar kamu di LMS'} />
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={BookOpen} label="Materi Selesai" value={`${sid === user?.id ? completedMaterials.length : 7}/${totalMats}`} color="bg-indigo-50 text-indigo-600" />
          <StatCard icon={Clock} label="Durasi Belajar" value="14,5 jam" sub="30 hari terakhir" color="bg-violet-50 text-violet-600" />
          <StatCard icon={CheckCircle2} label="Tugas & Quiz" value="9/11" sub="2 menunggu deadline" color="bg-emerald-50 text-emerald-600" />
          <StatCard icon={TrendingUp} label="Skor Aktivitas" value="86" sub="Termasuk 5 besar kelas" color="bg-amber-50 text-amber-600" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Progress per Mata Pelajaran">
            <div className="space-y-4">
              {myCourses.map(c => {
                const mats = c.modules.flatMap(m => m.materials);
                const done = sid === user?.id ? mats.filter(x => completedMaterials.includes(x.id)).length : Math.floor(mats.length * 0.6);
                const m = getMapel(c.mapelId);
                return (
                  <div key={c.id}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">{m.name}</span>
                      <span className="text-slate-400">{done}/{mats.length} materi</span>
                    </div>
                    <ProgressBar value={(done / mats.length) * 100} color="bg-indigo-500" />
                  </div>
                );
              })}
            </div>
          </Card>
          <Card title="Aktivitas Terbaru">
            <div className="space-y-3">
              {ACTIVITIES.slice(0, 6).map(ac => {
                const Ic = ACT_ICON[ac.icon] || Zap;
                return (
                  <div key={ac.id} className="flex items-start gap-3">
                    <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', ac.icon === 'alert' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500')}>
                      <Ic className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-700"><b>{ac.user}</b> {ac.action}</p>
                      <p className="text-[10px] text-slate-400">{timeAgo(ac.at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const students = STUDENTS.filter(s => s.classId === 'k3');
  const rows = students.map((s, i) => {
    const pct = Math.min(100, 30 + ((i * 17 + 11) % 65));
    return { s, pct, dur: 4 + ((i * 3) % 14), tugas: pct > 60 ? '9/11' : pct > 45 ? '7/11' : '4/11', aktif: pct >= 45 };
  });
  const inactive = rows.filter(r => !r.aktif);

  return (
    <div>
      <PageHeader title="Progress & Aktivitas Siswa" desc="Progress mapel, materi selesai, durasi belajar, dan deteksi siswa tidak aktif" />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={TrendingUp} label="Rata-rata Progress Kelas" value={`${Math.round(rows.reduce((a, r) => a + r.pct, 0) / rows.length)}%`} color="bg-indigo-50 text-indigo-600" />
        <StatCard icon={Clock} label="Total Durasi Belajar" value="218 jam" sub="Kelas XI-IPA-1 · 30 hari" color="bg-violet-50 text-violet-600" />
        <StatCard icon={CheckCircle2} label="Siswa Aktif" value={`${rows.length - inactive.length}/${rows.length}`} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={UserX} label="Siswa Tidak Aktif" value={inactive.length} sub="Perlu tindak lanjut wali kelas" color="bg-rose-50 text-rose-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TableWrap>
            <thead className="bg-slate-50">
              <tr><Th>Siswa</Th><Th>Progress</Th><Th>Durasi</Th><Th>Tugas</Th><Th>Kehadiran</Th><Th>Status</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ s, pct, dur, tugas, aktif }) => {
                const att = ATTENDANCE_HISTORY.find(a => a.studentId === s.id)!;
                return (
                  <tr key={s.id} className="hover:bg-slate-50/60">
                    <Td>
                      <div className="flex items-center gap-2">
                        <Avatar name={s.name} color={aktif ? '#6366f1' : '#f43f5e'} size="sm" />
                        <div><p className="text-xs font-bold">{s.name}</p><p className="text-[10px] text-slate-400">{getClass(s.classId).name}</p></div>
                      </div>
                    </Td>
                    <Td><div className="flex items-center gap-2"><ProgressBar value={pct} className="w-20" color={pct < 45 ? 'bg-rose-400' : 'bg-indigo-500'} /><span className="text-xs font-bold">{pct}%</span></div></Td>
                    <Td className="text-xs">{dur} jam</Td>
                    <Td className="text-xs">{tugas}</Td>
                    <Td className="text-xs font-bold">{attendancePct(att)}%</Td>
                    <Td>{aktif ? <Badge color="emerald">Aktif</Badge> : <Badge color="rose"><UserX className="h-3 w-3" /> Tidak aktif</Badge>}</Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        </div>
        <div className="space-y-6">
          <Card title="Siswa Tidak Aktif" subtitle="Tidak ada aktivitas LMS > 5 hari" className="border-rose-100">
            {inactive.length === 0 ? <p className="py-4 text-center text-xs text-slate-400">Semua siswa aktif 🎉</p> : (
              <div className="space-y-2">
                {inactive.map(({ s }) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50/40 p-3">
                    <Avatar name={s.name} color="#f43f5e" size="sm" />
                    <div className="flex-1"><p className="text-xs font-bold text-slate-800">{s.name}</p><p className="text-[10px] text-slate-500">Login terakhir 7 hari lalu</p></div>
                    <Badge color="rose">Follow-up</Badge>
                  </div>
                ))}
                <p className="text-[10px] text-slate-400">Notifikasi otomatis dikirim ke wali kelas & orang tua.</p>
              </div>
            )}
          </Card>
          <Card title="Feed Aktivitas LMS">
            <div className="space-y-3">
              {ACTIVITIES.map(ac => {
                const Ic = ACT_ICON[ac.icon] || Zap;
                return (
                  <div key={ac.id} className="flex items-start gap-3">
                    <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', ac.icon === 'alert' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500')}>
                      <Ic className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-700"><b>{ac.user}</b> {ac.action}</p>
                      <p className="text-[10px] text-slate-400">{timeAgo(ac.at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
