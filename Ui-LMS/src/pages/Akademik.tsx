import { useState } from 'react';
import { Plus, CalendarRange, School, BookOpen, GraduationCap, Users, Pencil, RotateCcw } from 'lucide-react';
import { SCHOOL, CLASSES, MAPEL, TEACHERS, STUDENTS, getTeacherName, getClass } from '../lib/data';
import { useStore } from '../lib/store';
import { Card, Badge, Button, Tabs, PageHeader, TableWrap, Th, Td, Avatar } from '../components/ui';

const TABS = [
  { id: 'tahun', label: 'Tahun Ajaran' },
  { id: 'kelas', label: 'Kelas & Jurusan' },
  { id: 'mapel', label: 'Mata Pelajaran' },
  { id: 'guru', label: 'Guru' },
  { id: 'siswa', label: 'Siswa' },
];

export default function Akademik() {
  const [tab, setTab] = useState('tahun');
  const { toast } = useStore();
  const demo = () => toast('Fitur demo: perubahan disimpan secara simulasi.', 'info');

  return (
    <div>
      <PageHeader
        title="Manajemen Akademik"
        desc="Tahun ajaran, kelas, mata pelajaran, guru, siswa, dan wali kelas"
        action={<Button onClick={demo}><Plus className="h-4 w-4" /> Tambah Data</Button>}
      />
      <div className="mb-6"><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>

      {tab === 'tahun' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title="Tahun Ajaran Aktif" className="lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <CalendarRange className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-slate-900">{SCHOOL.year}</p>
                  <p className="text-xs text-slate-500">Semester {SCHOOL.semester} · dimulai 6 Januari 2025</p>
                </div>
              </div>
              <Badge color="emerald">Aktif</Badge>
            </div>
            <div className="mt-4 space-y-2">
              {[
                { y: '2023/2024', s: 'Ganjil & Genap', status: 'Selesai' },
                { y: '2022/2023', s: 'Ganjil & Genap', status: 'Selesai' },
              ].map(t => (
                <div key={t.y} className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{t.y}</p>
                    <p className="text-xs text-slate-500">{t.s}</p>
                  </div>
                  <Badge color="slate">{t.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Pengaturan Semester">
            <div className="space-y-3 text-sm">
              {[
                ['Semester aktif', 'Genap'],
                ['Awal semester', '6 Jan 2025'],
                ['PTS Genap', '10–14 Mar 2025'],
                ['PAS Genap', '2–10 Jun 2025'],
                ['Akhir tahun ajaran', '20 Jun 2025'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0">
                  <span className="text-xs text-slate-500">{k}</span>
                  <span className="text-xs font-bold text-slate-800">{v}</span>
                </div>
              ))}
              <Button variant="secondary" className="w-full" onClick={demo}><Pencil className="h-3.5 w-3.5" /> Ubah Pengaturan</Button>
            </div>
          </Card>
        </div>
      )}

      {tab === 'kelas' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {CLASSES.map(c => (
            <Card key={c.id} className="transition hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                  <School className="h-5 w-5" />
                </div>
                <Badge color="indigo">{c.jurusan}</Badge>
              </div>
              <p className="mt-3 font-display text-lg font-bold text-slate-900">Kelas {c.name}</p>
              <div className="mt-2 space-y-1.5 text-xs text-slate-500">
                <p className="flex justify-between"><span>Jumlah siswa</span><b className="text-slate-700">{c.studentCount}</b></p>
                <p className="flex justify-between"><span>Wali kelas</span><b className="text-slate-700">{getTeacherName(c.homeroomId)}</b></p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'mapel' && (
        <TableWrap>
          <thead className="bg-slate-50">
            <tr><Th>Kode</Th><Th>Mata Pelajaran</Th><Th>Guru Pengampu</Th><Th>Kelas</Th><Th>Aksi</Th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MAPEL.map(m => (
              <tr key={m.id} className="transition hover:bg-slate-50/60">
                <Td><span className="inline-flex h-8 w-12 items-center justify-center rounded-lg text-[10px] font-bold text-white" style={{ backgroundColor: m.color }}>{m.code}</span></Td>
                <Td className="font-semibold">{m.name}</Td>
                <Td>{getTeacherName(m.teacherId)}</Td>
                <Td><div className="flex flex-wrap gap-1">{['k3', 'k5'].map(k => <Badge key={k} color="slate">{getClass(k).name}</Badge>)}</div></Td>
                <Td><Button size="sm" variant="ghost" onClick={demo}><Pencil className="h-3.5 w-3.5" /> Edit</Button></Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {tab === 'guru' && (
        <TableWrap>
          <thead className="bg-slate-50">
            <tr><Th>Guru</Th><Th>NIP</Th><Th>Mapel</Th><Th>Wali Kelas</Th><Th>Aksi</Th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {TEACHERS.map(t => {
              const m = MAPEL.find(x => x.id === t.subject)!;
              return (
                <tr key={t.id} className="transition hover:bg-slate-50/60">
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={t.name} color={m.color} size="sm" />
                      <span className="font-semibold">{t.name}</span>
                    </div>
                  </Td>
                  <Td className="font-mono text-xs">{t.nip}</Td>
                  <Td><Badge color="indigo">{m.name}</Badge></Td>
                  <Td>{t.homeroom ? <Badge color="emerald">{getClass(t.homeroom).name}</Badge> : <span className="text-xs text-slate-400">—</span>}</Td>
                  <Td>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={demo}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => toast(`Password ${t.name} direset → dikirim ke email`, 'success')}><RotateCcw className="h-3.5 w-3.5" /></Button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}

      {tab === 'siswa' && (
        <TableWrap>
          <thead className="bg-slate-50">
            <tr><Th>NIS</Th><Th>Nama Siswa</Th><Th>Kelas</Th><Th>L/P</Th><Th>Aksi</Th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {STUDENTS.map(s => (
              <tr key={s.id} className="transition hover:bg-slate-50/60">
                <Td className="font-mono text-xs">{s.nis}</Td>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar name={s.name} color={s.gender === 'L' ? '#6366f1' : '#ec4899'} size="sm" />
                    <span className="font-semibold">{s.name}</span>
                  </div>
                </Td>
                <Td><Badge color="slate">{getClass(s.classId).name}</Badge></Td>
                <Td>{s.gender}</Td>
                <Td>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={demo}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => toast(`Password ${s.name} direset`, 'success')}><RotateCcw className="h-3.5 w-3.5" /></Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
