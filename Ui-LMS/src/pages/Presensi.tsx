import { useEffect, useMemo, useState } from 'react';
import { QrCode, Save, CalendarCheck, RefreshCw, ShieldCheck, Clock } from 'lucide-react';
import { STUDENTS, ATTENDANCE_HISTORY, CLASSES, getClass } from '../lib/data';
import { useStore } from '../lib/store';
import { cn, attendancePct } from '../lib/utils';
import { Badge, Button, Card, PageHeader, ProgressBar, TableWrap, Td, Th, Tabs } from '../components/ui';
import type { AttStatus } from '../lib/types';

const STATUS: { key: AttStatus; label: string; color: string; active: string }[] = [
  { key: 'H', label: 'Hadir', color: 'text-emerald-600', active: 'bg-emerald-500 text-white' },
  { key: 'I', label: 'Izin', color: 'text-sky-600', active: 'bg-sky-500 text-white' },
  { key: 'S', label: 'Sakit', color: 'text-amber-600', active: 'bg-amber-500 text-white' },
  { key: 'A', label: 'Alpa', color: 'text-rose-600', active: 'bg-rose-500 text-white' },
  { key: 'T', label: 'Terlambat', color: 'text-violet-600', active: 'bg-violet-500 text-white' },
];

function makeQrCode(seed: string) {
  // deterministic pseudo-QR pattern
  const cells: boolean[] = [];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = 0; i < 441; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    cells.push((h & 0x40000) !== 0);
  }
  return cells;
}

