import { useEffect, useRef, useState } from 'react';
import { CalendarCheck, RefreshCw, ShieldCheck, Clock, QrCode } from 'lucide-react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { cn } from '../lib/utils';
import { Badge, Button, Card, PageHeader, ProgressBar, TableWrap, Td, Th, Tabs } from '../components/ui';

type AttStatus = 'H' | 'I' | 'S' | 'A' | 'T';

const STATUS: { key: AttStatus; label: string; color: string; active: string }[] = [
  { key: 'H', label: 'Hadir', color: 'text-emerald-600', active: 'bg-emerald-500 text-white' },
  { key: 'I', label: 'Izin', color: 'text-sky-600', active: 'bg-sky-500 text-white' },
  { key: 'S', label: 'Sakit', color: 'text-amber-600', active: 'bg-amber-500 text-white' },
  { key: 'A', label: 'Alpa', color: 'text-rose-600', active: 'bg-rose-500 text-white' },
  { key: 'T', label: 'Terlambat', color: 'text-violet-600', active: 'bg-violet-500 text-white' },
];

const isStaffRole = (role: string) => ['guru', 'walikelas', 'admin', 'superadmin', 'kepsek'].includes(role);

interface SchoolClassRow { id: number; name: string; homeroom_teacher_id: number | null }
interface AttendanceRow { student_id: number; student_name: string; status: AttStatus | null; notes: string | null }
interface SummaryRow { student_id: number; student_name: string; hadir: number; izin: number; sakit: number; alpa: number; terlambat: number }

function pct(r: SummaryRow) {
  const total = r.hadir + r.izin + r.sakit + r.alpa + r.terlambat;
  return total ? Math.round(((r.hadir + r.terlambat) / total) * 100) : 0;
}

export default function Presensi() {
  const { user } = useStore();
  if (!user) return null;
  return isStaffRole(user.role) ? <StaffPresensi /> : <SelfPresensi />;
}

