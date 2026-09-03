import { useEffect, useRef, useState } from 'react';
import { FileText, Trash2, Upload, Download } from 'lucide-react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { fmtDateTime } from '../lib/utils';
import { Button, Card, Modal, PageHeader, inputCls } from '../components/ui';

interface ApiClassMaterial {
  id: number;
  school_class_id: number;
  title: string;
  description: string | null;
  url: string;
  size: string | null;
  uploaded_by: number;
  uploader_name: string | null;
  created_at: string;
}

interface ApiResponse {
  data: ApiClassMaterial[];
  school_class: { id: number; name: string };
  can_upload: boolean;
}

export default function MateriKelas() {
  const { toast } = useStore();
  const [res, setRes] = useState<ApiResponse | null>(null);
  const [error, setError] = useState('');

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    api.get<ApiResponse>('/class-materials')
      .then(setRes)
      .catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'));
  };
  useEffect(load, []);

  const resetForm = () => { setTitle(''); setDesc(''); setFile(null); if (fileRef.current) fileRef.current.value = ''; };

  const upload = async () => {
    if (!res || !file) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('school_class_id', String(res.school_class.id));
      fd.append('title', title);
      if (desc) fd.append('description', desc);
      fd.append('file', file);
      await api.post('/class-materials', fd);
      toast('Materi kelas diunggah');
      setOpen(false); resetForm(); load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal mengunggah', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m: ApiClassMaterial) => {
    try {
      await api.delete(`/class-materials/${m.id}`);
      toast('Materi kelas dihapus');
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menghapus', 'error');
    }
  };

  if (error) return <Card className="border-rose-200 bg-rose-50/60"><p className="text-sm font-semibold text-rose-700">{error}</p></Card>;
  if (res === null) return <div className="py-10 text-center text-sm text-slate-400">Memuat materi kelas…</div>;

  return (
    <div>
      <PageHeader
        title={`Materi Kelas ${res.school_class.name}`}
        desc="Materi dari wali kelas untuk satu kelas ini — berkas PDF, terpisah dari materi mata pelajaran"
        action={res.can_upload
          ? <Button onClick={() => { resetForm(); setOpen(true); }}><Upload className="h-4 w-4" /> Unggah PDF</Button>
          : undefined}
      />

      {res.data.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-slate-400">
            {res.can_upload
              ? 'Belum ada materi kelas. Unggah PDF pertama lewat tombol di atas.'
              : 'Belum ada materi kelas dari wali kelas.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {res.data.map(m => (
            <Card key={m.id}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">{m.title}</p>
                  {m.description && <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{m.description}</p>}
                  <p className="mt-1 text-[11px] text-slate-400">
                    PDF{m.size ? ` · ${m.size}` : ''} · diunggah {m.uploader_name ?? '—'} · {fmtDateTime(m.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a href={m.url} target="_blank" rel="noreferrer">
                    <Button variant="secondary" size="sm"><Download className="h-3.5 w-3.5" /> Buka</Button>
                  </a>
                  {res.can_upload && (
                    <Button variant="ghost" size="sm" onClick={() => remove(m)}>
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={`Unggah Materi Kelas ${res.school_class.name}`}>
        <div className="space-y-3">
          <input className={inputCls} placeholder="Judul materi" value={title} onChange={e => setTitle(e.target.value)} />
          <textarea rows={3} className={inputCls} placeholder="Keterangan (opsional)" value={desc} onChange={e => setDesc(e.target.value)} />
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              className={inputCls}
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="mt-1 text-[11px] text-slate-400">Hanya berkas PDF, maksimal 20 MB.</p>
          </div>
          <Button className="w-full" disabled={!title || !file || saving} onClick={upload}>
            {saving ? 'Mengunggah…' : 'Unggah'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
