import { useEffect, useState } from 'react';
import { FileText, Download, CalendarCheck, TrendingUp, Users, Eye } from 'lucide-react';
import { useStore } from '../lib/store';
import { api, ApiError, API_BASE, getToken } from '../lib/api';
import { cn } from '../lib/utils';
import { Badge, Button, Card, PageHeader, TableWrap, Td, Th, inputCls } from '../components/ui';
import type { LucideIcon } from 'lucide-react';

type ReportId = 'nilai' | 'presensi' | 'kelas';
type Row = Record<string, string | number>;

interface ReportDef { id: ReportId; title: string; desc: string; icon: LucideIcon; color: string; path: string; filename: string }

const REPORTS: ReportDef[] = [
  { id: 'nilai', title: 'Laporan Nilai Siswa', desc: 'Rekap nilai tugas, quiz, PTS, PAS per kelas/mapel', icon: FileText, color: 'bg-indigo-50 text-indigo-600', path: '/reports/grades', filename: 'laporan-nilai' },
  { id: 'presensi', title: 'Laporan Presensi', desc: 'Rekap kehadiran H/I/S/A/T per siswa, filter kelas & rentang tanggal', icon: CalendarCheck, color: 'bg-emerald-50 text-emerald-600', path: '/reports/attendance', filename: 'laporan-presensi' },
  { id: 'kelas', title: 'Performa Kelas', desc: 'Rata-rata nilai & kehadiran per rombongan belajar', icon: Users, color: 'bg-rose-50 text-rose-600', path: '/reports/class-performance', filename: 'laporan-performa-kelas' },
];

const COL_LABEL: Record<string, string> = {
  siswa: 'Siswa', kelas: 'Kelas', mapel: 'Mapel', tugas: 'Tugas', quiz: 'Quiz', pts: 'PTS', pas: 'PAS',
  nilai_akhir: 'Nilai Akhir', grade: 'Grade', hadir: 'Hadir', izin: 'Izin', sakit: 'Sakit', alpa: 'Alpa',
  terlambat: 'Terlambat', persen_kehadiran: '% Kehadiran', jumlah_siswa: 'Jumlah Siswa',
  rata_rata_nilai: 'Rata-rata Nilai', rata_rata_kehadiran: 'Rata-rata Kehadiran',
};

interface ApiSchoolClass { id: number; name: string }
interface ApiSubject { id: number; name: string }

export default function Laporan() {
  const { toast } = useStore();
  const [classes, setClasses] = useState<ApiSchoolClass[]>([]);
  const [subjects, setSubjects] = useState<ApiSubject[]>([]);
  const [active, setActive] = useState<ReportId | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    api.get<{ data: ApiSchoolClass[] }>('/school-classes').then(r => setClasses(r.data)).catch(() => {});
    api.get<{ data: ApiSubject[] }>('/subjects').then(r => setSubjects(r.data)).catch(() => {});
  }, []);

  const buildQuery = (report: ReportDef) => {
    const params = new URLSearchParams();
    if (report.id !== 'kelas' && classId) params.set('school_class_id', classId);
    if (report.id === 'nilai' && subjectId) params.set('subject_id', subjectId);
    if (report.id === 'presensi' && from) params.set('from', from);
    if (report.id === 'presensi' && to) params.set('to', to);
    return params;
  };

  const view = (report: ReportDef) => {
    setActive(report.id);
    setRows(null);
    setLoading(true);
    const qs = buildQuery(report).toString();
    api.get<{ data: Row[] }>(`${report.path}${qs ? `?${qs}` : ''}`)
      .then(res => setRows(res.data))
      .catch(e => { toast(e instanceof ApiError ? e.message : 'Gagal memuat laporan', 'error'); setRows([]); })
      .finally(() => setLoading(false));
  };

  const downloadCsv = async (report: ReportDef) => {
    setDownloading(true);
    try {
      const params = buildQuery(report);
      params.set('format', 'csv');
      const res = await fetch(`${API_BASE}${report.path}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Gagal mengunduh laporan');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast('File CSV berhasil diunduh');
    } catch {
      toast('Gagal mengunduh laporan', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const activeReport = REPORTS.find(r => r.id === active);
  const columns = rows && rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div>
      <PageHeader
        title="Pusat Laporan"
        desc="Nilai, presensi, dan performa kelas — diproses langsung (sync), export CSV siap pakai di Excel"
      />
      <div className="grid gap-4 md:grid-cols-3">
        {REPORTS.map(r => (
          <Card key={r.id} className={cn('flex flex-col', active === r.id && 'border-indigo-300 ring-2 ring-indigo-100')}>
            <div className={cn('mb-3 flex h-11 w-11 items-center justify-center rounded-xl', r.color)}>
              <r.icon className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">{r.title}</h3>
            <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-500">{r.desc}</p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => view(r)}>
                <Eye className="h-3.5 w-3.5" /> Lihat
              </Button>
              <Button size="sm" className="flex-1" disabled={downloading} onClick={() => downloadCsv(r)}>
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {activeReport && (
        <Card className="mt-6" title={activeReport.title}>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {activeReport.id !== 'kelas' && (
              <select value={classId} onChange={e => setClassId(e.target.value)} className={cn(inputCls, 'w-auto')}>
                <option value="">Semua Kelas</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            {activeReport.id === 'nilai' && (
              <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className={cn(inputCls, 'w-auto')}>
                <option value="">Semua Mapel</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            {activeReport.id === 'presensi' && (
              <>
                <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={cn(inputCls, 'w-auto')} />
                <span className="text-xs text-slate-400">s/d</span>
                <input type="date" value={to} onChange={e => setTo(e.target.value)} className={cn(inputCls, 'w-auto')} />
              </>
            )}
            <Button size="sm" variant="secondary" onClick={() => view(activeReport)} disabled={loading}>Terapkan Filter</Button>
          </div>

          {loading && <p className="py-8 text-center text-sm text-slate-400">Memuat laporan…</p>}
          {!loading && rows && rows.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Tidak ada data untuk filter ini.</p>}
          {!loading && rows && rows.length > 0 && (
            <TableWrap>
              <thead className="bg-slate-50">
                <tr>{columns.map(c => <Th key={c}>{COL_LABEL[c] ?? c}</Th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/60">
                    {columns.map(c => (
                      <Td key={c}>{c === 'grade' ? <Badge color="slate">{row[c]}</Badge> : row[c]}</Td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>
      )}

      <p className="mt-4 flex items-center gap-1 text-[11px] text-slate-400">
        <TrendingUp className="h-3.5 w-3.5" /> Laporan lain (Tugas, Ujian & Analisis, Progress Belajar per laporan terpisah) belum tersedia — belum ada endpoint agregat khusus di backend untuk itu.
      </p>
    </div>
  );
}