function SelfPresensi() {
  const { user } = useStore();
  const [row, setRow] = useState<SummaryRow | null>(null);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [scanMsg, setScanMsg] = useState('');

  useEffect(() => {
    api.get<{ data: SummaryRow[] }>('/attendance/summary')
      .then(res => setRow(res.data[0] ?? null))
      .catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'));
  }, []);

  const scan = async () => {
    setScanMsg('');
    try {
      await api.post(`/qr-attendance/${sessionId}/scan`, { code });
      setScanMsg('Presensi tercatat ✓');
      setCode('');
    } catch (e) {
      setScanMsg(e instanceof ApiError ? e.message : 'Gagal scan.');
    }
  };

  if (error) return <Card className="border-rose-200 bg-rose-50/60"><p className="text-sm font-semibold text-rose-700">{error}</p></Card>;

  const p = row ? pct(row) : 0;
  return (
    <div>
      <PageHeader title="Presensi Saya" desc={`${user!.name} — kehadiran semester ini`} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Kehadiran Semester</p>
          <p className="font-display mt-2 text-5xl font-bold text-emerald-600">{p}%</p>
          <ProgressBar value={p} className="mt-4" color="bg-emerald-500" />
          <p className="mt-2 text-[11px] text-slate-400">Target sekolah: ≥ 90%</p>
        </Card>
        <Card title="Rincian Kehadiran" className="lg:col-span-2">
          <div className="grid grid-cols-5 gap-3">
            {STATUS.map(s => (
              <div key={s.key} className="rounded-xl bg-slate-50 p-4 text-center">
                <p className={cn('font-display text-2xl font-bold', s.color)}>{row ? row[{ H: 'hadir', I: 'izin', S: 'sakit', A: 'alpa', T: 'terlambat' }[s.key] as keyof SummaryRow] : 0}</p>
                <p className="mt-1 text-[10px] font-bold text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Scan Presensi QR" subtitle="Masukkan kode yang ditampilkan wali kelas di kelas">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">ID Sesi</label>
              <input value={sessionId} onChange={e => setSessionId(e.target.value)} placeholder="mis. 1" className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Kode</label>
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="mis. 9B2859" className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono outline-none focus:border-indigo-500" />
            </div>
            <Button onClick={scan} disabled={!sessionId || !code}><QrCode className="h-4 w-4" /> Kirim</Button>
          </div>
          {scanMsg && <p className="mt-3 text-xs font-semibold text-slate-600">{scanMsg}</p>}
        </Card>
      </div>
    </div>
  );
}

function StaffPresensi() {
  const { user, toast } = useStore();
  const [tab, setTab] = useState('input');
  const [classes, setClasses] = useState<SchoolClassRow[]>([]);
  const [classId, setClassId] = useState<number | null>(null);
  const [date] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [qrSession, setQrSession] = useState<{ id: number; code: string; seconds_until_rotation: number; expires_at: string } | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    api.get<{ data: SchoolClassRow[] }>('/school-classes')
      .then(res => {
        setClasses(res.data);
        const mine = res.data.find(c => String(c.homeroom_teacher_id) === user!.id);
        setClassId((mine ?? res.data[0])?.id ?? null);
      })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!classId) return;
    if (tab === 'input') {
      setLoading(true);
      api.get<{ data: AttendanceRow[] }>(`/school-classes/${classId}/attendance?date=${date}`)
        .then(res => setRows(res.data))
        .catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'))
        .finally(() => setLoading(false));
    } else if (tab === 'rekap') {
      setLoading(true);
      api.get<{ data: SummaryRow[] }>(`/attendance/summary?school_class_id=${classId}`)
        .then(res => setSummary(res.data))
        .catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'))
        .finally(() => setLoading(false));
    }
  }, [classId, tab, date]);

  // Poll kode QR yang aktif tiap 3 detik biar layar selalu nunjukin kode terbaru (rotasi tiap 30 detik).
  useEffect(() => {
    if (tab !== 'qr' || !qrSession) return;
    pollRef.current = window.setInterval(() => {
      api.get<{ data: typeof qrSession }>(`/qr-attendance/${qrSession.id}`).then(res => setQrSession(res.data)).catch(() => {});
    }, 3000);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  }, [tab, qrSession?.id]);

  const setStatus = (studentId: number, status: AttStatus) => {
    setRows(rs => rs.map(r => r.student_id !== studentId ? r : { ...r, status }));
  };

  const save = async () => {
    if (!classId) return;
    setSaving(true);
    try {
      await api.post(`/school-classes/${classId}/attendance`, {
        date,
        records: rows.filter(r => r.status).map(r => ({ student_id: r.student_id, status: r.status })),
      });
      toast('Presensi tersimpan ✓');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menyimpan presensi', 'error');
    } finally {
      setSaving(false);
    }
  };

  const startQr = async () => {
    if (!classId) return;
    try {
      const res = await api.post<{ data: typeof qrSession }>(`/school-classes/${classId}/qr-attendance`, {});
      setQrSession(res.data);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal membuka sesi QR', 'error');
    }
  };

  const counts = STATUS.reduce((acc, s) => ({ ...acc, [s.key]: rows.filter(r => r.status === s.key).length }), {} as Record<AttStatus, number>);
  const tabs = [{ id: 'input', label: 'Input Presensi' }, { id: 'rekap', label: 'Rekap' }, { id: 'qr', label: 'QR Attendance' }];

  if (error) return <Card className="border-rose-200 bg-rose-50/60"><p className="text-sm font-semibold text-rose-700">{error}</p></Card>;
  const currentClass = classes.find(c => c.id === classId);

  return (
    <div>
      <PageHeader
        title="Presensi"
        desc="Hadir · Izin · Sakit · Alpa · Terlambat — input manual dan QR dinamis"
        action={
          <select value={classId ?? ''} onChange={e => setClassId(Number(e.target.value))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none">
            {classes.map(c => <option key={c.id} value={c.id}>Kelas {c.name}</option>)}
          </select>
        }
      />
      <div className="mb-6"><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-400">Memuat…</div>
      ) : tab === 'input' ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2" title={`Presensi Hari Ini — ${currentClass?.name ?? ''}`} subtitle={new Date(date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} pad={false}>
            <div className="divide-y divide-slate-50">
              {rows.map(s => (
                <div key={s.student_id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-800">{s.student_name}</p></div>
                  <div className="flex gap-1">
                    {STATUS.map(st => (
                      <button
                        key={st.key}
                        onClick={() => setStatus(s.student_id, st.key)}
                        title={st.label}
                        className={cn('h-8 w-8 rounded-lg text-[11px] font-bold transition', s.status === st.key ? st.active : 'bg-slate-100 text-slate-400 hover:bg-slate-200')}
                      >
                        {st.key}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {rows.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Tidak ada siswa di kelas ini.</p>}
            </div>
            {rows.length > 0 && (
              <div className="border-t border-slate-100 p-4">
                <Button className="w-full" onClick={save} disabled={saving}><CalendarCheck className="h-4 w-4" /> {saving ? 'Menyimpan…' : 'Simpan Presensi'}</Button>
              </div>
            )}
          </Card>
          <Card title="Ringkasan Hari Ini">
            <div className="space-y-2">
              {STATUS.map(s => (
                <div key={s.key} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5">
                  <span className={cn('text-xs font-bold', s.color)}>{s.label}</span>
                  <span className="font-display text-sm font-bold text-slate-800">{counts[s.key] || 0}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : tab === 'rekap' ? (
        <TableWrap>
          <thead className="bg-slate-50">
            <tr><Th>Siswa</Th><Th>Hadir</Th><Th>Izin</Th><Th>Sakit</Th><Th>Alpa</Th><Th>Terlambat</Th><Th>% Kehadiran</Th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {summary.map(r => (
              <tr key={r.student_id} className="hover:bg-slate-50/60">
                <Td className="text-xs font-bold">{r.student_name}</Td>
                <Td className="text-emerald-600">{r.hadir}</Td>
                <Td className="text-sky-600">{r.izin}</Td>
                <Td className="text-amber-600">{r.sakit}</Td>
                <Td className="text-rose-600">{r.alpa}</Td>
                <Td className="text-violet-600">{r.terlambat}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <ProgressBar value={pct(r)} className="w-24" color={pct(r) >= 95 ? 'bg-emerald-500' : pct(r) >= 90 ? 'bg-amber-500' : 'bg-rose-500'} />
                    <span className="text-xs font-bold">{pct(r)}%</span>
                  </div>
                </Td>
              </tr>
            ))}
            {summary.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-sm text-slate-400">Belum ada data presensi.</td></tr>}
          </tbody>
        </TableWrap>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="QR Attendance Dinamis" subtitle="Kode berotasi tiap 30 detik, diverifikasi server — screenshot lama otomatis ditolak">
            {!qrSession ? (
              <div className="flex flex-col items-center py-6">
                <Button onClick={startQr}><QrCode className="h-4 w-4" /> Buka Sesi Presensi QR</Button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="rounded-2xl border-4 border-indigo-100 bg-white p-8 shadow-lg">
                  <p className="text-center font-mono text-4xl font-bold tracking-widest text-slate-800">{qrSession.code}</p>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <Badge color="indigo">Sesi #{qrSession.id}</Badge>
                  <Badge color={qrSession.seconds_until_rotation <= 5 ? 'rose' : 'emerald'}><Clock className="h-3 w-3" /> rotasi dalam {qrSession.seconds_until_rotation}s</Badge>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-center text-[11px] text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Siswa masukkan Sesi #{qrSession.id} dan kode ini di halaman Presensi mereka
                </p>
                <Button variant="secondary" className="mt-4" onClick={startQr}><RefreshCw className="h-3.5 w-3.5" /> Mulai Sesi Baru</Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
