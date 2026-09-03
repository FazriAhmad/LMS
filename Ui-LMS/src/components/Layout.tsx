import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, GraduationCap, BookOpen, ClipboardList, MonitorPlay, Database,
  Star, CalendarCheck, CalendarDays, CalendarRange, TrendingUp, MessagesSquare,
  Baby, FileSpreadsheet, FolderOpen, Settings, Bell, LogOut, Menu, X,
  School, Search, ShieldCheck, Users, Activity, MessageSquareText, FileText,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { ROLE_LABELS, ROLE_COLORS, SCHOOL } from '../lib/data';
import { cn, timeAgo } from '../lib/utils';
import { Avatar } from './ui';
import type { Role } from '../lib/types';
import type { LucideIcon } from 'lucide-react';

interface NavItem { to: string; label: string; icon: LucideIcon; roles: Role[] }

const ALL: Role[] = ['superadmin', 'admin', 'kepsek', 'guru', 'walikelas', 'siswa', 'ortu'];
const STAFF: Role[] = ['superadmin', 'admin', 'kepsek', 'guru', 'walikelas'];

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Utama',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ALL },
    ],
  },
  {
    group: 'Akademik',
    items: [
      { to: '/akademik', label: 'Manajemen Akademik', icon: School, roles: ['superadmin', 'admin', 'kepsek'] },
      { to: '/kurikulum', label: 'Kurikulum (CP·TP·ATP)', icon: GraduationCap, roles: ['superadmin', 'admin', 'kepsek', 'guru', 'walikelas'] },
      { to: '/jadwal', label: 'Jadwal', icon: CalendarRange, roles: ALL },
      { to: '/kalender', label: 'Kalender Akademik', icon: CalendarDays, roles: ALL },
    ],
  },
  {
    group: 'Pembelajaran',
    items: [
      { to: '/courses', label: 'Mata Pelajaran', icon: BookOpen, roles: ALL },
      { to: '/tugas', label: 'Tugas', icon: ClipboardList, roles: ALL },
      { to: '/ujian', label: 'Ujian & Quiz', icon: MonitorPlay, roles: ALL },
      { to: '/bank-soal', label: 'Bank Soal', icon: Database, roles: STAFF },
      { to: '/nilai', label: 'Nilai', icon: Star, roles: ALL },
      { to: '/presensi', label: 'Presensi', icon: CalendarCheck, roles: ALL },
      { to: '/progress', label: 'Progress & Aktivitas', icon: TrendingUp, roles: ALL },
      { to: '/materi-kelas', label: 'Materi Kelas', icon: FileText, roles: ['siswa'] },
    ],
  },
  {
    /**
     * Grup terpisah untuk "topi" wali kelas. Guru mengurus mata pelajarannya lintas kelas
     * (grup Pembelajaran di atas); wali kelas mengurus SATU kelas. Seorang guru yang
     * merangkap wali kelas melihat kedua grup sekaligus — itu memang perilaku yang diharapkan.
     */
    group: 'Wali Kelas',
    items: [
      { to: '/materi-kelas', label: 'Materi Kelas', icon: FileText, roles: ['walikelas'] },
      { to: '/pesan', label: 'Pesan Orang Tua', icon: MessageSquareText, roles: ['walikelas'] },
    ],
  },
  {
    group: 'Komunikasi',
    items: [
      { to: '/komunikasi', label: 'Forum Diskusi', icon: MessagesSquare, roles: STAFF.concat('siswa') },
    ],
  },
  {
    group: 'Sistem',
    items: [
      { to: '/laporan', label: 'Laporan', icon: FileSpreadsheet, roles: ['superadmin', 'admin', 'kepsek', 'guru', 'walikelas'] },
      { to: '/files', label: 'File Management', icon: FolderOpen, roles: STAFF },
      { to: '/pengaturan', label: 'Pengaturan & Keamanan', icon: Settings, roles: ALL },
    ],
  },
];

/**
 * Ortu punya struktur menu sendiri, bukan hasil filter NAV di atas: yang dilihat ortu adalah
 * aktivitas ANAKNYA (lewat endpoint /parent/*), bukan halaman guru/siswa yang kebetulan
 * boleh diakses. Semua item Aktivitas Anak menunjuk ke satu halaman ber-tab (`/aktivitas/:tab`).
 */
const NAV_ORTU: { group: string; items: NavItem[] }[] = [
  {
    group: 'Utama',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['ortu'] },
      { to: '/anak', label: 'Data Anak', icon: Baby, roles: ['ortu'] },
    ],
  },
  {
    group: 'Aktivitas Anak',
    items: [
      { to: '/aktivitas/nilai', label: 'Nilai', icon: Star, roles: ['ortu'] },
      { to: '/aktivitas/presensi', label: 'Presensi', icon: CalendarCheck, roles: ['ortu'] },
      { to: '/aktivitas/tugas', label: 'Tugas', icon: ClipboardList, roles: ['ortu'] },
      { to: '/aktivitas/jadwal', label: 'Jadwal', icon: CalendarRange, roles: ['ortu'] },
      { to: '/aktivitas/progress', label: 'Progress', icon: TrendingUp, roles: ['ortu'] },
      { to: '/aktivitas/catatan', label: 'Catatan Guru', icon: MessageSquareText, roles: ['ortu'] },
    ],
  },
  {
    group: 'Sekolah',
    items: [
      { to: '/kalender', label: 'Kalender Akademik', icon: CalendarDays, roles: ['ortu'] },
      { to: '/pesan', label: 'Komunikasi', icon: MessagesSquare, roles: ['ortu'] },
    ],
  },
  {
    group: 'Sistem',
    items: [
      { to: '/pengaturan', label: 'Pengaturan & Keamanan', icon: Settings, roles: ['ortu'] },
    ],
  },
];

