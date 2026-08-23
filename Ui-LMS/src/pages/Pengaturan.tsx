import { useEffect, useState } from 'react';
import {
  ShieldCheck, KeyRound, Fingerprint, ScrollText, Save,
  MonitorSmartphone, CheckCircle2, Lock, Database,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { cn, fmtDateTime } from '../lib/utils';
import { Avatar, Badge, Button, Card, PageHeader, TableWrap, Td, Th, Tabs, inputCls } from '../components/ui';

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin', admin: 'Admin', kepsek: 'Kepala Sekolah',
  guru: 'Guru', walikelas: 'Wali Kelas', siswa: 'Siswa', ortu: 'Orang Tua',
};
const ROLE_COLORS: Record<string, string> = {
  superadmin: 'bg-rose-50 text-rose-700', admin: 'bg-indigo-50 text-indigo-700', kepsek: 'bg-violet-50 text-violet-700',
  guru: 'bg-sky-50 text-sky-700', walikelas: 'bg-emerald-50 text-emerald-700', siswa: 'bg-amber-50 text-amber-700', ortu: 'bg-pink-50 text-pink-700',
};

const FEATURES = ['Dashboard', 'Kelola Akademik', 'Nilai', 'Presensi', 'Bank Soal', 'Laporan', 'Pengaturan Sistem'];
const MATRIX: Record<string, boolean[]> = {
  superadmin: [true, true, true, true, true, true, true],
  admin: [true, true, true, true, true, true, true],
  kepsek: [true, false, true, true, false, true, false],
  guru: [true, false, true, true, true, false, false],
  walikelas: [true, false, true, true, true, false, false],
  siswa: [true, false, false, false, false, false, false],
  ortu: [true, false, false, false, false, false, false],
};

interface ApiSession { id: number; name: string; created_at: string; last_used_at: string | null; current: boolean }
interface ApiAuditLog { id: number; created_at: string; user: { id: number; name: string } | null; action: string; model: string | null; model_id: number | null }
interface ApiUserRow { id: number; name: string; email: string | null; username: string; roles: { name: string }[] }
interface ApiSchoolSetting { name: string; short_name: string | null; npsn: string | null; address: string | null; email: string | null; phone: string | null; logo_url: string | null }

export default function Pengaturan() {
  const { user, toast } = useStore();
  if (!user) return null;
  const isAdmin = ['superadmin', 'admin'].includes(user.role);
  const isStaff = ['superadmin', 'admin', 'kepsek', 'guru', 'walikelas'].includes(user.role);
  const tabs = [
    { id: 'profil', label: 'Profil' },
    { id: 'keamanan', label: 'Keamanan & Login' },
    ...(isStaff ? [{ id: 'roles', label: 'Role & Permission' }] : []),
    ...(isAdmin ? [{ id: 'audit', label: 'Audit Log' }, { id: 'sistem', label: 'Sistem Sekolah' }] : []),
  ];
  const [tab, setTab] = useState('profil');

  return (
    <div>
      <PageHeader title="Pengaturan & Keamanan" desc="Profil, password, 2FA, sesi, role & permission, audit log, dan sistem" />
      <div className="mb-6"><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

      {tab === 'profil' && <ProfilTab />}
      {tab === 'keamanan' && <KeamananTab />}
      {tab === 'roles' && isStaff && <RolesTab isAdmin={isAdmin} />}
      {tab === 'audit' && isAdmin && <AuditTab />}
      {tab === 'sistem' && isAdmin && <SistemTab />}
    </div>
  );
}

