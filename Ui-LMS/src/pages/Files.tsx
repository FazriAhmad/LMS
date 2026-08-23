import { useEffect, useMemo, useState } from 'react';
import { Folder, FolderOpen, FileText, File, Presentation, FileImage, Film, Download, Eye, HardDrive, Search } from 'lucide-react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { cn, fmtDate } from '../lib/utils';
import { Badge, Card, Modal, PageHeader, ProgressBar } from '../components/ui';

const TYPE_META: Record<string, { icon: typeof FileText; color: string }> = {
  pdf: { icon: FileText, color: 'bg-rose-50 text-rose-600' },
  doc: { icon: File, color: 'bg-sky-50 text-sky-600' },
  ppt: { icon: Presentation, color: 'bg-amber-50 text-amber-600' },
  image: { icon: FileImage, color: 'bg-emerald-50 text-emerald-600' },
  video: { icon: Film, color: 'bg-violet-50 text-violet-600' },
};

interface ApiFile { id: string; name: string; type: string; size: string | null; folder: string; uploaded_by: string; url: string | null; at: string | null }
interface ApiStorageUsage { used_mb: number; quota_mb: number; percent_used: number }

export default function Files() {
  const { user } = useStore();
  const [files, setFiles] = useState<ApiFile[] | null>(null);
  const [storage, setStorage] = useState<ApiStorageUsage | null>(null);
  const [error, setError] = useState('');
  const [folder, setFolder] = useState('Semua');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<ApiFile | null>(null);

  useEffect(() => {
    api.get<{ data: ApiFile[] }>('/files').then(r => setFiles(r.data)).catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'));
    if (user?.role === 'admin' || user?.role === 'superadmin') {
      api.get<{ data: ApiStorageUsage }>('/storage/usage').then(r => setStorage(r.data)).catch(() => {});
    }
  }, [user]);

  const folders = useMemo(() => ['Semua', ...new Set((files ?? []).map(f => f.folder))], [files]);
  const visible = (files ?? []).filter(f =>
    (folder === 'Semua' || f.folder === folder) &&
    (search === '' || f.name.toLowerCase().includes(search.toLowerCase()))
  );

  if (error) return <Card className="border-rose-200 bg-rose-50/60"><p className="text-sm font-semibold text-rose-700">{error}</p></Card>;
  if (files === null) return <div className="py-10 text-center text-sm text-slate-400">Memuat file…</div>;

  return (
    <div>
      <PageHeader
        title="File Management"
        desc="Gabungan file materi & tugas yang sudah tersimpan — upload tetap lewat halaman Course/Tugas"
      />

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="space-y-4">
          <Card title="Folder" pad={false}>
            <div className="p-2">
              {folders.map(f => (
                <button key={f} onClick={() => setFolder(f)} className={cn('flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition', folder === f ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50')}>
                  {folder === f ? <FolderOpen className="h-4 w-4 text-indigo-500" /> : <Folder className="h-4 w-4 text-slate-400" />}
                  <span className="truncate">{f}</span>
                </button>
              ))}
            </div>
          </Card>
          {storage && (
            <Card title="Storage Monitoring">
              <div className="mb-2 flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-violet-500" />
                <p className="font-display text-lg font-bold text-slate-900">{storage.used_mb} / {storage.quota_mb} MB</p>
              </div>
              <ProgressBar value={storage.percent_used} color="bg-violet-500" />
            </Card>
          )}
        </div>

        <div className="lg:col-span-3">
          <Card pad={false}>
            <div className="flex items-center gap-2 border-b border-slate-100 p-4">
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari file…" className="w-full bg-transparent text-sm outline-none" />
              </div>
              <Badge color="indigo">{visible.length} file</Badge>
            </div>
            <div className="divide-y divide-slate-50">
              {visible.map(f => {
                const meta = TYPE_META[f.type] || TYPE_META.doc;
                return (
                  <div key={f.id} className="flex flex-wrap items-center gap-3 px-5 py-3 transition hover:bg-slate-50/60">
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', meta.color)}>
                      <meta.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-800">{f.name}</p>
                      <p className="text-[10px] text-slate-400">{f.folder}{f.size && ` · ${f.size}`} · {f.uploaded_by}{f.at && ` · ${fmtDate(f.at)}`}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setPreview(f)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Eye className="h-3.5 w-3.5" /></button>
                      {f.url && <a href={f.url} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Download className="h-3.5 w-3.5" /></a>}
                    </div>
                  </div>
                );
              })}
              {visible.length === 0 && <p className="py-10 text-center text-sm text-slate-400">Tidak ada file di folder ini.</p>}
            </div>
          </Card>
        </div>
      </div>

      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name || ''}>
        {preview?.type === 'image' && preview.url ? (
          <img src={preview.url} alt={preview.name} className="w-full rounded-xl" />
        ) : (
          <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-12 text-center">
            <FileText className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Preview {preview?.type.toUpperCase()}</p>
            <p className="mt-1 text-xs text-slate-400">{preview?.size}{preview?.at && ` · diunggah ${fmtDate(preview.at)}`}</p>
            {preview?.url && (
              <a href={preview.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700">
                <Download className="h-4 w-4" /> Unduh
              </a>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
