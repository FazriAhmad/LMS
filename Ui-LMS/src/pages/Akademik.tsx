import { useEffect, useState } from 'react';
import { Plus, CalendarRange, School, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { fmtDate } from '../lib/utils';
import { Card, Badge, Button, Tabs, PageHeader, TableWrap, Th, Td, Avatar, Modal, inputCls } from '../components/ui';

const TABS = [
  { id: 'tahun', label: 'Tahun Ajaran' },
  { id: 'kelas', label: 'Kelas & Jurusan' },
  { id: 'mapel', label: 'Mata Pelajaran' },
  { id: 'guru', label: 'Guru' },
  { id: 'siswa', label: 'Siswa' },
];

interface ApiAcademicYear { id: number; name: string; semester: 'ganjil' | 'genap'; start_date: string | null; end_date: string | null; is_active: boolean }
interface ApiMajor { id: number; name: string }
interface ApiSchoolClass { id: number; name: string; capacity: number | null; major: ApiMajor | null; academic_year: ApiAcademicYear; homeroom_teacher: { id: number; name: string } | null; students_count: number }
interface ApiSubject { id: number; name: string; code: string; color: string }
interface ApiTeachingAssignment { id: number; teacher: { id: number; name: string }; subject: { id: number; name: string; code: string; color: string }; school_class: { id: number; name: string } }
interface ApiUser { id: number; name: string; username: string; email: string | null; title: string | null }
interface ApiStudentRow { id: number; nis: string; gender: 'L' | 'P'; user: { id: number; name: string; username: string } }

const isAdminRole = (role: string) => ['admin', 'superadmin'].includes(role);

export default function Akademik() {
  const { user, toast } = useStore();
  const [tab, setTab] = useState('tahun');
  const [error, setError] = useState('');

  const [years, setYears] = useState<ApiAcademicYear[] | null>(null);
  const [majors, setMajors] = useState<ApiMajor[] | null>(null);
  const [classes, setClasses] = useState<ApiSchoolClass[] | null>(null);
  const [subjects, setSubjects] = useState<ApiSubject[] | null>(null);
  const [assignments, setAssignments] = useState<ApiTeachingAssignment[] | null>(null);
  const [teachers, setTeachers] = useState<ApiUser[] | null>(null);
  const [students, setStudents] = useState<(ApiStudentRow & { class_name: string })[] | null>(null);

  const isAdmin = !!user && isAdminRole(user.role);

  const loadAll = () => {
    api.get<{ data: ApiAcademicYear[] }>('/academic-years').then(r => setYears(r.data)).catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'));
    api.get<{ data: ApiMajor[] }>('/majors').then(r => setMajors(r.data)).catch(() => setMajors([]));
    api.get<{ data: ApiSchoolClass[] }>('/school-classes').then(r => setClasses(r.data)).catch(() => setClasses([]));
    api.get<{ data: ApiSubject[] }>('/subjects').then(r => setSubjects(r.data)).catch(() => setSubjects([]));
    api.get<{ data: ApiTeachingAssignment[] }>('/teaching-assignments').then(r => setAssignments(r.data)).catch(() => setAssignments([]));
    api.get<{ data: { data: ApiUser[] } }>('/users?role=guru').then(r => setTeachers(r.data.data)).catch(() => setTeachers([]));
  };
  useEffect(loadAll, []);

  useEffect(() => {
    if (classes === null) return;
    Promise.all(classes.map(c => api.get<{ data: { students: ApiStudentRow[] } }>(`/school-classes/${c.id}`).then(r => r.data.students.map(s => ({ ...s, class_name: c.name })))))
      .then(lists => setStudents(lists.flat()))
      .catch(() => setStudents([]));
  }, [classes]);

  if (error) return <Card className="border-rose-200 bg-rose-50/60"><p className="text-sm font-semibold text-rose-700">{error}</p></Card>;
  if (!isAdmin) return <Card><p className="py-8 text-center text-sm text-slate-400">Halaman ini khusus Admin/Super Admin.</p></Card>;

  return (
    <div>
      <PageHeader title="Manajemen Akademik" desc="Tahun ajaran, kelas, mata pelajaran, guru, siswa, dan wali kelas" />
      <div className="mb-6"><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>

      {tab === 'tahun' && <TahunTab years={years} onChange={loadAll} toast={toast} />}
      {tab === 'kelas' && <KelasTab classes={classes} majors={majors} years={years} teachers={teachers} onChange={loadAll} toast={toast} />}
      {tab === 'mapel' && <MapelTab subjects={subjects} assignments={assignments} onChange={loadAll} toast={toast} />}
      {tab === 'guru' && <GuruTab teachers={teachers} assignments={assignments} classes={classes} onChange={loadAll} toast={toast} />}
      {tab === 'siswa' && <SiswaTab students={students} classes={classes} onChange={loadAll} toast={toast} />}
    </div>
  );
}

type Toast = (text: string, type?: 'success' | 'error' | 'info') => void;

function TahunTab({ years, onChange, toast }: { years: ApiAcademicYear[] | null; onChange: () => void; toast: Toast }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [semester, setSemester] = useState<'ganjil' | 'genap'>('ganjil');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [saving, setSaving] = useState(false);

  if (years === null) return <p className="py-8 text-center text-sm text-slate-400">Memuat tahun ajaran…</p>;
  const active = years.find(y => y.is_active);
  const others = years.filter(y => !y.is_active);

  const activate = async (id: number) => {
    try {
      await api.post(`/academic-years/${id}/activate`);
      toast('Tahun ajaran diaktifkan');
      onChange();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal mengaktifkan', 'error');
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/academic-years', { name, semester, start_date: start || null, end_date: end || null });
      toast('Tahun ajaran ditambahkan');
      setOpen(false); setName(''); setStart(''); setEnd('');
      onChange();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-end"><Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Tambah Tahun Ajaran</Button></div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Tahun Ajaran Aktif" className="lg:col-span-2">
          {active ? (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white"><CalendarRange className="h-6 w-6" /></div>
                <div>
                  <p className="font-display text-lg font-bold text-slate-900">{active.name}</p>
                  <p className="text-xs text-slate-500">Semester {active.semester === 'ganjil' ? 'Ganjil' : 'Genap'}{active.start_date && ` · dimulai ${fmtDate(active.start_date)}`}</p>
                </div>
              </div>
              <Badge color="emerald">Aktif</Badge>
            </div>
          ) : <p className="py-4 text-center text-xs text-slate-400">Belum ada tahun ajaran aktif.</p>}
          <div className="mt-4 space-y-2">
            {others.map(y => (
              <div key={y.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
                <div>
                  <p className="text-sm font-bold text-slate-800">{y.name}</p>
                  <p className="text-xs text-slate-500">Semester {y.semester === 'ganjil' ? 'Ganjil' : 'Genap'}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => activate(y.id)}><CheckCircle2 className="h-3.5 w-3.5" /> Aktifkan</Button>
              </div>
            ))}
            {others.length === 0 && years.length <= 1 && <p className="py-2 text-center text-xs text-slate-400">Belum ada tahun ajaran lain.</p>}
          </div>
        </Card>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Tambah Tahun Ajaran">
        <div className="space-y-3">
          <input className={inputCls} placeholder="cth: 2025/2026" value={name} onChange={e => setName(e.target.value)} />
          <select className={inputCls} value={semester} onChange={e => setSemester(e.target.value as 'ganjil' | 'genap')}>
            <option value="ganjil">Ganjil</option>
            <option value="genap">Genap</option>
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input type="date" className={inputCls} value={start} onChange={e => setStart(e.target.value)} />
            <input type="date" className={inputCls} value={end} onChange={e => setEnd(e.target.value)} />
          </div>
          <Button className="w-full" disabled={!name || saving} onClick={save}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
        </div>
      </Modal>
    </div>
  );
}

function KelasTab({ classes, majors, years, teachers, onChange, toast }: {
  classes: ApiSchoolClass[] | null; majors: ApiMajor[] | null; years: ApiAcademicYear[] | null; teachers: ApiUser[] | null; onChange: () => void; toast: Toast;
}) {
  const [open, setOpen] = useState(false);
  const [majorOpen, setMajorOpen] = useState(false);
  const [name, setName] = useState('');
  const [majorId, setMajorId] = useState('');
  const [yearId, setYearId] = useState('');
  const [homeroomId, setHomeroomId] = useState('');
  const [capacity, setCapacity] = useState('36');
  const [majorName, setMajorName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (years && years.length > 0 && !yearId) setYearId(String(years.find(y => y.is_active)?.id ?? years[0].id));
  }, [years, yearId]);

  if (classes === null || majors === null || years === null || teachers === null) return <p className="py-8 text-center text-sm text-slate-400">Memuat kelas…</p>;

  const saveClass = async () => {
    setSaving(true);
    try {
      await api.post('/school-classes', {
        name, major_id: majorId || null, academic_year_id: Number(yearId),
        homeroom_teacher_id: homeroomId || null, capacity: capacity ? Number(capacity) : null,
      });
      toast('Kelas ditambahkan');
      setOpen(false); setName(''); setHomeroomId('');
      onChange();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveMajor = async () => {
    setSaving(true);
    try {
      await api.post('/majors', { name: majorName });
      toast('Jurusan ditambahkan');
      setMajorOpen(false); setMajorName('');
      onChange();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => setMajorOpen(true)}><Plus className="h-4 w-4" /> Tambah Jurusan</Button>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Tambah Kelas</Button>
      </div>
      {majors.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">{majors.map(m => <Badge key={m.id} color="indigo">{m.name}</Badge>)}</div>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {classes.map(c => (
          <Card key={c.id} className="transition hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white"><School className="h-5 w-5" /></div>
              {c.major && <Badge color="indigo">{c.major.name}</Badge>}
            </div>
            <p className="mt-3 font-display text-lg font-bold text-slate-900">Kelas {c.name}</p>
            <div className="mt-2 space-y-1.5 text-xs text-slate-500">
              <p className="flex justify-between"><span>Jumlah siswa</span><b className="text-slate-700">{c.students_count}{c.capacity ? `/${c.capacity}` : ''}</b></p>
              <p className="flex justify-between"><span>Wali kelas</span><b className="text-slate-700">{c.homeroom_teacher?.name ?? '—'}</b></p>
              <p className="flex justify-between"><span>Tahun ajaran</span><b className="text-slate-700">{c.academic_year.name}</b></p>
            </div>
          </Card>
        ))}
        {classes.length === 0 && <Card className="md:col-span-2 xl:col-span-3"><p className="py-8 text-center text-sm text-slate-400">Belum ada kelas.</p></Card>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Tambah Kelas">
        <div className="space-y-3">
          <input className={inputCls} placeholder="cth: XI-IPA-2" value={name} onChange={e => setName(e.target.value)} />
          <select className={inputCls} value={majorId} onChange={e => setMajorId(e.target.value)}>
            <option value="">Tanpa Jurusan</option>
            {majors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select className={inputCls} value={yearId} onChange={e => setYearId(e.target.value)}>
            {years.map(y => <option key={y.id} value={y.id}>{y.name} {y.is_active ? '(aktif)' : ''}</option>)}
          </select>
          <select className={inputCls} value={homeroomId} onChange={e => setHomeroomId(e.target.value)}>
            <option value="">Belum ada wali kelas</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input type="number" className={inputCls} placeholder="Kapasitas" value={capacity} onChange={e => setCapacity(e.target.value)} />
          <Button className="w-full" disabled={!name || !yearId || saving} onClick={saveClass}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
        </div>
      </Modal>

      <Modal open={majorOpen} onClose={() => setMajorOpen(false)} title="Tambah Jurusan">
        <div className="space-y-3">
          <input className={inputCls} placeholder="cth: IPS" value={majorName} onChange={e => setMajorName(e.target.value)} />
          <Button className="w-full" disabled={!majorName || saving} onClick={saveMajor}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
        </div>
      </Modal>
    </div>
  );
}

function MapelTab({ subjects, assignments, onChange, toast }: { subjects: ApiSubject[] | null; assignments: ApiTeachingAssignment[] | null; onChange: () => void; toast: Toast }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [saving, setSaving] = useState(false);

  if (subjects === null || assignments === null) return <p className="py-8 text-center text-sm text-slate-400">Memuat mata pelajaran…</p>;

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/subjects', { name, code, color });
      toast('Mata pelajaran ditambahkan');
      setOpen(false); setName(''); setCode('');
      onChange();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-end"><Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Tambah Mata Pelajaran</Button></div>
      <TableWrap>
        <thead className="bg-slate-50">
          <tr><Th>Kode</Th><Th>Mata Pelajaran</Th><Th>Guru Pengampu & Kelas</Th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {subjects.map(m => {
            const rows = assignments.filter(a => a.subject.id === m.id);
            return (
              <tr key={m.id} className="transition hover:bg-slate-50/60">
                <Td><span className="inline-flex h-8 w-12 items-center justify-center rounded-lg text-[10px] font-bold text-white" style={{ backgroundColor: m.color }}>{m.code}</span></Td>
                <Td className="font-semibold">{m.name}</Td>
                <Td>
                  {rows.length === 0 ? <span className="text-xs text-slate-400">Belum ada guru pengampu</span> : (
                    <div className="flex flex-wrap gap-1">
                      {rows.map(r => <Badge key={r.id} color="slate">{r.teacher.name} · {r.school_class.name}</Badge>)}
                    </div>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </TableWrap>
      {subjects.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Belum ada mata pelajaran.</p>}

      <Modal open={open} onClose={() => setOpen(false)} title="Tambah Mata Pelajaran">
        <div className="space-y-3">
          <input className={inputCls} placeholder="Nama mapel (cth: Bahasa Inggris)" value={name} onChange={e => setName(e.target.value)} />
          <input className={inputCls} placeholder="Kode (cth: BIG)" value={code} onChange={e => setCode(e.target.value.toUpperCase())} />
          <div className="flex items-center gap-3">
            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-10 w-14 rounded-lg border border-slate-300" />
            <span className="text-xs text-slate-500">Warna label</span>
          </div>
          <Button className="w-full" disabled={!name || !code || saving} onClick={save}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
        </div>
      </Modal>
    </div>
  );
}

function GuruTab({ teachers, assignments, classes, onChange, toast }: {
  teachers: ApiUser[] | null; assignments: ApiTeachingAssignment[] | null; classes: ApiSchoolClass[] | null; onChange: () => void; toast: Toast;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  if (teachers === null || assignments === null || classes === null) return <p className="py-8 text-center text-sm text-slate-400">Memuat guru…</p>;

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/users', { name, username, email: email || null, password: password || undefined, title: title || null, role: 'guru' });
      toast('Akun guru dibuat');
      setOpen(false); setName(''); setUsername(''); setEmail(''); setPassword(''); setTitle('');
      onChange();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-end"><Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Tambah Akun Guru</Button></div>
      <TableWrap>
        <thead className="bg-slate-50">
          <tr><Th>Guru</Th><Th>Username</Th><Th>Mapel Diampu</Th><Th>Wali Kelas</Th><Th>Aksi</Th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {teachers.map(t => {
            const rows = assignments.filter(a => a.teacher.id === t.id);
            const homeroom = classes.find(c => c.homeroom_teacher?.id === t.id);
            return (
              <tr key={t.id} className="transition hover:bg-slate-50/60">
                <Td><div className="flex items-center gap-3"><Avatar name={t.name} color="#6366f1" size="sm" /><span className="font-semibold">{t.name}</span></div></Td>
                <Td className="font-mono text-xs">{t.username}</Td>
                <Td>
                  {rows.length === 0 ? <span className="text-xs text-slate-400">—</span> : (
                    <div className="flex flex-wrap gap-1">{[...new Set(rows.map(r => r.subject.name))].map(n => <Badge key={n} color="indigo">{n}</Badge>)}</div>
                  )}
                </Td>
                <Td>{homeroom ? <Badge color="emerald">{homeroom.name}</Badge> : <span className="text-xs text-slate-400">—</span>}</Td>
                <Td>
                  <Button size="sm" variant="ghost" onClick={() => toast('Reset password guru belum tersedia lewat halaman ini — belum ada endpoint di backend untuk itu.', 'info')}>
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </TableWrap>
      {teachers.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Belum ada guru.</p>}

      <Modal open={open} onClose={() => setOpen(false)} title="Tambah Akun Guru">
        <div className="space-y-3">
          <input className={inputCls} placeholder="Nama lengkap" value={name} onChange={e => setName(e.target.value)} />
          <input className={inputCls} placeholder="Username (untuk login)" value={username} onChange={e => setUsername(e.target.value)} />
          <input className={inputCls} placeholder="Email (opsional)" value={email} onChange={e => setEmail(e.target.value)} />
          <input className={inputCls} placeholder="Password (kosongkan = acak)" value={password} onChange={e => setPassword(e.target.value)} />
          <input className={inputCls} placeholder="Jabatan (cth: Guru Matematika)" value={title} onChange={e => setTitle(e.target.value)} />
          <Button className="w-full" disabled={!name || !username || saving} onClick={save}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
        </div>
      </Modal>
    </div>
  );
}

function SiswaTab({ students, classes, onChange, toast }: {
  students: (ApiStudentRow & { class_name: string })[] | null; classes: ApiSchoolClass[] | null; onChange: () => void; toast: Toast;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nis, setNis] = useState('');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [classId, setClassId] = useState('');
  const [saving, setSaving] = useState(false);

  if (students === null || classes === null) return <p className="py-8 text-center text-sm text-slate-400">Memuat siswa…</p>;

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/users', { name, username, password: password || undefined, role: 'siswa', nis, gender, school_class_id: classId || null });
      toast('Akun siswa dibuat');
      setOpen(false); setName(''); setUsername(''); setPassword(''); setNis('');
      onChange();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-end"><Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Tambah Akun Siswa</Button></div>
      <TableWrap>
        <thead className="bg-slate-50">
          <tr><Th>NIS</Th><Th>Nama Siswa</Th><Th>Kelas</Th><Th>L/P</Th><Th>Aksi</Th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {students.map(s => (
            <tr key={s.id} className="transition hover:bg-slate-50/60">
              <Td className="font-mono text-xs">{s.nis}</Td>
              <Td><div className="flex items-center gap-3"><Avatar name={s.user.name} color={s.gender === 'L' ? '#6366f1' : '#ec4899'} size="sm" /><span className="font-semibold">{s.user.name}</span></div></Td>
              <Td><Badge color="slate">{s.class_name}</Badge></Td>
              <Td>{s.gender}</Td>
              <Td>
                <Button size="sm" variant="ghost" onClick={() => toast('Reset password siswa belum tersedia lewat halaman ini — belum ada endpoint di backend untuk itu.', 'info')}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      {students.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Belum ada siswa.</p>}

      <Modal open={open} onClose={() => setOpen(false)} title="Tambah Akun Siswa">
        <div className="space-y-3">
          <input className={inputCls} placeholder="Nama lengkap" value={name} onChange={e => setName(e.target.value)} />
          <input className={inputCls} placeholder="Username (untuk login)" value={username} onChange={e => setUsername(e.target.value)} />
          <input className={inputCls} placeholder="Password (kosongkan = acak)" value={password} onChange={e => setPassword(e.target.value)} />
          <input className={inputCls} placeholder="NIS" value={nis} onChange={e => setNis(e.target.value)} />
          <select className={inputCls} value={gender} onChange={e => setGender(e.target.value as 'L' | 'P')}>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
          <select className={inputCls} value={classId} onChange={e => setClassId(e.target.value)}>
            <option value="">Belum ada kelas</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Button className="w-full" disabled={!name || !username || !nis || saving} onClick={save}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
        </div>
      </Modal>
    </div>
  );
}