function ProfilTab() {
  const { user, toast, refreshUser } = useStore();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [pw, setPw] = useState({ lama: '', baru: '', konfirmasi: '' });
  const [savingPw, setSavingPw] = useState(false);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.put('/me', { name, email: email || null });
      await refreshUser();
      toast('Profil diperbarui');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menyimpan profil', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const resetPassword = async () => {
    if (!pw.lama || !pw.baru) return toast('Lengkapi semua kolom password', 'error');
    if (pw.baru.length < 8) return toast('Password baru minimal 8 karakter', 'error');
    if (pw.baru !== pw.konfirmasi) return toast('Konfirmasi password tidak cocok', 'error');
    setSavingPw(true);
    try {
      await api.post('/change-password', { current_password: pw.lama, new_password: pw.baru, new_password_confirmation: pw.konfirmasi });
      setPw({ lama: '', baru: '', konfirmasi: '' });
      toast('Password berhasil diubah. Sesi lain otomatis logout.');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal mengubah password', 'error');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Profil Saya">
        <div className="flex items-center gap-4">
          <Avatar name={user?.name || ''} color={user?.color} size="lg" />
          <div>
            <p className="font-display text-base font-bold text-slate-900">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.title}</p>
            <Badge color={user?.role === 'siswa' ? 'amber' : 'indigo'} className="mt-1">{ROLE_LABELS[user?.role || ''] ?? user?.role}</Badge>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          <div><label className="mb-1 block text-xs font-bold text-slate-600">Nama lengkap</label><input className={inputCls} value={name} onChange={e => setName(e.target.value)} /></div>
          <div><label className="mb-1 block text-xs font-bold text-slate-600">Email</label><input className={inputCls} value={email} onChange={e => setEmail(e.target.value)} /></div>
          <Button disabled={!name || savingProfile} onClick={saveProfile}><Save className="h-4 w-4" /> {savingProfile ? 'Menyimpan…' : 'Simpan Profil'}</Button>
        </div>
      </Card>
      <Card title="Ganti Password" subtitle="Password hashing bcrypt · sesi lain otomatis logout">
        <div className="space-y-3">
          <input type="password" className={inputCls} placeholder="Password lama" value={pw.lama} onChange={e => setPw({ ...pw, lama: e.target.value })} />
          <input type="password" className={inputCls} placeholder="Password baru (min. 8 karakter)" value={pw.baru} onChange={e => setPw({ ...pw, baru: e.target.value })} />
          <input type="password" className={inputCls} placeholder="Konfirmasi password baru" value={pw.konfirmasi} onChange={e => setPw({ ...pw, konfirmasi: e.target.value })} />
          <Button disabled={savingPw} onClick={resetPassword}><KeyRound className="h-4 w-4" /> {savingPw ? 'Menyimpan…' : 'Ubah Password'}</Button>
        </div>
      </Card>
    </div>
  );
}

