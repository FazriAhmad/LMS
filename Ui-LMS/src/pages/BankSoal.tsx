import { useEffect, useMemo, useState } from 'react';
import { Database, Download, Upload, Plus, Search, BarChart3, Shuffle, Repeat } from 'lucide-react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { downloadCSV, cn } from '../lib/utils';
import { Badge, Button, Card, Modal, PageHeader, StatCard, TableWrap, Td, Th, inputCls } from '../components/ui';

const DIFF_COLOR: Record<string, string> = { Mudah: 'emerald', Sedang: 'amber', Sulit: 'rose' };
const TYPE_LABEL: Record<string, string> = { pg: 'Pilihan Ganda', tf: 'Benar/Salah', isian: 'Isian', essay: 'Essay' };

interface ApiSubject { id: number; name: string; code: string; color: string }
interface ApiQuestion {
  id: number; subject_id: number; type: 'pg' | 'tf' | 'isian' | 'essay'; text: string;
  options: string[] | null; answer: string | null; keywords: string[] | null; points: number;
  difficulty: 'Mudah' | 'Sedang' | 'Sulit'; kompetensi: string | null;
  used_count: number; correct_rate: number | null;
}

const emptyNewQ = { text: '', type: 'pg', subjectId: '', difficulty: 'Mudah', kompetensi: '', answer: '', points: '10', optionsText: '', keywordsText: '' };

