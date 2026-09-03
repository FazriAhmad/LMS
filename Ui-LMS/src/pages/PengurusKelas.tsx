import { useEffect, useState } from 'react';
import { Crown, Shield, Wallet, NotebookPen, UsersRound, ChevronDown, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { cn } from '../lib/utils';
import { Avatar, Badge, Card, PageHeader } from '../components/ui';
import type { LucideIcon } from 'lucide-react';

interface ApiRosterStudent { student_id: number; name: string; nis: string | null; class_role: string | null }
interface ApiRoster { data: ApiRosterStudent[]; school_class: { id: number; name: string } }

const ROLES: { value: string; label: string; icon: LucideIcon; color: string }[] = [
  { value: 'ketua_kelas', label: 'Ketua Kelas', icon: Crown, color: 'bg-amber-50 text-amber-600' },
  { value: 'wakil_ketua', label: 'Wakil Ketua', icon: UsersRound, color: 'bg-sky-50 text-sky-600' },
  { value: 'sekretaris', label: 'Sekretaris', icon: NotebookPen, color: 'bg-violet-50 text-violet-600' },
  { value: 'bendahara', label: 'Bendahara', icon: Wallet, color: 'bg-emerald-50 text-emerald-600' },
  { value: 'keamanan', label: 'Keamanan Kelas', icon: Shield, color: 'bg-rose-50 text-rose-600' },
];
const ROLE_LABEL = Object.fromEntries(ROLES.map(r => [r.value, r.label]));

export default function PengurusKelas() {
  const { user, toast } = useStore();
  const [roster, setRoster] = useState<ApiRoster | null>(null);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [menuFor, setMenuFor] = useState<number | null>(null);

  const load = () => {
    // Wali kelas cuma punya satu kelas — dicari langsung dari daftar kelas, tanpa perlu ID di URL.
    api.get<{ data: { id: number; name: string; homeroom_teacher_id: number | null }[] }>('/school-classes')
      .then(res => {
        const mine = res.data.find(c => String(c.homeroom_teacher_id) === user?.id);
        if (!mine) { setError('Anda belum ditunjuk sebagai wali kelas.'); return; }
        return api.get<ApiRoster>(`/school-classes/${mine.id}/roster`).then(setRoster);
      })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'));
  };
  useEffect(load, [user?.id]);

  const setRole = async (studentId: number, role: string) => {
    if (!roster) return;
    setMenuFor(null);
    setSavingId(studentId);
    try {
      await api.put(`/school-classes/${roster.school_class.id}/students/${studentId}/role`, { class_role: role || null });
      toast(role ? 'Jabatan ditetapkan' : 'Jabatan dicabut');
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSavingId(null);
    }
  };

  if (error) return <Card className="border-rose-200 bg-rose-50/60"><p className="text-sm font-semibold text-rose-700">{error}</p></Card>;
  if (roster === null) return <div className="py-10 text-center text-sm text-slate-400">Memuat daftar siswa…</div>;

  const holderOf = (role: string) => roster.data.find(s => s.class_role === role);

  return (
    <div onClick={() => menuFor !== null && setMenuFor(null)}>
      <PageHeader title={`Pengurus Kelas ${roster.school_class.name}`} desc="Tunjuk ketua, wakil, sekretaris, bendahara, dan keamanan kelas" />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {ROLES.map(r => {
          const holder = holderOf(r.value);
          return (
            <Card key={r.value} className="text-center">
              <div className={cn('mx-auto flex h-10 w-10 items-center justify-center rounded-xl', r.color)}>
                <r.icon className="h-5 w-5" />
              </div>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{r.label}</p>
              <p className="mt-1 truncate text-sm font-bold text-slate-800">{holder?.name ?? '—'}</p>
            </Card>
          );
        })}
      </div>

      <Card pad={false} className="overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Daftar Siswa ({roster.data.length})</p>
        </div>
        <div className="divide-y divide-slate-50">
          {roster.data.map(s => (
            <div key={s.student_id} className="flex items-center gap-3 px-5 py-3">
              <Avatar name={s.name} color="#6366f1" size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800">{s.name}</p>
                {s.nis && <p className="text-[11px] text-slate-400">NIS {s.nis}</p>}
              </div>
              {s.class_role && <Badge color="indigo">{ROLE_LABEL[s.class_role] ?? s.class_role}</Badge>}

              <div className="relative shrink-0">
                <button
                  onClick={e => { e.stopPropagation(); setMenuFor(m => m === s.student_id ? null : s.student_id); }}
                  disabled={savingId === s.student_id}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50"
                >
                  {savingId === s.student_id ? 'Menyimpan…' : 'Jabatan'} <ChevronDown className="h-3.5 w-3.5" />
                </button>

                {menuFor === s.student_id && (
                  <div onClick={e => e.stopPropagation()} className="absolute right-0 z-10 mt-1.5 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                    {ROLES.map(r => (
                      <button
                        key={r.value}
                        onClick={() => setRole(s.student_id, r.value)}
                        className={cn('flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition hover:bg-slate-50',
                          s.class_role === r.value ? 'text-indigo-600' : 'text-slate-600')}
                      >
                        <r.icon className="h-3.5 w-3.5" /> {r.label}
                      </button>
                    ))}
                    {s.class_role && (
                      <>
                        <div className="my-1 border-t border-slate-100" />
                        <button
                          onClick={() => setRole(s.student_id, '')}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                        >
                          <X className="h-3.5 w-3.5" /> Cabut Jabatan
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {roster.data.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Belum ada siswa di kelas ini.</p>}
        </div>
      </Card>
    </div>
  );
}
