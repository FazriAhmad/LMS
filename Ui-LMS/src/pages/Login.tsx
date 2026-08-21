import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Lock, Mail, ShieldCheck, Sparkles, Users2, CalendarCheck, MonitorPlay } from 'lucide-react';
import { useStore } from '../lib/store';
import { USERS, SCHOOL, PASSWORD, ROLE_LABELS, ROLE_COLORS } from '../lib/data';
import { cn } from '../lib/utils';
import { Avatar } from '../components/ui';

export default function Login() {
  const { login, loginAs, toast } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email, password)) {
      toast('Selamat datang di EduNusa LMS!');
      navigate('/');
    } else {
      setError('Email atau password salah. Gunakan password demo: demo123');
    }
  };

  const quick = (id: string) => {
    loginAs(id);
    toast('Login demo berhasil');
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Left: form */}
      <div className="flex w-full flex-col justify-center px-6 py-10 lg:w-[46%] lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-900/50">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-display text-lg font-bold text-white">EduNusa LMS</p>
              <p className="text-xs text-slate-400">{SCHOOL.name}</p>
            </div>
          </div>

          <h1 className="font-display text-2xl font-bold text-white">Masuk ke akun Anda</h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Platform pembelajaran terpadu — akademik, CBT, presensi, dan komunikasi orang tua.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Email</label>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 focus-within:border-indigo-400">
                <Mail className="h-4 w-4 shrink-0 text-slate-500" />
                <input
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="nama@sman1.sch.id"
                  className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-500"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Password</label>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 focus-within:border-indigo-400">
                <Lock className="h-4 w-4 shrink-0 text-slate-500" />
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-500"
                />
              </div>
            </div>
            {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-400">{error}</p>}
            <button type="submit" className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-900/50 transition hover:bg-indigo-500 active:scale-[0.99]">
              Masuk
            </button>
            <p className="text-center text-[11px] text-slate-500">
              Password demo untuk semua akun: <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-indigo-300">{PASSWORD}</code>
            </p>
          </form>

          <div className="mt-8">
            <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Login cepat sebagai demo
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {USERS.map(u => (
                <button
                  key={u.id} onClick={() => quick(u.id)}
                  className="group flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-3 transition hover:border-indigo-400/50 hover:bg-indigo-500/10"
                >
                  <Avatar name={u.name} color={u.color} size="sm" />
                  <span className="text-center text-[10px] font-semibold leading-tight text-slate-300 group-hover:text-white">
                    {ROLE_LABELS[u.role]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Password hashing · 2FA admin · rate limiting · audit trail aktif
          </div>
        </div>
      </div>

      {/* Right: image */}
      <div className="relative hidden flex-1 lg:block">
        <img src="/images/login.jpg" alt="Siswa belajar" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-indigo-950/40" />
        <div className="absolute inset-x-0 bottom-0 p-12">
          <div className="mb-6 flex gap-3">
            {[
              { icon: Users2, v: '206', l: 'Siswa Aktif' },
              { icon: MonitorPlay, v: '100%', l: 'Ujian CBT' },
              { icon: CalendarCheck, v: '96%', l: 'Kehadiran' },
            ].map(s => (
              <div key={s.l} className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur">
                <s.icon className="mb-2 h-5 w-5 text-indigo-300" />
                <p className="font-display text-xl font-bold text-white">{s.v}</p>
                <p className="text-[11px] text-slate-300">{s.l}</p>
              </div>
            ))}
          </div>
          <h2 className="font-display text-3xl font-bold leading-tight text-white">
            Satu platform untuk seluruh ekosistem sekolah.
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-300">
            Dari kurikulum CP·TP·ATP, ujian CBT dengan anti-kecurangan, hingga keterlibatan orang tua — semua terhubung.
          </p>
        </div>
      </div>
    </div>
  );
}
