import { useState } from 'react';
import {
  ShieldCheck, KeyRound, Fingerprint, Users, ScrollText, Server, Save,
  RotateCcw, Database, MonitorSmartphone, CheckCircle2, Lock, Mail, Bell,
} from 'lucide-react';
import { USERS, AUDIT_LOG, LOGIN_HISTORY, SCHOOL, ROLE_LABELS, ROLE_COLORS, STORAGE } from '../lib/data';
import { useStore } from '../lib/store';
import { cn, fmtDateTime } from '../lib/utils';
import { Avatar, Badge, Button, Card, PageHeader, ProgressBar, TableWrap, Td, Th, Tabs, Toggle, inputCls } from '../components/ui';

const FEATURES = ['Dashboard', 'Kelola Akademik', 'Nilai', 'Presensi', 'Bank Soal', 'Laporan', 'Integrasi', 'Pengaturan Sistem'];
const MATRIX: Record<string, boolean[]> = {
  superadmin: [true, true, true, true, true, true, true, true],
  admin: [true, true, true, true, true, true, true, true],
  kepsek: [true, false, true, true, false, true, false, false],
  guru: [true, false, true, true, true, true, false, false],
  walikelas: [true, false, true, true, true, true, false, false],
  siswa: [true, false, false, false, false, false, false, false],
  ortu: [true, false, false, false, false, true, false, false],
};

