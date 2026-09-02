import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Target, Flag, Route, BookOpen, Info, Plus } from 'lucide-react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { cn } from '../lib/utils';
import { Badge, Button, Card, Modal, PageHeader, inputCls } from '../components/ui';

interface ApiSubject { id: number; name: string; code: string; color: string }
interface ApiCourseRef { id: number; teaching_assignment: { subject: { name: string }; school_class: { name: string } } }
interface ApiAtp { id: number; code: string; text: string; order: number; course_id: number | null; course: ApiCourseRef | null }
interface ApiTp { id: number; code: string; text: string; order: number; alur_tujuan_pembelajarans: ApiAtp[] }
interface ApiCp { id: number; subject_id: number; elemen: string; text: string; order: number; subject: ApiSubject; tujuan_pembelajarans: ApiTp[] }

const isStaffRole = (role: string) => ['guru', 'walikelas', 'admin', 'superadmin', 'kepsek'].includes(role);

export default function Kurikulum() {
  const { user, toast } = useStore();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [cps, setCps] = useState<ApiCp[] | null>(null);
  const [subjects, setSubjects] = useState<ApiSubject[]>([]);
  const [courses, setCourses] = useState<ApiCourseRef[]>([]);
  const [error, setError] = useState('');

  const [cpOpen, setCpOpen] = useState(false);
  const [cpSubjectId, setCpSubjectId] = useState('');
  const [cpElemen, setCpElemen] = useState('');
  const [cpText, setCpText] = useState('');
  const [tpOpen, setTpOpen] = useState<number | null>(null);
  const [tpCode, setTpCode] = useState('');
  const [tpText, setTpText] = useState('');
  const [atpOpen, setAtpOpen] = useState<number | null>(null);
  const [atpCode, setAtpCode] = useState('');
  const [atpText, setAtpText] = useState('');
  const [atpCourseId, setAtpCourseId] = useState('');
  const [saving, setSaving] = useState(false);

  const isStaff = !!user && isStaffRole(user.role);

  const load = () => {
    api.get<{ data: ApiCp[] }>('/curriculum').then(r => setCps(r.data)).catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'));
  };
  useEffect(load, []);
  useEffect(() => { api.get<{ data: ApiSubject[] }>('/subjects').then(r => { setSubjects(r.data); setCpSubjectId(s => s || String(r.data[0]?.id ?? '')); }).catch(() => {}); }, []);
  useEffect(() => { api.get<{ data: ApiCourseRef[] }>('/courses').then(r => setCourses(r.data)).catch(() => {}); }, []);

  const toggle = (k: string) => setOpen(o => ({ ...o, [k]: !o[k] }));

  const saveCp = async () => {
    setSaving(true);
    try {
      await api.post('/curriculum', { subject_id: Number(cpSubjectId), elemen: cpElemen, text: cpText });
      toast('Capaian Pembelajaran ditambahkan');
      setCpOpen(false); setCpElemen(''); setCpText('');
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveTp = async (cpId: number) => {
    setSaving(true);
    try {
      await api.post(`/curriculum/${cpId}/tp`, { code: tpCode, text: tpText });
      toast('Tujuan Pembelajaran ditambahkan');
      setTpOpen(null); setTpCode(''); setTpText('');
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveAtp = async (tpId: number) => {
    setSaving(true);
    try {
      await api.post(`/tp/${tpId}/atp`, { code: atpCode, text: atpText, course_id: atpCourseId ? Number(atpCourseId) : null });
      toast('Alur Tujuan Pembelajaran ditambahkan');
      setAtpOpen(null); setAtpCode(''); setAtpText(''); setAtpCourseId('');
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (error) return <Card className="border-rose-200 bg-rose-50/60"><p className="text-sm font-semibold text-rose-700">{error}</p></Card>;
  if (cps === null) return <div className="py-10 text-center text-sm text-slate-400">Memuat kurikulum…</div>;

  return (
    <div>
      <PageHeader
        title="Kurikulum — CP · TP · ATP"
        desc="Struktur Capaian Pembelajaran → Tujuan Pembelajaran → Alur Tujuan Pembelajaran, dengan tautan opsional ke Course"
        action={isStaff ? <Button onClick={() => setCpOpen(true)}><Plus className="h-4 w-4" /> Tambah CP</Button> : undefined}
      />

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
        <p className="text-xs leading-relaxed text-sky-800">
          Struktur mengikuti Kurikulum Merdeka: <b>CP</b> (Capaian Pembelajaran per elemen) diturunkan menjadi <b>TP</b> (Tujuan Pembelajaran),
          lalu diurutkan menjadi <b>ATP</b> (Alur Tujuan Pembelajaran). Setiap ATP dapat ditautkan ke Course
          agar guru mudah memetakan asesmen terhadap kompetensi.
        </p>
      </div>

      <div className="space-y-4">
        {cps.length === 0 && <Card><p className="py-8 text-center text-sm text-slate-400">Belum ada Capaian Pembelajaran.</p></Card>}
        {cps.map(cp => {
          const cpKey = `cp-${cp.id}`;
          const cpIsOpen = open[cpKey];
          return (
            <Card key={cp.id} pad={false} className="overflow-hidden">
              <button onClick={() => toggle(cpKey)} className="flex w-full items-start gap-4 p-5 text-left transition hover:bg-slate-50/60">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: cp.subject.color }}>
                  <Target className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge color="indigo">CP</Badge>
                    <span className="text-sm font-bold text-slate-900">{cp.subject.name} · {cp.elemen}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{cp.text}</p>
                </div>
                {cpIsOpen ? <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-slate-400" /> : <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-400" />}
              </button>

              {cpIsOpen && (
                <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-4">
                  {cp.tujuan_pembelajarans.map(tp => {
                    const key = `tp-${tp.id}`;
                    const tpIsOpen = open[key];
                    return (
                      <div key={tp.id} className="mb-3 last:mb-0">
                        <button onClick={() => toggle(key)} className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left shadow-sm transition hover:shadow">
                          <Flag className="h-4 w-4 shrink-0 text-violet-500" />
                          <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">{tp.code}</span>
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{tp.text}</span>
                          {tpIsOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                        </button>
                        {tpIsOpen && (
                          <div className="ml-6 mt-2 space-y-2 border-l-2 border-violet-200 pl-4">
                            {tp.alur_tujuan_pembelajarans.map(atp => (
                              <div key={atp.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-white p-3">
                                <Route className="h-4 w-4 shrink-0 text-emerald-500" />
                                <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">{atp.code}</span>
                                <span className="text-xs text-slate-700">{atp.text}</span>
                                {atp.course && (
                                  <Link to={`/courses/${atp.course.id}`} className="ml-auto inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100">
                                    <BookOpen className="h-3 w-3" />
                                    {atp.course.teaching_assignment.subject.name} · {atp.course.teaching_assignment.school_class.name}
                                  </Link>
                                )}
                              </div>
                            ))}
                            {isStaff && (
                              <Button size="sm" variant="ghost" onClick={() => { setAtpOpen(tp.id); setAtpCode(''); setAtpText(''); setAtpCourseId(''); }}>
                                <Plus className="h-3.5 w-3.5" /> Tambah ATP
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {isStaff && (
                    <Button size="sm" variant="secondary" onClick={() => { setTpOpen(cp.id); setTpCode(''); setTpText(''); }}>
                      <Plus className="h-3.5 w-3.5" /> Tambah TP
                    </Button>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Modal open={cpOpen} onClose={() => setCpOpen(false)} title="Tambah Capaian Pembelajaran">
        <div className="space-y-3">
          <select className={inputCls} value={cpSubjectId} onChange={e => setCpSubjectId(e.target.value)}>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input className={inputCls} placeholder="Elemen (cth: Aljabar dan Fungsi)" value={cpElemen} onChange={e => setCpElemen(e.target.value)} />
          <textarea rows={3} className={inputCls} placeholder="Teks Capaian Pembelajaran…" value={cpText} onChange={e => setCpText(e.target.value)} />
          <Button className="w-full" disabled={!cpSubjectId || !cpElemen || !cpText || saving} onClick={saveCp}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
        </div>
      </Modal>

      <Modal open={tpOpen !== null} onClose={() => setTpOpen(null)} title="Tambah Tujuan Pembelajaran">
        <div className="space-y-3">
          <input className={inputCls} placeholder="Kode (cth: TP 1.1)" value={tpCode} onChange={e => setTpCode(e.target.value)} />
          <textarea rows={3} className={inputCls} placeholder="Teks Tujuan Pembelajaran…" value={tpText} onChange={e => setTpText(e.target.value)} />
          <Button className="w-full" disabled={!tpCode || !tpText || saving} onClick={() => tpOpen && saveTp(tpOpen)}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
        </div>
      </Modal>

      <Modal open={atpOpen !== null} onClose={() => setAtpOpen(null)} title="Tambah Alur Tujuan Pembelajaran">
        <div className="space-y-3">
          <input className={inputCls} placeholder="Kode (cth: ATP 1.1.1)" value={atpCode} onChange={e => setAtpCode(e.target.value)} />
          <textarea rows={3} className={inputCls} placeholder="Teks Alur Tujuan Pembelajaran…" value={atpText} onChange={e => setAtpText(e.target.value)} />
          <select className={inputCls} value={atpCourseId} onChange={e => setAtpCourseId(e.target.value)}>
            <option value="">Tanpa tautan Course (opsional)</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>
                {c.teaching_assignment.subject.name} · {c.teaching_assignment.school_class.name}
              </option>
            ))}
          </select>
          <Button className="w-full" disabled={!atpCode || !atpText || saving} onClick={() => atpOpen && saveAtp(atpOpen)}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
        </div>
      </Modal>
    </div>
  );
}
