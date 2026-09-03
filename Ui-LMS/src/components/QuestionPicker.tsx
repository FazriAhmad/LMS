import { useState } from 'react';
import { Database, Plus, Trash2 } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useStore } from '../lib/store';
import { cn } from '../lib/utils';
import { Badge, Button, inputCls } from './ui';

export interface ApiQuestion {
  id: number;
  type: 'pg' | 'tf' | 'isian' | 'essay';
  text: string;
  options: string[] | null;
  answer: string | null;
  points: number;
  difficulty: string;
}

export const QUESTION_TYPE_LABEL: Record<string, string> = { pg: 'Pilihan Ganda', tf: 'Benar/Salah', isian: 'Isian', essay: 'Esai' };

/**
 * Ambil-dari-bank-soal atau tulis-soal-baru, dipakai di form Buat Tugas (Tugas.tsx)
 * maupun Edit Tugas (TugasDetail.tsx) — supaya perilaku & tampilannya identik di
 * keduanya, bukan diketik ulang.
 */
export default function QuestionPicker({ subjectId, picked, onChange }: {
  subjectId: number | undefined;
  picked: ApiQuestion[];
  onChange: (next: ApiQuestion[]) => void;
}) {
  const { toast } = useStore();
  const [bankOpen, setBankOpen] = useState(false);
  const [bank, setBank] = useState<ApiQuestion[] | null>(null);
  const [writeOpen, setWriteOpen] = useState(false);
  const [qType, setQType] = useState<'pg' | 'essay'>('pg');
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qAnswer, setQAnswer] = useState('');
  const [qPoints, setQPoints] = useState('10');
  const [qSaving, setQSaving] = useState(false);

  const loadBank = () => {
    if (!subjectId) return;
    setBank(null);
    setBankOpen(true);
    api.get<{ data: ApiQuestion[] }>(`/questions?subject_id=${subjectId}`)
      .then(r => setBank(r.data))
      .catch(() => setBank([]));
  };

  const togglePick = (q: ApiQuestion) => {
    onChange(picked.some(x => x.id === q.id) ? picked.filter(x => x.id !== q.id) : [...picked, q]);
  };

  const resetWrite = () => { setQType('pg'); setQText(''); setQOptions(['', '', '', '']); setQAnswer(''); setQPoints('10'); };

  /** Soal baru ditulis langsung ke bank soal, lalu dipasang ke tugas — jadi bisa dipakai ulang di quiz/ujian. */
  const saveNewQuestion = async () => {
    if (!subjectId) return;
    setQSaving(true);
    try {
      const body: Record<string, unknown> = {
        subject_id: subjectId,
        type: qType,
        text: qText,
        points: Number(qPoints) || 10,
        difficulty: 'Sedang',
      };
      if (qType === 'pg') {
        body.options = qOptions.filter(o => o.trim());
        body.answer = qAnswer;
      }
      const res = await api.post<{ data: ApiQuestion }>('/questions', body);
      onChange([...picked, res.data]);
      toast('Soal ditambahkan ke bank soal');
      resetWrite();
      setWriteOpen(false);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menyimpan soal', 'error');
    } finally {
      setQSaving(false);
    }
  };

  return (
    <div className="border-t border-slate-100 pt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-bold text-slate-600">
          Soal {picked.length > 0 && <span className="text-slate-400">({picked.length} soal)</span>}
        </label>
        <div className="flex gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => { setWriteOpen(false); bankOpen ? setBankOpen(false) : loadBank(); }}>
            <Database className="h-3.5 w-3.5" /> Bank Soal
          </Button>
          <Button size="sm" variant="secondary" onClick={() => { setBankOpen(false); setWriteOpen(o => !o); }}>
            <Plus className="h-3.5 w-3.5" /> Tulis Soal
          </Button>
        </div>
      </div>
      <p className="mb-2 text-[11px] text-slate-400">
        Opsional. Tanpa soal, siswa mengumpulkan berkas seperti biasa. Soal objektif dinilai otomatis; esai dinilai guru.
      </p>

      {picked.length > 0 && (
        <div className="mb-2 space-y-1.5">
          {picked.map((q, i) => (
            <div key={q.id} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <span className="mt-0.5 text-[10px] font-bold text-slate-400">{i + 1}.</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-700">{q.text}</p>
                <p className="text-[10px] text-slate-400">{QUESTION_TYPE_LABEL[q.type]} · {q.points} poin</p>
              </div>
              <button onClick={() => togglePick(q)} className="text-slate-400 hover:text-rose-500">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {bankOpen && (
        <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2">
          {bank === null && <p className="py-3 text-center text-xs text-slate-400">Memuat bank soal…</p>}
          {bank?.length === 0 && <p className="py-3 text-center text-xs text-slate-400">Belum ada soal untuk mapel ini.</p>}
          {bank?.map(q => {
            const on = picked.some(x => x.id === q.id);
            return (
              <button key={q.id} onClick={() => togglePick(q)} className={cn('flex w-full items-start gap-2 rounded-lg border p-2 text-left transition', on ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50')}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-700">{q.text}</p>
                  <p className="text-[10px] text-slate-400">{QUESTION_TYPE_LABEL[q.type]} · {q.points} poin · {q.difficulty}</p>
                </div>
                {on && <Badge color="indigo">Dipilih</Badge>}
              </button>
            );
          })}
        </div>
      )}

      {writeOpen && (
        <div className="space-y-2 rounded-lg border border-slate-200 p-3">
          <select className={inputCls} value={qType} onChange={e => setQType(e.target.value as 'pg' | 'essay')}>
            <option value="pg">Pilihan Ganda</option>
            <option value="essay">Esai</option>
          </select>
          <textarea rows={2} className={inputCls} placeholder="Tulis pertanyaan…" value={qText} onChange={e => setQText(e.target.value)} />
          {qType === 'pg' && (
            <>
              {qOptions.map((opt, i) => (
                <input
                  key={i}
                  className={inputCls}
                  placeholder={`Opsi ${String.fromCharCode(65 + i)}`}
                  value={opt}
                  onChange={e => setQOptions(o => o.map((v, vi) => vi === i ? e.target.value : v))}
                />
              ))}
              <select className={inputCls} value={qAnswer} onChange={e => setQAnswer(e.target.value)}>
                <option value="">— Pilih kunci jawaban —</option>
                {qOptions.filter(o => o.trim()).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </>
          )}
          <input type="number" min={1} max={100} className={inputCls} placeholder="Poin" value={qPoints} onChange={e => setQPoints(e.target.value)} />
          <Button
            size="sm"
            className="w-full"
            disabled={qSaving || !qText || (qType === 'pg' && (!qAnswer || qOptions.filter(o => o.trim()).length < 2))}
            onClick={saveNewQuestion}
          >
            {qSaving ? 'Menyimpan…' : 'Tambahkan Soal'}
          </Button>
        </div>
      )}
    </div>
  );
}