const NOTIF_ICON: Record<string, LucideIcon> = {
  tugas: ClipboardList, nilai: Star, ujian: MonitorPlay, pengumuman: Bell, chat: MessagesSquare,
  laporan: FileSpreadsheet, info: Bell,
};

export default function Layout() {
  const { user, logout, notifications, markAllRead } = useStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  if (!user) return null;
  const unread = notifications.filter(n => !n.read).length;

  // Dicek terhadap SEMUA peran, bukan cuma peran utama: guru yang merangkap wali kelas
  // harus dapat menu guru sekaligus menu khusus wali kelas.
  const myRoles: Role[] = user.roles?.length ? user.roles : [user.role];
  const navSource = user.role === 'ortu' ? NAV_ORTU : NAV;
  const navFor = navSource
    .map(g => ({ ...g, items: g.items.filter(i => i.roles.some(r => myRoles.includes(r))) }))
    .filter(g => g.items.length);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-950 text-slate-300 transition-transform lg:static lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <img src="/images/logo-sekolah.jpg" alt="Logo sekolah" className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-lg shadow-indigo-900/50" />
          <div className="min-w-0">
            <p className="font-display text-sm font-bold text-white">{SCHOOL.name}</p>
            <p className="truncate text-[10px] text-slate-400">Learning Management System</p>
          </div>
          <button className="ml-auto text-slate-400 lg:hidden" onClick={() => setSidebarOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <nav className="dark-scroll flex-1 overflow-y-auto px-3 py-4">
          {navFor.map(g => (
            <div key={g.group} className="mb-4">
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">{g.group}</p>
              {g.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => cn(
                    'mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition',
                    isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-2 rounded-xl bg-white/5 p-3">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
            <p className="text-[10px] leading-tight text-slate-400">RBAC aktif · sesi terenkripsi · audit log on</p>
          </div>
        </div>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 md:px-6">
            <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden max-w-md flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
              <Search className="h-4 w-4 text-slate-400" />
              <input placeholder="Cari siswa, tugas, materi…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className={cn('hidden rounded-full px-3 py-1 text-[11px] font-bold sm:inline-block', ROLE_COLORS[user.role])}>
                {ROLE_LABELS[user.role]}
              </span>
              {/* Notifications */}
              <div className="relative">
                <button onClick={() => { setNotifOpen(o => !o); setUserOpen(false); }} className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                  <Bell className="h-5 w-5" />
                  {unread > 0 && <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">{unread}</span>}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <p className="text-sm font-bold text-slate-800">Notifikasi</p>
                      <button onClick={markAllRead} className="text-xs font-semibold text-indigo-600 hover:underline">Tandai dibaca</button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.slice(0, 8).map(n => {
                        const Ic = NOTIF_ICON[n.kind] || Bell;
                        return (
                          <div key={n.id} className={cn('flex gap-3 border-b border-slate-50 px-4 py-3', !n.read && 'bg-indigo-50/50')}>
                            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                              <Ic className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium leading-snug text-slate-700">{n.text}</p>
                              <p className="mt-0.5 text-[10px] text-slate-400">{timeAgo(n.time)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              {/* User menu */}
              <div className="relative">
                <button onClick={() => { setUserOpen(o => !o); setNotifOpen(false); }} className="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-slate-100">
                  <Avatar name={user.name} color={user.color} size="sm" />
                  <span className="hidden text-left md:block">
                    <span className="block max-w-[140px] truncate text-xs font-bold text-slate-800">{user.name}</span>
                    <span className="block text-[10px] text-slate-400">{user.email}</span>
                  </span>
                </button>
                {userOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                    <div className="border-b border-slate-100 px-3 py-2">
                      <p className="text-sm font-bold text-slate-800">{user.name}</p>
                      <p className="text-[11px] text-slate-400">{user.title}</p>
                    </div>
                    <button onClick={() => { setUserOpen(false); navigate('/pengaturan'); }} className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50">
                      <Users className="h-4 w-4" /> Profil & Keamanan
                    </button>
                    <button onClick={() => { setUserOpen(false); navigate('/progress'); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50">
                      <Activity className="h-4 w-4" /> Aktivitas Saya
                    </button>
                    <button onClick={() => { logout(); navigate('/login'); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50">
                      <LogOut className="h-4 w-4" /> Keluar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6" onClick={() => { if (notifOpen) setNotifOpen(false); if (userOpen) setUserOpen(false); }}>
          <Outlet />
        </main>
        <footer className="border-t border-slate-200 px-6 py-4 text-center text-[11px] text-slate-400">
          {SCHOOL.name} · Tahun Ajaran {SCHOOL.year} Semester {SCHOOL.semester}
        </footer>
      </div>
    </div>
  );
}