export default function Presensi() {
  const { user, todayAttendance, setAttendanceStatus, toast, pushNotif } = useStore();
  const isStaff = user && ['guru', 'walikelas', 'admin', 'superadmin', 'kepsek'].includes(user.role);
  const [tab, setTab] = useState(isStaff ? 'input' : 'saya');
  const [classId, setClassId] = useState(user?.homeroomClassId || 'k3');
  const [period, setPeriod] = useState('semester');
  const [qrCode, setQrCode] = useState('SMANSA-' + Math.random().toString(36).slice(2, 8).toUpperCase());
  const [qrTtl, setQrTtl] = useState(8);
  const [scans, setScans] = useState<{ name: string; at: string }[]>([
    { name: 'Bella Safitri', at: '07:02' }, { name: 'Citra Ayu Lestari', at: '07:03' }, { name: 'Andi Pratama', at: '07:04' },
  ]);

  // QR dynamic rotation
  useEffect(() => {
    if (tab !== 'qr') return;
    const iv = window.setInterval(() => {
      setQrTtl(t => {
        if (t <= 1) {
          setQrCode('SMANSA-' + Math.random().toString(36).slice(2, 8).toUpperCase());
          return 8;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(iv);
  }, [tab]);

  const cells = useMemo(() => makeQrCode(qrCode), [qrCode]);
  const students = STUDENTS.filter(s => s.classId === classId);
  const counts = useMemo(() => {
    const c: Record<AttStatus, number> = { H: 0, I: 0, S: 0, A: 0, T: 0 };
    students.forEach(s => { c[todayAttendance[s.id] || 'H']++; });
    return c;
  }, [students, todayAttendance]);

  if (!isStaff) {
    const sid = user?.role === 'siswa' ? user.id : user?.childIds?.[0] || 's1';
    const st = STUDENTS.find(s => s.id === sid)!;
    const hist = ATTENDANCE_HISTORY.find(a => a.studentId === sid) || ATTENDANCE_HISTORY[0];
    const pct = attendancePct(hist);
    return (
      <div>
        <PageHeader title="Presensi Saya" desc={`${st.name} · Kelas ${getClass(st.classId).name} · Hari ini: ${STATUS.find(s => s.key === (todayAttendance[sid] || 'H'))?.label}`} />
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Kehadiran Semester</p>
            <p className="font-display mt-2 text-5xl font-bold text-emerald-600">{pct}%</p>
            <ProgressBar value={pct} className="mt-4" color="bg-emerald-500" />
            <p className="mt-2 text-[11px] text-slate-400">Target sekolah: ≥ 90%</p>
          </Card>
          <Card title="Rincian Kehadiran" className="lg:col-span-2">
            <div className="grid grid-cols-5 gap-3">
              {STATUS.map(s => (
                <div key={s.key} className="rounded-xl bg-slate-50 p-4 text-center">
                  <p className={cn('font-display text-2xl font-bold', s.color)}>{hist[s.key === 'H' ? 'hadir' : s.key === 'I' ? 'izin' : s.key === 'S' ? 'sakit' : s.key === 'A' ? 'alpa' : 'terlambat']}</p>
                  <p className="mt-1 text-[10px] font-bold text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-2 text-[11px] text-slate-400"><QrCode className="h-4 w-4" /> Sekolah menggunakan QR dinamis (rotasi berkala) untuk mencegah titip absen via screenshot.</p>
          </Card>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'input', label: 'Input Presensi' },
    { id: 'rekap', label: 'Rekap' },
    { id: 'qr', label: 'QR Attendance' },
    ...(user?.role === 'kepsek' ? [{ id: 'guru', label: 'Presensi Guru' }] : []),
  ];

  return (
    <div>
      <PageHeader
        title="Presensi"
        desc="Hadir · Izin · Sakit · Alpa · Terlambat — rekap harian, bulanan, dan semester"
        action={
          <select value={classId} onChange={e => setClassId(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none">
            {CLASSES.map(c => <option key={c.id} value={c.id}>Kelas {c.name}</option>)}
          </select>
        }
      />
      <div className="mb-6"><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

      {tab === 'input' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2" title={`Presensi Hari Ini — ${getClass(classId).name}`} subtitle={new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} pad={false}>
            <div className="divide-y divide-slate-50">
              {students.map(s => (
                <div key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800">{s.name}</p>
                    <p className="text-[10px] text-slate-400">NIS {s.nis}</p>
                  </div>
                  <div className="flex gap-1">
                    {STATUS.map(st => (
                      <button
                        key={st.key}
                        onClick={() => setAttendanceStatus(s.id, st.key)}
                        title={st.label}
                        className={cn('h-8 w-8 rounded-lg text-[11px] font-bold transition', todayAttendance[s.id] === st.key ? st.active : 'bg-slate-100 text-slate-400 hover:bg-slate-200')}
                      >
                        {st.key}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 p-4">
              <Button className="w-full" onClick={() => { toast('Presensi tersimpan ✓ Orang tua siswa absen dinotifikasi'); pushNotif('Presensi kelas disimpan — notifikasi dikirim ke orang tua siswa alpa/sakit', 'info'); }}>
                <Save className="h-4 w-4" /> Simpan Presensi
              </Button>
            </div>
          </Card>
          <div className="space-y-4">
            <Card title="Ringkasan Hari Ini">
              <div className="space-y-2">
                {STATUS.map(s => (
                  <div key={s.key} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5">
                    <span className={cn('text-xs font-bold', s.color)}>{s.label}</span>
                    <span className="font-display text-sm font-bold text-slate-800">{counts[s.key]}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-center">
                <p className="font-display text-2xl font-bold text-emerald-700">{Math.round(((counts.H + counts.T) / students.length) * 100)}%</p>
                <p className="text-[10px] font-bold text-emerald-600">TINGKAT KEHADIRAN</p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'rekap' && (
        <div>
          <div className="mb-4 flex gap-2">
            {[['harian', 'Harian'], ['bulanan', 'Bulanan'], ['semester', 'Semester']].map(([k, l]) => (
              <button key={k} onClick={() => setPeriod(k)} className={cn('rounded-lg px-4 py-2 text-xs font-bold transition', period === k ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50')}>{l}</button>
            ))}
          </div>
          <TableWrap>
            <thead className="bg-slate-50">
              <tr><Th>Siswa</Th><Th>Hadir</Th><Th>Izin</Th><Th>Sakit</Th><Th>Alpa</Th><Th>Terlambat</Th><Th>% Kehadiran</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ATTENDANCE_HISTORY.filter(h => students.some(s => s.id === h.studentId)).map(h => {
                const s = STUDENTS.find(x => x.id === h.studentId)!;
                const pct = attendancePct(h);
                const scale = period === 'harian' ? 1 : period === 'bulanan' ? 22 : 1;
                return (
                  <tr key={h.studentId} className="hover:bg-slate-50/60">
                    <Td className="text-xs font-bold">{s.name}</Td>
                    <Td className="text-emerald-600">{Math.round(h.hadir / (period === 'semester' ? 1 : scale * 4.5))}</Td>
                    <Td className="text-sky-600">{period === 'semester' ? h.izin : Math.min(h.izin, 2)}</Td>
                    <Td className="text-amber-600">{period === 'semester' ? h.sakit : Math.min(h.sakit, 1)}</Td>
                    <Td className="text-rose-600">{period === 'semester' ? h.alpa : 0}</Td>
                    <Td className="text-violet-600">{period === 'semester' ? h.terlambat : Math.min(h.terlambat, 1)}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <ProgressBar value={pct} className="w-24" color={pct >= 95 ? 'bg-emerald-500' : pct >= 90 ? 'bg-amber-500' : 'bg-rose-500'} />
                        <span className="text-xs font-bold">{pct}%</span>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        </div>
      )}

      {tab === 'qr' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="QR Attendance Dinamis" subtitle="Kode berputar otomatis setiap 8 detik — screenshot tidak bisa dipakai ulang">
            <div className="flex flex-col items-center">
              <div className="relative rounded-2xl border-4 border-indigo-100 bg-white p-4 shadow-lg">
                <div className="grid grid-cols-[repeat(21,1fr)] gap-px" style={{ width: 210, height: 210 }}>
                  {cells.map((c, i) => {
                    const row = Math.floor(i / 21), col = i % 21;
                    const finder = (row < 7 && col < 7) || (row < 7 && col > 13) || (row > 13 && col < 7);
                    const finderOn = finder && ((row === 0 || row === 6 || col === 0 || col === 6 || (row >= 2 && row <= 4 && col >= 2 && col <= 4)) && !((row < 7 && col > 13 && col < 16)) || (row < 7 && col > 13 && ((row === 0 || row === 6 || col === 14 || col === 20 || (row >= 2 && row <= 4 && col >= 16 && col <= 18)))));
                    return <div key={i} className={cn('aspect-square', (finder ? finderOn : c) ? 'bg-slate-900' : 'bg-white')} />;
                  })}
                </div>
                <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg">
                  <RefreshCw className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Badge color="indigo" className="font-mono text-sm">{qrCode}</Badge>
                <Badge color={qrTtl <= 3 ? 'rose' : 'emerald'}><Clock className="h-3 w-3" /> rotasi dalam {qrTtl}s</Badge>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-center text-[11px] text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Anti titip-absen: kode rotasi + validasi lokasi opsional
              </p>
            </div>
          </Card>
          <Card title="Log Scan Pagi Ini">
            <div className="space-y-2">
              {scans.map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2.5">
                  <span className="text-xs font-semibold text-slate-700">{s.name}</span>
                  <Badge color="emerald"><CalendarCheck className="h-3 w-3" /> {s.at}</Badge>
                </div>
              ))}
            </div>
            <Button variant="secondary" className="mt-4 w-full" onClick={() => {
              const next = students[scans.length % students.length];
              setScans(sc => [...sc, { name: next.name, at: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }]);
              toast('Scan QR valid — presensi tercatat', 'success');
            }}>
              <QrCode className="h-4 w-4" /> Simulasi Scan QR
            </Button>
          </Card>
        </div>
      )}

      {tab === 'guru' && (
        <Card title="Presensi Guru & Staf Bulan Ini">
          <TableWrap>
            <thead className="bg-slate-50"><tr><Th>Nama</Th><Th>Hadir</Th><Th>Izin</Th><Th>% Kehadiran</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {[['Dewi Lestari, S.Si', 22, 0, 100], ['Rina Kartika, S.Si', 21, 1, 96], ['Joko Susilo, M.Pd', 22, 0, 100], ['Maria Ulfa, S.Pd', 20, 2, 91], ['Robert Wilson, M.Hum', 21, 1, 96], ['Andi Nugroho, S.Kom', 22, 0, 100]].map(([n, h, i, p]) => (
                <tr key={String(n)} className="hover:bg-slate-50/60">
                  <Td className="text-xs font-bold">{n}</Td><Td>{h}</Td><Td>{i}</Td>
                  <Td><Badge color={Number(p) >= 95 ? 'emerald' : 'amber'}>{p}%</Badge></Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>
      )}
    </div>
  );
}