export default function Pengaturan() {
  const { user, settings, toggleSetting, toast } = useStore();
  const isAdmin = user && ['superadmin', 'admin'].includes(user.role);
  const isStaff = user && ['superadmin', 'admin', 'kepsek', 'guru', 'walikelas'].includes(user.role);
  const tabs = [
    { id: 'profil', label: 'Profil' },
    { id: 'keamanan', label: 'Keamanan & Login' },
    ...(isStaff ? [{ id: 'roles', label: 'Role & Permission' }, { id: 'audit', label: 'Audit Log' }] : []),
    ...(isAdmin ? [{ id: 'sistem', label: 'Sistem Sekolah' }] : []),
  ];
  const [tab, setTab] = useState('profil');
  const [pw, setPw] = useState({ lama: '', baru: '', konfirmasi: '' });
  const [branding, setBranding] = useState({ name: SCHOOL.name, address: SCHOOL.address });

  const resetPassword = () => {
    if (!pw.lama || !pw.baru) return toast('Lengkapi semua kolom password', 'error');
    if (pw.baru.length < 8) return toast('Password baru minimal 8 karakter', 'error');
    if (pw.baru !== pw.konfirmasi) return toast('Konfirmasi password tidak cocok', 'error');
    setPw({ lama: '', baru: '', konfirmasi: '' });
    toast('Password berhasil diubah. Sesi lain diminta login ulang.');
  };

  return (
    <div>
      <PageHeader title="Pengaturan & Keamanan" desc="Profil, password, 2FA, sesi, riwayat login, role & permission, audit log, dan sistem" />
      <div className="mb-6"><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

      {tab === 'profil' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Profil Saya">
            <div className="flex items-center gap-4">
              <Avatar name={user?.name || ''} color={user?.color} size="lg" />
              <div>
                <p className="font-display text-base font-bold text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.title}</p>
                <Badge color={user?.role === 'siswa' ? 'amber' : 'indigo'} className="mt-1">{ROLE_LABELS[user?.role || '']}</Badge>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <div><label className="mb-1 block text-xs font-bold text-slate-600">Nama lengkap</label><input className={inputCls} defaultValue={user?.name} /></div>
              <div><label className="mb-1 block text-xs font-bold text-slate-600">Email</label><input className={inputCls} defaultValue={user?.email} /></div>
              <Button onClick={() => toast('Profil diperbarui')}><Save className="h-4 w-4" /> Simpan Profil</Button>
            </div>
          </Card>
          <Card title="Ganti Password" subtitle="Password hashing bcrypt · sesi lain otomatis logout">
            <div className="space-y-3">
              <input type="password" className={inputCls} placeholder="Password lama" value={pw.lama} onChange={e => setPw({ ...pw, lama: e.target.value })} />
              <input type="password" className={inputCls} placeholder="Password baru (min. 8 karakter)" value={pw.baru} onChange={e => setPw({ ...pw, baru: e.target.value })} />
              <input type="password" className={inputCls} placeholder="Konfirmasi password baru" value={pw.konfirmasi} onChange={e => setPw({ ...pw, konfirmasi: e.target.value })} />
              <Button onClick={resetPassword}><KeyRound className="h-4 w-4" /> Ubah Password</Button>
            </div>
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500">
              Admin dapat me-reset password siswa/guru dari menu Manajemen Akademik. Link reset dikirim via email/WhatsApp.
            </div>
          </Card>
        </div>
      )}

      {tab === 'keamanan' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card title="Two-Factor Authentication (2FA)">
              <div className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Fingerprint className="h-5 w-5" /></div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">2FA untuk Admin & Super Admin</p>
                    <p className="text-xs text-slate-500">TOTP (Google Authenticator) wajib saat login</p>
                  </div>
                </div>
                <Toggle checked={!!settings.twoFA} onChange={() => { toggleSetting('twoFA'); toast(`2FA ${settings.twoFA ? 'dinonaktifkan' : 'diaktifkan'}`, 'info'); }} />
              </div>
            </Card>
            <Card title="Sesi Aktif">
              <div className="space-y-2">
                {[
                  { d: 'Chrome · Windows 11 (perangkat ini)', at: 'Aktif sekarang', current: true },
                  { d: 'Chrome · Android', at: '2 jam lalu', current: false },
                ].map(s => (
                  <div key={s.d} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                    <MonitorSmartphone className="h-4 w-4 text-slate-400" />
                    <div className="flex-1"><p className="text-xs font-bold text-slate-700">{s.d}</p><p className="text-[10px] text-slate-400">{s.at}</p></div>
                    {s.current ? <Badge color="emerald">Sesi ini</Badge> : <Button size="sm" variant="ghost" onClick={() => toast('Sesi dihentikan', 'info')}>Akhiri</Button>}
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Proteksi Sistem">
              <div className="space-y-2 text-xs text-slate-600">
                <p className="flex items-center gap-2"><Lock className="h-4 w-4 text-indigo-500" /> Password hashing bcrypt + salt</p>
                <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Rate limiting login (5 percobaan / 15 menit)</p>
                <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sky-500" /> Session management dengan expiry 8 jam</p>
                <p className="flex items-center gap-2"><Database className="h-4 w-4 text-violet-500" /> Backup otomatis harian 02.00 WIB</p>
              </div>
            </Card>
          </div>
          <Card title="Riwayat Login" subtitle="Login history semua pengguna (dapat difilter admin)" pad={false}>
            <TableWrap>
              <thead className="bg-slate-50"><tr><Th>Pengguna</Th><Th>Waktu</Th><Th>Perangkat</Th><Th>Status</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {LOGIN_HISTORY.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50/60">
                    <Td><p className="text-xs font-bold">{l.user}</p><p className="text-[10px] text-slate-400">{l.role}</p></Td>
                    <Td className="text-xs">{fmtDateTime(l.at)}</Td>
                    <Td className="text-xs">{l.device}<p className="text-[10px] text-slate-400">{l.ip}</p></Td>
                    <Td><Badge color={l.status === 'sukses' ? 'emerald' : 'rose'}>{l.status}</Badge></Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </Card>
        </div>
      )}

      {tab === 'roles' && (
        <div className="space-y-6">
          <Card title="Daftar Pengguna" subtitle="Kelola role dan reset password" pad={false}>
            <TableWrap>
              <thead className="bg-slate-50"><tr><Th>Pengguna</Th><Th>Email</Th><Th>Role</Th><Th>Aksi</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {USERS.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/60">
                    <Td><div className="flex items-center gap-2"><Avatar name={u.name} color={u.color} size="sm" /><span className="text-xs font-bold">{u.name}</span></div></Td>
                    <Td className="text-xs">{u.email}</Td>
                    <Td><span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-bold', ROLE_COLORS[u.role])}>{ROLE_LABELS[u.role]}</span></Td>
                    <Td><Button size="sm" variant="ghost" onClick={() => toast(`Password ${u.name} direset — link dikirim ke email`, 'success')}><RotateCcw className="h-3.5 w-3.5" /> Reset Password</Button></Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </Card>
          <Card title="Matrix Role & Permission" subtitle="Akses fitur per role (RBAC)" pad={false}>
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
      )}

      {tab === 'audit' && (
        <Card title="Audit Log" subtitle="Jejak semua aksi penting — tidak dapat diedit (append-only)" pad={false}>
          <TableWrap>
            <thead className="bg-slate-50"><tr><Th>Waktu</Th><Th>Pengguna</Th><Th>Aksi</Th><Th>Detail</Th><Th>IP</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {AUDIT_LOG.map(a => (
                <tr key={a.id} className="hover:bg-slate-50/60">
                  <Td className="text-xs whitespace-nowrap">{fmtDateTime(a.at)}</Td>
                  <Td className="text-xs font-bold">{a.user}</Td>
                  <Td><Badge color="indigo"><ScrollText className="h-3 w-3" /> {a.action}</Badge></Td>
                  <Td className="max-w-xs text-xs">{a.detail}</Td>
                  <Td className="font-mono text-[10px] text-slate-400">{a.ip}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>
      )}

      {tab === 'sistem' && isAdmin && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Profil & Branding Sekolah">
            <div className="space-y-3">
              <div><label className="mb-1 block text-xs font-bold text-slate-600">Nama sekolah</label><input className={inputCls} value={branding.name} onChange={e => setBranding({ ...branding, name: e.target.value })} /></div>
              <div><label className="mb-1 block text-xs font-bold text-slate-600">Alamat</label><input className={inputCls} value={branding.address} onChange={e => setBranding({ ...branding, address: e.target.value })} /></div>
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 p-3">
                <img src="/favicon.svg" alt="Logo" className="h-10 w-10 rounded-lg" />
                <div className="flex-1"><p className="text-xs font-bold text-slate-700">Logo sekolah</p><p className="text-[10px] text-slate-400">PNG/SVG maks 1 MB — tampil di sidebar, rapor, dan email</p></div>
                <Button size="sm" variant="secondary" onClick={() => toast('Logo diperbarui (demo)', 'info')}>Ganti</Button>
              </div>
              <Button onClick={() => toast('Branding sekolah tersimpan')}><Save className="h-4 w-4" /> Simpan Branding</Button>
            </div>
          </Card>
          <div className="space-y-6">
            <Card title="Pengaturan Tahun Ajaran & Notifikasi">
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                  <span className="font-bold text-slate-700">Tahun ajaran aktif</span>
                  <Badge color="indigo">{SCHOOL.year} · {SCHOOL.semester}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                  <span className="flex items-center gap-2 font-bold text-slate-700"><Bell className="h-4 w-4 text-indigo-500" /> Notifikasi in-app</span>
                  <Toggle checked onChange={() => toast('Notifikasi in-app selalu aktif', 'info')} />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                  <span className="flex items-center gap-2 font-bold text-slate-700"><Mail className="h-4 w-4 text-violet-500" /> Email (SMTP)</span>
                  <Toggle checked={!!settings.email} onChange={() => toggleSetting('email')} />
                </div>
              </div>
            </Card>
            <Card title="Backup & Penyimpanan">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700">Backup terakhir: hari ini 02.00 WIB ✓</p>
                <Button size="sm" variant="secondary" onClick={() => toast('Backup manual dimulai (background job)', 'info')}><Database className="h-3.5 w-3.5" /> Backup Sekarang</Button>
              </div>
              <ProgressBar value={(STORAGE.usedGB / STORAGE.quotaGB) * 100} color="bg-violet-500" />
              <p className="mt-1 text-[11px] text-slate-400">{STORAGE.usedGB} GB terpakai dari {STORAGE.quotaGB} GB · retensi backup 30 hari</p>
            </Card>
            <Card title="Keamanan & Monitoring Sistem">
              <div className="grid grid-cols-2 gap-2 text-center">
                {[['Uptime', '99,97%'], ['Rate limit aktif', '✓'], ['Activity monitor', '✓'], ['Secure exam mode', '✓']].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-slate-50 p-3">
                    <p className="font-display text-sm font-bold text-emerald-600">{v}</p>
                    <p className="text-[10px] font-semibold text-slate-500">{k}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
