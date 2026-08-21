import { useMemo, useState } from 'react';
import { Database, Download, Upload, Plus, Search, BarChart3, Shuffle, Repeat } from 'lucide-react';
import { QUESTIONS, MAPEL, getMapel } from '../lib/data';
import { useStore } from '../lib/store';
import { downloadCSV, cn } from '../lib/utils';
import { Badge, Button, Card, Modal, PageHeader, StatCard, TableWrap, Td, Th, inputCls } from '../components/ui';

const DIFF_COLOR: Record<string, string> = { Mudah: 'emerald', Sedang: 'amber', Sulit: 'rose' };
const TYPE_LABEL: Record<string, string> = { pg: 'Pilihan Ganda', tf: 'Benar/Salah', isian: 'Isian', essay: 'Essay' };

export default function BankSoal() {
  const { toast } = useStore();
  const [mapelF, setMapelF] = useState('all');
  const [diffF, setDiffF] = useState('all');
  const [typeF, setTypeF] = useState('all');
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [newQ, setNewQ] = useState({ text: '', type: 'pg', mapelId: 'mtk', difficulty: 'Mudah', kompetensi: '', answer: '' });

  const filtered = useMemo(() => QUESTIONS.filter(q =>
    (mapelF === 'all' || q.mapelId === mapelF) &&
    (diffF === 'all' || q.difficulty === diffF) &&
    (typeF === 'all' || q.type === typeF) &&
    (search === '' || q.text.toLowerCase().includes(search.toLowerCase()) || q.kompetensi.toLowerCase().includes(search.toLowerCase()))
  ), [mapelF, diffF, typeF, search]);

  const exportExcel = () => {
    downloadCSV('bank-soal.csv', [
      ['ID', 'Tipe', 'Soal', 'Jawaban', 'Poin', 'Mapel', 'Kesulitan', 'Kompetensi', 'Kali Dipakai', '% Benar'],
      ...filtered.map(q => [q.id, TYPE_LABEL[q.type], q.text, q.answer, q.points, getMapel(q.mapelId).name, q.difficulty, q.kompetensi, q.usedCount, q.correctRate]),
    ]);
    toast('Bank soal di-export ke Excel/CSV ✓');
  };

  return (
    <div>
      <PageHeader
        title="Bank Soal"
        desc="Kategori, tingkat kesulitan, kompetensi, statistik soal, serta import/export Excel"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => toast('Import Excel: pilih file .xlsx, petakan kolom, soal masuk bank (demo).', 'info')}><Upload className="h-4 w-4" /> Import Excel</Button>
            <Button variant="secondary" onClick={exportExcel}><Download className="h-4 w-4" /> Export</Button>
            <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Tambah Soal</Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Database} label="Total Soal" value={QUESTIONS.length} color="bg-indigo-50 text-indigo-600" />
        <StatCard icon={BarChart3} label="Sulit / Sedang / Mudah" value={`${QUESTIONS.filter(q => q.difficulty === 'Sulit').length} / ${QUESTIONS.filter(q => q.difficulty === 'Sedang').length} / ${QUESTIONS.filter(q => q.difficulty === 'Mudah').length}`} color="bg-rose-50 text-rose-600" />
        <StatCard icon={Shuffle} label="Dipakai Ujian/Quiz" value={QUESTIONS.reduce((a, q) => a + q.usedCount, 0) + '×'} sub="Reuse soal antar asesmen" color="bg-violet-50 text-violet-600" />
        <StatCard icon={Repeat} label="Rata-rata % Benar" value={`${Math.round(QUESTIONS.filter(q => q.correctRate > 0).reduce((a, q) => a + q.correctRate, 0) / QUESTIONS.filter(q => q.correctRate > 0).length)}%`} sub="Analisis tingkat kesulitan soal" color="bg-emerald-50 text-emerald-600" />
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari soal / kompetensi…" className="w-full bg-transparent text-sm outline-none" />
          </div>
          <select value={mapelF} onChange={e => setMapelF(e.target.value)} className={cn(inputCls, 'w-auto')}>
            <option value="all">Semua Mapel</option>
            {MAPEL.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select value={diffF} onChange={e => setDiffF(e.target.value)} className={cn(inputCls, 'w-auto')}>
            <option value="all">Semua Kesulitan</option>
            <option>Mudah</option><option>Sedang</option><option>Sulit</option>
          </select>
          <select value={typeF} onChange={e => setTypeF(e.target.value)} className={cn(inputCls, 'w-auto')}>
            <option value="all">Semua Tipe</option>
            <option value="pg">Pilihan Ganda</option><option value="tf">Benar/Salah</option><option value="isian">Isian</option><option value="essay">Essay</option>
          </select>
        </div>
      </Card>

      <TableWrap>
        <thead className="bg-slate-50">
          <tr><Th>Soal</Th><Th>Mapel</Th><Th>Kompetensi</Th><Th>Kesulitan</Th><Th>Poin</Th><Th>Statistik</Th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filtered.map(q => (
            <tr key={q.id} className="align-top transition hover:bg-slate-50/60">
              <Td className="max-w-md">
                <Badge color={q.type === 'pg' ? 'indigo' : q.type === 'tf' ? 'sky' : q.type === 'isian' ? 'emerald' : 'amber'} className="mb-1">{TYPE_LABEL[q.type]}</Badge>
                <p className="text-xs font-medium leading-relaxed text-slate-700">{q.text}</p>
                {q.options && <p className="mt-1 text-[10px] text-slate-400">Opsi: {q.options.join(' · ')}</p>}
              </Td>
              <Td><Badge color="slate">{getMapel(q.mapelId).code}</Badge></Td>
              <Td className="text-xs">{q.kompetensi}</Td>
              <Td><Badge color={DIFF_COLOR[q.difficulty]}>{q.difficulty}</Badge></Td>
              <Td className="font-bold">{q.points}</Td>
              <Td>
                <p className="text-[11px] text-slate-500">Dipakai <b>{q.usedCount}×</b></p>
                {q.correctRate > 0
                  ? <p className={cn('text-[11px] font-bold', q.correctRate < 50 ? 'text-rose-600' : 'text-emerald-600')}>{q.correctRate}% benar</p>
                  : <p className="text-[11px] text-slate-400">manual</p>}
              </Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      {filtered.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Tidak ada soal yang cocok dengan filter.</p>}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Tambah Soal ke Bank">
        <div className="space-y-3">
          <textarea rows={3} className={inputCls} placeholder="Tulis pertanyaan…" value={newQ.text} onChange={e => setNewQ({ ...newQ, text: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <select className={inputCls} value={newQ.type} onChange={e => setNewQ({ ...newQ, type: e.target.value })}>
              <option value="pg">Pilihan Ganda</option><option value="tf">Benar/Salah</option><option value="isian">Isian</option><option value="essay">Essay</option>
            </select>
            <select className={inputCls} value={newQ.mapelId} onChange={e => setNewQ({ ...newQ, mapelId: e.target.value })}>
              {MAPEL.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <select className={inputCls} value={newQ.difficulty} onChange={e => setNewQ({ ...newQ, difficulty: e.target.value })}>
              <option>Mudah</option><option>Sedang</option><option>Sulit</option>
            </select>
            <input className={inputCls} placeholder="Kompetensi (cth: Fungsi Komposisi)" value={newQ.kompetensi} onChange={e => setNewQ({ ...newQ, kompetensi: e.target.value })} />
          </div>
          {newQ.type !== 'essay' && <input className={inputCls} placeholder="Kunci jawaban" value={newQ.answer} onChange={e => setNewQ({ ...newQ, answer: e.target.value })} />}
          <Button className="w-full" disabled={!newQ.text || !newQ.kompetensi} onClick={() => {
            setAddOpen(false);
            setNewQ({ text: '', type: 'pg', mapelId: 'mtk', difficulty: 'Mudah', kompetensi: '', answer: '' });
            toast('Soal tersimpan di bank soal & siap di-reuse ke quiz/ujian');
          }}>Simpan Soal</Button>
        </div>
      </Modal>
    </div>
  );
}