function KeamananTab() {
  const { user, toast, refreshUser } = useStore();
  const [sessions, setSessions] = useState<ApiSession[] | null>(null);
  const [step, setStep] = useState<'idle' | 'setup' | 'done'>('idle');
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [disablePw, setDisablePw] = useState('');
  const [busy, setBusy] = useState(false);

  const loadSessions = () => {
    api.get<{ data: ApiSession[] }>('/sessions').then(r => setSessions(r.data)).catch(() => setSessions([]));
  };
  useEffect(loadSessions, []);

  const startSetup = async () => {
    setBusy(true);
    try {
      const res = await api.post<{ data: { secret: string; otpauth_url: string } }>('/2fa/setup');
      setSecret(res.data.secret);
      setOtpauthUrl(res.data.otpauth_url);
      setStep('setup');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal memulai setup 2FA', 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirmSetup = async () => {
    setBusy(true);
    try {
      const res = await api.post<{ recovery_codes: string[] }>('/2fa/confirm', { code });
      setRecoveryCodes(res.recovery_codes);
      setStep('done');
      setCode('');
      await refreshUser();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Kode tidak valid', 'error');
    } finally {
      setBusy(false);
    }
  };

  const disable2fa = async () => {
    if (!disablePw) return;
    setBusy(true);
    try {
      await api.post('/2fa/disable', { password: disablePw });
      setDisablePw('');
      toast('2FA dinonaktifkan');
      await refreshUser();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menonaktifkan 2FA', 'error');
    } finally {
      setBusy(false);
    }
  };

  const endSession = async (id: number) => {
    try {
      await api.delete(`/sessions/${id}`);
      toast('Sesi diakhiri');
      loadSessions();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal mengakhiri sesi', 'error');
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card title="Two-Factor Authentication (2FA)">
          {step === 'idle' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Fingerprint className="h-5 w-5" /></div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">TOTP (Google Authenticator)</p>
                    <p className="text-xs text-slate-500">{user?.twoFactorEnabled ? 'Aktif untuk akun ini' : 'Belum aktif'}{['superadmin', 'admin'].includes(user?.role ?? '') && ' · wajib untuk Admin/Super Admin'}</p>
                  </div>
                </div>
                <Badge color={user?.twoFactorEnabled ? 'emerald' : 'slate'}>{user?.twoFactorEnabled ? 'Aktif' : 'Nonaktif'}</Badge>
              </div>
              <Button size="sm" variant="secondary" disabled={busy} onClick={startSetup}>{user?.twoFactorEnabled ? 'Atur Ulang 2FA' : 'Aktifkan 2FA'}</Button>
              {user?.twoFactorEnabled && (
                <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                  <input type="password" className={inputCls} placeholder="Password (buat nonaktifkan)" value={disablePw} onChange={e => setDisablePw(e.target.value)} />
                  <Button size="sm" variant="ghost" disabled={!disablePw || busy} onClick={disable2fa}>Nonaktifkan</Button>
                </div>
              )}
            </div>
          )}
          {step === 'setup' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">Scan/masukkan secret ini di aplikasi authenticator (Google Authenticator, dsb):</p>
              <div className="rounded-xl bg-slate-50 p-3 font-mono text-xs break-all">{secret}</div>
              <p className="break-all text-[10px] text-slate-400">{otpauthUrl}</p>
              <input className={inputCls} placeholder="Masukkan 6 digit kode dari aplikasi" value={code} onChange={e => setCode(e.target.value)} />
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setStep('idle')}>Batal</Button>
                <Button size="sm" disabled={!code || busy} onClick={confirmSetup}>{busy ? 'Memverifikasi…' : 'Konfirmasi'}</Button>
              </div>
            </div>
          )}
          {step === 'done' && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-emerald-700">2FA aktif! Simpan recovery code berikut — masing-masing cuma bisa dipakai sekali kalau kehilangan akses authenticator:</p>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 font-mono text-xs">
                {recoveryCodes.map(c => <span key={c}>{c}</span>)}
              </div>
              <Button size="sm" onClick={() => setStep('idle')}>Selesai</Button>
            </div>
          )}
        </Card>
        <Card title="Proteksi Sistem">
          <div className="space-y-2 text-xs text-slate-600">
            <p className="flex items-center gap-2"><Lock className="h-4 w-4 text-indigo-500" /> Password hashing bcrypt + salt</p>
            <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Rate limiting login</p>
            <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sky-500" /> Token API per-sesi (Sanctum), bisa diakhiri manual</p>
          </div>
        </Card>
      </div>
      <Card title="Sesi Aktif" subtitle="Satu token = satu sesi login di perangkat/browser tertentu">
        {sessions === null ? <p className="py-6 text-center text-xs text-slate-400">Memuat sesi…</p> : (
          <div className="space-y-2">
            {sessions.map(s => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                <MonitorSmartphone className="h-4 w-4 text-slate-400" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-700">{s.name}</p>
                  <p className="text-[10px] text-slate-400">{s.last_used_at ? `Terakhir aktif ${fmtDateTime(s.last_used_at)}` : `Dibuat ${fmtDateTime(s.created_at)}`}</p>
                </div>
                {s.current ? <Badge color="emerald">Sesi ini</Badge> : <Button size="sm" variant="ghost" onClick={() => endSession(s.id)}>Akhiri</Button>}
              </div>
            ))}
            {sessions.length === 0 && <p className="py-6 text-center text-xs text-slate-400">Tidak ada sesi aktif.</p>}
          </div>
        )}
      </Card>
    </div>
  );
}

