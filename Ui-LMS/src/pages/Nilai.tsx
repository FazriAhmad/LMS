import { useEffect, useState } from 'react';
import { Award, Save, Trophy, Info } from 'lucide-react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { cn, gradeColor } from '../lib/utils';
import { Badge, Button, Card, PageHeader, TableWrap, Td, Th, ProgressBar } from '../components/ui';

interface ApiCourse {
  id: number;
  teaching_assignment: { subject: { id: number; name: string; code: string; color: string }; school_class: { name: string } };
}

interface GradeRow {
  student_id: number;
  student_name: string | null;
  tugas: number;
  quiz: number;
  pts: number;
  pas: number;
  final: number;
  letter: string;
  feedback: string | null;
}

interface MyGradeRow extends GradeRow {
  subject_name: string;
}

interface Weights { tugas: number; quiz: number; pts: number; pas: number }

const isStaffRole = (role: string) => ['guru', 'walikelas', 'admin', 'superadmin', 'kepsek'].includes(role);
const FIELDS = ['tugas', 'quiz', 'pts', 'pas'] as const;

export default function Nilai() {
  const { user } = useStore();
  if (!user) return null;
  return isStaffRole(user.role) ? <StaffNilai /> : <SelfNilai />;
}

function StaffNilai() {
  const { toast } = useStore();
  const [courses, setCourses] = useState<ApiCourse[]>([]);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [rows, setRows] = useState<GradeRow[]>([]);
  const [weights, setWeights] = useState<Weights | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ data: ApiCourse[] }>('/courses')
      .then(res => { setCourses(res.data); setCourseId(res.data[0]?.id ?? null); })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    const course = courses.find(c => c.id === courseId)!;
    Promise.all([
      api.get<{ data: GradeRow[] }>(`/courses/${courseId}/grades`),
      api.get<{ data: Weights }>(`/subjects/${course.teaching_assignment.subject.id}/grade-weight`),
    ])
      .then(([g, w]) => { setRows(g.data); setWeights(w.data); })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'))
      .finally(() => setLoading(false));
  }, [courseId, courses]);

  const updateCell = (studentId: number, field: typeof FIELDS[number], value: number) => {
    setRows(rs => rs.map(r => r.student_id !== studentId ? r : { ...r, [field]: Math.max(0, Math.min(100, value)) }));
  };

  const save = async () => {
    if (!courseId) return;
    setSaving(true);
    try {
      const res = await api.post<{ data: GradeRow[] }>(`/courses/${courseId}/grades`, {
        records: rows.map(r => ({ student_id: r.student_id, tugas: r.tugas, quiz: r.quiz, pts: r.pts, pas: r.pas, feedback: r.feedback })),
      });
      setRows(res.data);
      toast('Nilai tersimpan');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menyimpan nilai', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (error) return <Card className="border-rose-200 bg-rose-50/60"><p className="text-sm font-semibold text-rose-700">{error}</p></Card>;
  const course = courses.find(c => c.id === courseId);

  return (
    <div>
      <PageHeader
        title="Penilaian"
        desc="Nilai tugas, quiz, ujian, dengan bobot, nilai akhir, grade, dan ranking"
        action={
          <div className="flex items-center gap-2">
            <select value={courseId ?? ''} onChange={e => setCourseId(Number(e.target.value))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none">
              {courses.map(c => <option key={c.id} value={c.id}>{c.teaching_assignment.subject.name} — {c.teaching_assignment.school_class.name}</option>)}
            </select>
            <Button onClick={save} disabled={saving || loading}><Save className="h-4 w-4" /> {saving ? 'Menyimpan…' : 'Simpan'}</Button>
          </div>
        }
      />
      {weights && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-indigo-50 p-3 text-[11px] text-indigo-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          Nilai akhir = (Tugas × {weights.tugas}%) + (Quiz × {weights.quiz}%) + (PTS × {weights.pts}%) + (PAS × {weights.pas}%). Grade: A ≥ 90 · B ≥ 80 · C ≥ 70.
        </div>
      )}
      {loading ? (
        <div className="py-10 text-center text-sm text-slate-400">Memuat nilai…</div>
      ) : (
        <>
          <TableWrap>
            <thead className="bg-slate-50">
              <tr><Th>#</Th><Th>Siswa</Th><Th>Tugas</Th><Th>Quiz</Th><Th>PTS</Th><Th>PAS</Th><Th>Akhir</Th><Th>Grade</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((g, idx) => (
                <tr key={g.student_id} className="hover:bg-slate-50/60">
                  <Td className="font-bold text-slate-400">{idx + 1}</Td>
                  <Td><p className="text-xs font-bold text-slate-800">{g.student_name}</p></Td>
                  {FIELDS.map(field => (
                    <Td key={field}>
                      <input
                        type="number" min={0} max={100}
                        value={g[field]}
                        onChange={e => updateCell(g.student_id, field, Number(e.target.value))}
                        className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-center text-xs font-semibold outline-none focus:border-indigo-400"
                      />
                    </Td>
                  ))}
                  <Td className="font-display font-bold text-slate-900">{g.final}</Td>
                  <Td><span className={cn('inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold', gradeColor(g.letter))}>{g.letter}</span></Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>

          {rows.length > 0 && (
            <div className="mt-6">
              <Card title={`Ranking — ${course?.teaching_assignment.subject.name}`} subtitle="Rata-rata mapel ini">
                <div className="space-y-2">
                  {rows.slice(0, 5).map((r, i) => (
                    <div key={r.student_id} className={cn('flex items-center gap-3 rounded-xl border p-3', i === 0 ? 'border-amber-200 bg-amber-50/60' : 'border-slate-100')}>
                      <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold', i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-300 text-white' : i === 2 ? 'bg-orange-300 text-white' : 'bg-slate-100 text-slate-500')}>{i + 1}</span>
                      <p className="flex-1 text-xs font-bold text-slate-800">{r.student_name}</p>
                      <ProgressBar value={r.final} className="w-24" color={i === 0 ? 'bg-amber-400' : 'bg-indigo-400'} />
                      <span className="w-8 text-right text-sm font-bold">{r.final}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SelfNilai() {
  const { user } = useStore();
  const [rows, setRows] = useState<MyGradeRow[]>([]);
  const [average, setAverage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        let query = '';
        if (user!.role === 'ortu') {
          const children = await api.get<{ data: { student_id: number }[] }>('/parent/children');
          const child = children.data[0];
          if (!child) { setError('Belum ada anak terhubung ke akun ini.'); setLoading(false); return; }
          query = `?student_id=${child.student_id}`;
        }
        const res = await api.get<{ data: { grades: MyGradeRow[]; average: number } }>(`/grades/me${query}`);
        setRows(res.data.grades);
        setAverage(res.data.average);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) return <div className="py-10 text-center text-sm text-slate-400">Memuat nilai…</div>;
  if (error) return <Card className="border-rose-200 bg-rose-50/60"><p className="text-sm font-semibold text-rose-700">{error}</p></Card>;

  return (
    <div>
      <PageHeader title="Nilai Saya" desc="Nilai akhir dihitung dari tugas, quiz, PTS, dan PAS sesuai bobot mapel." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Award className="h-5 w-5" /></div><div><p className="text-xs text-slate-500">Rata-rata akhir</p><p className="font-display text-xl font-bold">{average} <Badge color={gradeColor(average >= 90 ? 'A' : average >= 80 ? 'B' : average >= 70 ? 'C' : 'D')}>{average >= 90 ? 'A' : average >= 80 ? 'B' : average >= 70 ? 'C' : 'D'}</Badge></p></div></div></Card>
        <Card><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Trophy className="h-5 w-5" /></div><div><p className="text-xs text-slate-500">Mapel dinilai</p><p className="font-display text-xl font-bold">{rows.length} mapel</p></div></div></Card>
      </div>
      <TableWrap>
        <thead className="bg-slate-50">
          <tr><Th>Mata Pelajaran</Th><Th>Tugas</Th><Th>Quiz</Th><Th>PTS</Th><Th>PAS</Th><Th>Nilai Akhir</Th><Th>Grade</Th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(g => (
            <tr key={g.student_id + g.subject_name} className="hover:bg-slate-50/60">
              <Td><span className="text-xs font-semibold">{g.subject_name}</span></Td>
              <Td>{g.tugas}</Td><Td>{g.quiz}</Td><Td>{g.pts}</Td><Td>{g.pas}</Td>
              <Td className="font-bold">{g.final}</Td>
              <Td><span className={cn('inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold', gradeColor(g.letter))}>{g.letter}</span></Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      {rows.length === 0 && <Card><p className="py-8 text-center text-sm text-slate-400">Belum ada nilai.</p></Card>}
    </div>
  );
}
