import { FileBarChart, FileText, Download, CalendarCheck, ClipboardList, MonitorPlay, TrendingUp, Users, Loader2, CheckCircle2, Clock3 } from 'lucide-react';
import { GRADES, STUDENTS, ATTENDANCE_HISTORY, getMapel, getStudent } from '../lib/data';
import { useStore } from '../lib/store';
import { downloadCSV, finalScore, attendancePct, cn } from '../lib/utils';
import { Badge, Button, Card, PageHeader, ProgressBar } from '../components/ui';
import type { LucideIcon } from 'lucide-react';

const REPORTS: { id: string; title: string; desc: string; icon: LucideIcon; color: string }[] = [
  { id: 'nilai', title: 'Laporan Nilai Siswa', desc: 'Rekap nilai tugas, quiz, PTS, PAS per kelas/mapel dengan grade & ranking', icon: FileText, color: 'bg-indigo-50 text-indigo-600' },
  { id: 'presensi', title: 'Laporan Presensi', desc: 'Rekap kehadiran harian/bulanan/semester siswa & guru', icon: CalendarCheck, color: 'bg-emerald-50 text-emerald-600' },
  { id: 'tugas', title: 'Laporan Tugas', desc: 'Status pengumpulan, nilai, dan revisi seluruh tugas', icon: ClipboardList, color: 'bg-amber-50 text-amber-600' },
  { id: 'ujian', title: 'Laporan Ujian & Analisis', desc: 'Rekap CBT, analisis butir soal, dan log monitoring integritas', icon: MonitorPlay, color: 'bg-violet-50 text-violet-600' },
  { id: 'progress', title: 'Laporan Progress Belajar', desc: 'Progress mapel, durasi belajar, dan siswa tidak aktif', icon: TrendingUp, color: 'bg-sky-50 text-sky-600' },
  { id: 'kelas', title: 'Performa Kelas', desc: 'Perbandingan rata-rata nilai & kehadiran antar rombongan belajar', icon: Users, color: 'bg-rose-50 text-rose-600' },
];

export default function Laporan() {
  const { jobs, startJob, toast } = useStore();

  const directDownload = (id: string) => {
    if (id === 'nilai') {
      downloadCSV('rekap-nilai-xi-ipa-1.csv', [
        ['Siswa', 'Mapel', 'Tugas', 'Quiz', 'PTS', 'PAS', 'Nilai Akhir'],
        ...GRADES.map(g => [getStudent(g.studentId).name, getMapel(g.mapelId).name, g.tugas, g.quiz, g.pts, g.pas, finalScore(g)]),
      ]);
    } else if (id === 'presensi') {
      downloadCSV('rekap-presensi.csv', [
        ['Siswa', 'Hadir', 'Izin', 'Sakit', 'Alpa', 'Terlambat', '% Kehadiran'],
        ...ATTENDANCE_HISTORY.map(h => [getStudent(h.studentId).name, h.hadir, h.izin, h.sakit, h.alpa, h.terlambat, attendancePct(h)]),
      ]);
    } else {
      downloadCSV(`laporan-${id}.csv`, [['Laporan', id], ['Status', 'Data demo']]);
    }
    toast('File berhasil diunduh');
  };

  return (
    <div>
      <PageHeader
        title="Pusat Laporan"
        desc="Export Excel / PDF / CSV — laporan besar diproses via background job (queue) dan kamu dinotifikasi saat selesai"
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map(r => (
          <Card key={r.id} className="flex flex-col">
            <div className={cn('mb-3 flex h-11 w-11 items-center justify-center rounded-xl', r.color)}>
              <r.icon className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">{r.title}</h3>
            <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-500">{r.desc}</p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => directDownload(r.id)}>
                <Download className="h-3.5 w-3.5" /> CSV Cepat
              </Button>
              {(['Excel', 'PDF'] as const).map(f => (
                <Button key={f} size="sm" className="flex-1" onClick={() => { startJob(r.title, f); toast(`${r.title} (${f}) masuk antrean background job`, 'info'); }}>
                  <FileBarChart className="h-3.5 w-3.5" /> {f}
                </Button>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card title="Antrean Background Job" subtitle="Laporan besar diproses asynchronous tanpa memblokir aplikasi" className="mt-6">
        {jobs.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Belum ada laporan dalam antrean. Klik tombol Excel/PDF di atas untuk memulai.</p>
        ) : (
          <div className="space-y-3">
            {jobs.map(j => (
              <div key={j.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 p-4">
                {j.status === 'selesai'
                  ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                  : j.status === 'proses'
                    ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-indigo-500" />
                    : <Clock3 className="h-5 w-5 shrink-0 text-slate-400" />}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800">{j.name} <Badge color="slate" className="ml-1">{j.format}</Badge></p>
                  <ProgressBar value={j.progress} className="mt-2" color={j.status === 'selesai' ? 'bg-emerald-500' : 'bg-indigo-500'} />
                </div>
                <div className="w-24 text-right">
                  {j.status === 'selesai' ? (
                    <Button size="sm" variant="success" onClick={() => directDownload('nilai')}><Download className="h-3.5 w-3.5" /> Unduh</Button>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-500">{j.status === 'antre' ? 'Mengantre…' : `${Math.round(j.progress)}%`}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-[11px] text-slate-400">
          Sistem mengirim notifikasi (in-app + email) saat laporan selesai. Riwayat laporan tersimpan 90 hari.
          Total siswa terdata: {STUDENTS.length} (demo menggunakan kelas XI-IPA-1).
        </p>
      </Card>
    </div>
  );
}