export default function BankSoal() {
  const { toast } = useStore();
  const [subjects, setSubjects] = useState<ApiSubject[]>([]);
  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapelF, setMapelF] = useState('all');
  const [diffF, setDiffF] = useState('all');
  const [typeF, setTypeF] = useState('all');
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [newQ, setNewQ] = useState(emptyNewQ);
  const [saving, setSaving] = useState(false);

  const subjectOf = (id: number) => subjects.find(s => s.id === id);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<{ data: ApiSubject[] }>('/subjects'),
      api.get<{ data: ApiQuestion[] }>('/questions'),
    ])
      .then(([subRes, qRes]) => {
        setSubjects(subRes.data);
        setQuestions(qRes.data);
        setNewQ(q => ({ ...q, subjectId: q.subjectId || String(subRes.data[0]?.id ?? '') }));
      })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = useMemo(() => questions.filter(q =>
    (mapelF === 'all' || q.subject_id === Number(mapelF)) &&
    (diffF === 'all' || q.difficulty === diffF) &&
    (typeF === 'all' || q.type === typeF) &&
    (search === '' || q.text.toLowerCase().includes(search.toLowerCase()) || (q.kompetensi ?? '').toLowerCase().includes(search.toLowerCase()))
  ), [questions, mapelF, diffF, typeF, search]);

  const exportExcel = () => {
    downloadCSV('bank-soal.csv', [
      ['ID', 'Tipe', 'Soal', 'Jawaban', 'Poin', 'Mapel', 'Kesulitan', 'Kompetensi', 'Kali Dipakai', '% Benar'],
      ...filtered.map(q => [q.id, TYPE_LABEL[q.type], q.text, q.answer ?? '', q.points, subjectOf(q.subject_id)?.name ?? '', q.difficulty, q.kompetensi ?? '', q.used_count, q.correct_rate ?? '']),
    ]);
    toast('Bank soal di-export ke CSV ✓');
  };

  const createQuestion = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        subject_id: Number(newQ.subjectId),
        type: newQ.type,
        text: newQ.text,
        points: Number(newQ.points),
        difficulty: newQ.difficulty,
        kompetensi: newQ.kompetensi || null,
      };
      if (newQ.type === 'pg') {
        payload.options = newQ.optionsText.split(',').map(s => s.trim()).filter(Boolean);
        payload.answer = newQ.answer;
      } else if (newQ.type === 'tf') {
        payload.options = ['Benar', 'Salah'];
        payload.answer = newQ.answer;
      } else if (newQ.type === 'isian') {
        payload.answer = newQ.answer;
        payload.keywords = newQ.keywordsText.split(',').map(s => s.trim()).filter(Boolean);
      }
      await api.post('/questions', payload);
      toast('Soal tersimpan di bank soal & siap di-reuse ke quiz/ujian');
      setAddOpen(false);
      setNewQ({ ...emptyNewQ, subjectId: newQ.subjectId });
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menyimpan soal', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-10 text-center text-sm text-slate-400">Memuat bank soal…</div>;
  if (error) return <Card className="border-rose-200 bg-rose-50/60"><p className="text-sm font-semibold text-rose-700">{error}</p></Card>;

  const gradedRates = questions.filter(q => q.correct_rate !== null).map(q => q.correct_rate as number);

  return (
    <div>
      <PageHeader
        title="Bank Soal"
        desc="Kategori, tingkat kesulitan, kompetensi, statistik soal, serta import/export"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => toast('Import Excel: pilih file .xlsx, petakan kolom, soal masuk bank (belum tersedia — tambah soal satu-satu lewat form).', 'info')}><Upload className="h-4 w-4" /> Import Excel</Button>
            <Button variant="secondary" onClick={exportExcel}><Download className="h-4 w-4" /> Export</Button>
            <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Tambah Soal</Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Database} label="Total Soal" value={questions.length} color="bg-indigo-50 text-indigo-600" />
        <StatCard icon={BarChart3} label="Sulit / Sedang / Mudah" value={`${questions.filter(q => q.difficulty === 'Sulit').length} / ${questions.filter(q => q.difficulty === 'Sedang').length} / ${questions.filter(q => q.difficulty === 'Mudah').length}`} color="bg-rose-50 text-rose-600" />
        <StatCard icon={Shuffle} label="Dipakai Ujian/Quiz" value={questions.reduce((a, q) => a + q.used_count, 0) + '×'} sub="Reuse soal antar asesmen" color="bg-violet-50 text-violet-600" />
        <StatCard icon={Repeat} label="Rata-rata % Benar" value={gradedRates.length ? `${Math.round(gradedRates.reduce((a, b) => a + b, 0) / gradedRates.length)}%` : '—'} sub="Analisis tingkat kesulitan soal" color="bg-emerald-50 text-emerald-600" />
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari soal / kompetensi…" className="w-full bg-transparent text-sm outline-none" />
          </div>
          <select value={mapelF} onChange={e => setMapelF(e.target.value)} className={cn(inputCls, 'w-auto')}>
            <option value="all">Semua Mapel</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
              <Td><Badge color="slate">{subjectOf(q.subject_id)?.code ?? '—'}</Badge></Td>
              <Td className="text-xs">{q.kompetensi}</Td>
              <Td><Badge color={DIFF_COLOR[q.difficulty]}>{q.difficulty}</Badge></Td>
              <Td className="font-bold">{q.points}</Td>
              <Td>
                <p className="text-[11px] text-slate-500">Dipakai <b>{q.used_count}×</b></p>
                {q.correct_rate !== null
                  ? <p className={cn('text-[11px] font-bold', q.correct_rate < 50 ? 'text-rose-600' : 'text-emerald-600')}>{q.correct_rate}% benar</p>
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
            <select className={inputCls} value={newQ.subjectId} onChange={e => setNewQ({ ...newQ, subjectId: e.target.value })}>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select className={inputCls} value={newQ.difficulty} onChange={e => setNewQ({ ...newQ, difficulty: e.target.value })}>
              <option>Mudah</option><option>Sedang</option><option>Sulit</option>
            </select>
            <input type="number" min={1} max={100} className={inputCls} placeholder="Poin" value={newQ.points} onChange={e => setNewQ({ ...newQ, points: e.target.value })} />
            <input className={cn(inputCls, 'col-span-2')} placeholder="Kompetensi (cth: Fungsi Komposisi)" value={newQ.kompetensi} onChange={e => setNewQ({ ...newQ, kompetensi: e.target.value })} />
          </div>
          {newQ.type === 'pg' && (
            <input className={inputCls} placeholder="Opsi, pisahkan dengan koma (cth: 3, 4, 5)" value={newQ.optionsText} onChange={e => setNewQ({ ...newQ, optionsText: e.target.value })} />
          )}
          {(newQ.type === 'pg' || newQ.type === 'tf') && (
            <input className={inputCls} placeholder="Kunci jawaban (harus sama persis dengan salah satu opsi)" value={newQ.answer} onChange={e => setNewQ({ ...newQ, answer: e.target.value })} />
          )}
          {newQ.type === 'isian' && (
            <>
              <input className={inputCls} placeholder="Kunci jawaban" value={newQ.answer} onChange={e => setNewQ({ ...newQ, answer: e.target.value })} />
              <input className={inputCls} placeholder="Kata kunci alternatif, pisahkan dengan koma (opsional)" value={newQ.keywordsText} onChange={e => setNewQ({ ...newQ, keywordsText: e.target.value })} />
            </>
          )}
          <Button className="w-full" disabled={!newQ.text || !newQ.kompetensi || !newQ.subjectId || saving} onClick={createQuestion}>
            {saving ? 'Menyimpan…' : 'Simpan Soal'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
