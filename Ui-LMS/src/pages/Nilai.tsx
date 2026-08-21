import { useMemo, useState } from 'react';
import { Award, Save, Trophy, Info } from 'lucide-react';
import { GRADES, STUDENTS, MAPEL, getMapel, getClass, getStudent } from '../lib/data';
import { useStore } from '../lib/store';
import { cn, finalScore, gradeLetter, gradeColor, WEIGHTS } from '../lib/utils';
import { Badge, Button, Card, PageHeader, TableWrap, Td, Th, ProgressBar } from '../components/ui';
import type { GradeRow } from '../lib/types';

export default function Nilai() {
  const { user, toast } = useStore();
  const isStaff = user && ['guru', 'walikelas', 'admin', 'superadmin', 'kepsek'].includes(user.role);
  const [mapelId, setMapelId] = useState('mtk');
  const [rows, setRows] = useState<GradeRow[]>(GRADES);

  const students = STUDENTS.filter(s => s.classId === 'k3');

  const ranking = useMemo(() => {
    return students
      .map(s => {
        const gs = rows.filter(r => r.studentId === s.id);
        return { s, avg: gs.length ? Math.round(gs.reduce((a, g) => a + finalScore(g), 0) / gs.length) : 0 };
      })
      .sort((a, b) => b.avg - a.avg);
  }, [rows, students]);

  const viewStudentId = user?.role === 'siswa' ? user.id : user?.role === 'ortu' ? user.childIds?.[0] : null;

  const updateCell = (studentId: string, field: keyof Pick<GradeRow, 'tugas' | 'quiz' | 'pts' | 'pas'>, value: number) => {
    setRows(rs => rs.map(r => r.studentId === studentId && r.mapelId === mapelId ? { ...r, [field]: Math.max(0, Math.min(100, value)) } : r));
  };

  if (!isStaff && viewStudentId) {
    const st = getStudent(viewStudentId);
    const myRows = rows.filter(r => r.studentId === viewStudentId);
    const myRank = ranking.findIndex(r => r.s.id === viewStudentId) + 1;
    const avg = myRows.length ? Math.round(myRows.reduce((a, g) => a + finalScore(g), 0) / myRows.length) : 0;
    return (
      <div>
        <PageHeader title="Nilai Saya" desc={`${st.name} · Kelas ${getClass(st.classId).name} · Bobot: tugas ${WEIGHTS.tugas * 100}% · quiz ${WEIGHTS.quiz * 100}% · PTS ${WEIGHTS.pts * 100}% · PAS ${WEIGHTS.pas * 100}%`} />
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Award className="h-5 w-5" /></div><div><p className="text-xs text-slate-500">Rata-rata akhir</p><p className="font-display text-xl font-bold">{avg} <Badge color={gradeColor(gradeLetter(avg))}>{gradeLetter(avg)}</Badge></p></div></div></Card>
          <Card><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Trophy className="h-5 w-5" /></div><div><p className="text-xs text-slate-500">Peringkat kelas</p><p className="font-display text-xl font-bold">#{myRank} <span className="text-sm font-normal text-slate-400">dari {students.length}</span></p></div></div></Card>
          <Card><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Save className="h-5 w-5" /></div><div><p className="text-xs text-slate-500">Mapel dinilai</p><p className="font-display text-xl font-bold">{myRows.length} mapel</p></div></div></Card>
        </div>
        <TableWrap>
          <thead className="bg-slate-50">
            <tr><Th>Mata Pelajaran</Th><Th>Tugas</Th><Th>Quiz</Th><Th>PTS</Th><Th>PAS</Th><Th>Nilai Akhir</Th><Th>Grade</Th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {myRows.map(g => {
              const f = finalScore(g); const m = getMapel(g.mapelId);
              return (
                <tr key={g.mapelId} className="hover:bg-slate-50/60">
                  <Td><div className="flex items-center gap-2"><span className="flex h-7 w-10 items-center justify-center rounded-md text-[9px] font-bold text-white" style={{ backgroundColor: m.color }}>{m.code}</span><span className="text-xs font-semibold">{m.name}</span></div></Td>
                  <Td>{g.tugas}</Td><Td>{g.quiz}</Td><Td>{g.pts}</Td><Td>{g.pas}</Td>
                  <Td className="font-bold">{f}</Td>
                  <Td><span className={cn('inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold', gradeColor(gradeLetter(f)))}>{gradeLetter(f)}</span></Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      </div>
    );
  }

  const mapelRows = rows.filter(r => r.mapelId === mapelId && students.some(s => s.id === r.studentId));
  const sorted = [...mapelRows].sort((a, b) => finalScore(b) - finalScore(a));

  return (
    <div>
      <PageHeader
        title="Penilaian"
        desc="Nilai tugas, quiz, ujian, dengan bobot, nilai akhir, grade, dan ranking"
        action={
          <div className="flex items-center gap-2">
            <select value={mapelId} onChange={e => setMapelId(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none">
              {MAPEL.filter(m => ['mtk', 'fis', 'bio', 'inf'].includes(m.id)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <Button onClick={() => toast('Nilai tersimpan & rapor digital diperbarui')}><Save className="h-4 w-4" /> Simpan</Button>
          </div>
        }
      />
      <div className="mb-4 flex items-start gap-2 rounded-xl bg-indigo-50 p-3 text-[11px] text-indigo-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        Nilai akhir = (Tugas × {WEIGHTS.tugas}) + (Quiz × {WEIGHTS.quiz}) + (PTS × {WEIGHTS.pts}) + (PAS × {WEIGHTS.pas}). Grade: A ≥ 90 · B ≥ 80 · C ≥ 70. Klik sel untuk mengedit (guru).
      </div>
      <TableWrap>
        <thead className="bg-slate-50">
          <tr><Th>#</Th><Th>Siswa</Th><Th>Tugas (25%)</Th><Th>Quiz (25%)</Th><Th>PTS (25%)</Th><Th>PAS (25%)</Th><Th>Akhir</Th><Th>Grade</Th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((g, idx) => {
            const s = getStudent(g.studentId);
            const f = finalScore(g);
            return (
              <tr key={g.studentId} className="hover:bg-slate-50/60">
                <Td className="font-bold text-slate-400">{idx + 1}</Td>
                <Td>
                  <p className="text-xs font-bold text-slate-800">{s.name}</p>
                  <p className="text-[10px] text-slate-400">NIS {s.nis}</p>
                </Td>
                {(['tugas', 'quiz', 'pts', 'pas'] as const).map(field => (
                  <Td key={field}>
                    <input
                      type="number" min={0} max={100}
                      value={g[field]}
                      onChange={e => updateCell(g.studentId, field, Number(e.target.value))}
                      className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-center text-xs font-semibold outline-none focus:border-indigo-400"
                    />
                  </Td>
                ))}
                <Td className="font-display font-bold text-slate-900">{f}</Td>
                <Td><span className={cn('inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold', gradeColor(gradeLetter(f)))}>{gradeLetter(f)}</span></Td>
              </tr>
            );
          })}
        </tbody>
      </TableWrap>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Ranking Kelas XI-IPA-1" subtitle="Rata-rata seluruh mapel (opsional, dapat dimatikan admin)">
          <div className="space-y-2">
            {ranking.slice(0, 5).map((r, i) => (
              <div key={r.s.id} className={cn('flex items-center gap-3 rounded-xl border p-3', i === 0 ? 'border-amber-200 bg-amber-50/60' : 'border-slate-100')}>
                <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold', i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-300 text-white' : i === 2 ? 'bg-orange-300 text-white' : 'bg-slate-100 text-slate-500')}>{i + 1}</span>
                <p className="flex-1 text-xs font-bold text-slate-800">{r.s.name}</p>
                <ProgressBar value={r.avg} className="w-24" color={i === 0 ? 'bg-amber-400' : 'bg-indigo-400'} />
                <span className="w-8 text-right text-sm font-bold">{r.avg}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Feedback & Catatan Nilai">
          <p className="text-xs leading-relaxed text-slate-500">
            Setiap nilai dapat disertai <b>feedback</b> yang terkirim ke siswa dan orang tua. Nilai praktik & proyek
            dapat ditambahkan sebagai komponen tambahan melalui pengaturan bobot per mapel.
          </p>
          <div className="mt-3 space-y-2">
            {['Bella Safitri — konsisten di atas KKM, siap pengayaan.', 'Bima Saputra — perlu remedial fungsi komposisi (nilai 55 pada tugas).', 'Kartika Sari — rata-rata di bawah 75, wali kelas telah dinotifikasi.'].map((t, i) => (
              <p key={i} className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{t}</p>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