function RolesTab({ isAdmin }: { isAdmin: boolean }) {
  const { toast } = useStore();
  const [rows, setRows] = useState<ApiUserRow[] | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    api.get<{ data: { data: ApiUserRow[] } }>('/users').then(r => setRows(r.data.data)).catch(() => setRows([]));
  }, [isAdmin]);

  return (
    <div className="space-y-6">
      {isAdmin && (
      <Card title="Daftar Pengguna" pad={false}>
        {rows === null ? <p className="py-6 text-center text-xs text-slate-400">Memuat pengguna…</p> : (
          <TableWrap>
            <thead className="bg-slate-50"><tr><Th>Pengguna</Th><Th>Email</Th><Th>Role</Th><Th>Aksi</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <Td><div className="flex items-center gap-2"><Avatar name={u.name} color="#6366f1" size="sm" /><span className="text-xs font-bold">{u.name}</span></div></Td>
                  <Td className="text-xs">{u.email ?? '—'}</Td>
                  <Td>{u.roles.map(r => <span key={r.name} className={cn('mr-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold', ROLE_COLORS[r.name])}>{ROLE_LABELS[r.name] ?? r.name}</span>)}</Td>
                  <Td><Button size="sm" variant="ghost" onClick={() => toast('Reset password lewat halaman ini belum tersedia — belum ada endpoint di backend untuk itu.', 'info')}>Reset Password</Button></Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
      )}
      <Card title="Matrix Role & Permission" subtitle="Akses fitur per role (RBAC, ditegakkan lewat middleware backend)" pad={false}>
        <TableWrap>
          <thead className="bg-slate-50">
            <tr><Th>Fitur</Th>{Object.keys(MATRIX).map(r => <Th key={r} className="text-center">{ROLE_LABELS[r]}</Th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {FEATURES.map((f, i) => (
              <tr key={f} className="hover:bg-slate-50/60">
                <Td className="text-xs font-bold">{f}</Td>
                {Object.keys(MATRIX).map(r => (
                  <Td key={r} className="text-center">
                    {MATRIX[r][i] ? <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-500" /> : <span className="text-slate-200">—</span>}
                  </Td>
                ))}
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  );
}

function AuditTab() {
  const [logs, setLogs] = useState<ApiAuditLog[] | null>(null);

  useEffect(() => {
    api.get<{ data: ApiAuditLog[] }>('/audit-logs').then(r => setLogs(r.data)).catch(() => setLogs([]));
  }, []);

  return (
    <Card title="Audit Log" subtitle="Jejak semua aksi penting — tidak dapat diedit (append-only)" pad={false}>
      {logs === null ? <p className="py-6 text-center text-xs text-slate-400">Memuat audit log…</p> : (
        <TableWrap>
          <thead className="bg-slate-50"><tr><Th>Waktu</Th><Th>Pengguna</Th><Th>Aksi</Th><Th>Detail</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map(a => (
              <tr key={a.id} className="hover:bg-slate-50/60">
                <Td className="whitespace-nowrap text-xs">{fmtDateTime(a.created_at)}</Td>
                <Td className="text-xs font-bold">{a.user?.name ?? '—'}</Td>
                <Td><Badge color="indigo"><ScrollText className="h-3 w-3" /> {a.action}</Badge></Td>
                <Td className="max-w-xs text-xs">{a.model ? `${a.model} #${a.model_id}` : '—'}</Td>
              </tr>
            ))}
            {logs.length === 0 && <tr><Td className="py-6 text-center text-xs text-slate-400">Belum ada aktivitas tercatat.</Td></tr>}
          </tbody>
        </TableWrap>
      )}
    </Card>
  );
}

function SistemTab() {
  const { toast } = useStore();
  const [setting, setSetting] = useState<ApiSchoolSetting | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{ data: ApiSchoolSetting }>('/school-setting').then(r => {
      setSetting(r.data);
      setName(r.data.name);
      setAddress(r.data.address ?? '');
    }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('address', address);
      if (logoFile) fd.append('logo', logoFile);
      const res = await api.post<{ data: ApiSchoolSetting }>('/school-setting', fd);
      setSetting(res.data);
      setLogoFile(null);
      toast('Branding sekolah tersimpan');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (setting === null) return <p className="py-8 text-center text-sm text-slate-400">Memuat pengaturan sistem…</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Profil & Branding Sekolah">
        <div className="space-y-3">
          <div><label className="mb-1 block text-xs font-bold text-slate-600">Nama sekolah</label><input className={inputCls} value={name} onChange={e => setName(e.target.value)} /></div>
          <div><label className="mb-1 block text-xs font-bold text-slate-600">Alamat</label><input className={inputCls} value={address} onChange={e => setAddress(e.target.value)} /></div>
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 p-3">
            {setting.logo_url ? <img src={setting.logo_url} alt="Logo" className="h-10 w-10 rounded-lg object-cover" /> : <div className="h-10 w-10 rounded-lg bg-slate-100" />}
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-700">Logo sekolah</p>
              <p className="text-[10px] text-slate-400">{logoFile ? logoFile.name : 'PNG/JPG maks 2 MB'}</p>
            </div>
            <label className="cursor-pointer rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200">
              Ganti
              <input type="file" accept="image/*" className="hidden" onChange={e => setLogoFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <Button disabled={!name || saving} onClick={save}><Save className="h-4 w-4" /> {saving ? 'Menyimpan…' : 'Simpan Branding'}</Button>
        </div>
      </Card>
      <Card title="Konfigurasi Lain">
        <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
          <Database className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          Konfigurasi notifikasi & trigger backup manual sengaja tidak dikerjakan — gak ada channel notifikasi buat dikonfigurasi (komunikasi cukup lewat Forum), dan backup database sungguhan butuh akses shell di luar scope endpoint API biasa.
        </div>
      </Card>
    </div>
  );
}
