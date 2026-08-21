import { useMemo, useState } from 'react';
import { Folder, FolderOpen, FileText, File, Presentation, FileImage, Film, Upload, Download, Eye, HardDrive, Lock, Search } from 'lucide-react';
import { STORAGE, getMapel } from '../lib/data';
import { useStore } from '../lib/store';
import { cn, fmtDate } from '../lib/utils';
import { Badge, Button, Card, Modal, PageHeader, ProgressBar, inputCls } from '../components/ui';
import type { FileItem } from '../lib/types';

const TYPE_META: Record<string, { icon: typeof FileText; color: string }> = {
  pdf: { icon: FileText, color: 'bg-rose-50 text-rose-600' },
  doc: { icon: File, color: 'bg-sky-50 text-sky-600' },
  ppt: { icon: Presentation, color: 'bg-amber-50 text-amber-600' },
  image: { icon: FileImage, color: 'bg-emerald-50 text-emerald-600' },
  video: { icon: Film, color: 'bg-violet-50 text-violet-600' },
};

export default function Files() {
  const { files, addFile, toast } = useStore();
  const [folder, setFolder] = useState('Semua');
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState<FileItem | null>(null);
  const [upName, setUpName] = useState('');
  const [upFolder, setUpFolder] = useState('XI-IPA-1/Matematika');

  const folders = useMemo(() => ['Semua', ...new Set(files.map(f => f.folder))], [files]);
  const visible = files.filter(f =>
    (folder === 'Semua' || f.folder === folder) &&
    (search === '' || f.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <PageHeader
        title="File Management"
        desc="Folder per kelas/course, upload multi-file, preview, permission, dan storage monitoring"
        action={<Button onClick={() => setUploadOpen(true)}><Upload className="h-4 w-4" /> Upload File</Button>}
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
          <Card title="Storage Monitoring">
            <div className="mb-2 flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-violet-500" />
              <p className="font-display text-lg font-bold text-slate-900">{STORAGE.usedGB} / {STORAGE.quotaGB} GB</p>
            </div>
            <ProgressBar value={(STORAGE.usedGB / STORAGE.quotaGB) * 100} color="bg-violet-500" />
            <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
              Kebijakan: upload dibatasi maks 25 MB/file. Video pembelajaran wajib via embed YouTube (unlisted) agar storage hemat.
            </p>
          </Card>
          <Card title="Permission">
            <div className="space-y-2 text-[11px] text-slate-500">
              <p className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-rose-500" /> Folder Ujian: hanya guru & admin</p>
              <p className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-amber-500" /> Folder kelas: guru mapel + siswa kelas</p>
              <p className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-emerald-500" /> Folder P5: semua warga sekolah</p>
            </div>
          </Card>
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
                      <p className="text-[10px] text-slate-400">{f.folder} · {f.size} · {f.uploadedBy} · {fmtDate(f.at)}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setPreview(f)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => toast(`Mengunduh ${f.name}…`, 'info')}><Download className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                );
              })}
              {visible.length === 0 && <p className="py-10 text-center text-sm text-slate-400">Tidak ada file di folder ini.</p>}
            </div>
          </Card>
        </div>
      </div>

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload File">
        <div className="space-y-3">
          <button onClick={() => setUpName(`Materi-${getMapel('mtk').code}-${Math.floor(Math.random() * 90 + 10)}.pdf`)} className="flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-8 transition hover:border-indigo-400">
            <Upload className="mb-2 h-7 w-7 text-slate-400" />
            <p className="text-sm font-bold text-slate-700">{upName || 'Klik untuk pilih file (multi-file didukung)'}</p>
            <p className="mt-1 text-[11px] text-slate-400">PDF, Word, PPT, gambar, video kecil · maks 25 MB/file</p>
          </button>
          <select className={inputCls} value={upFolder} onChange={e => setUpFolder(e.target.value)}>
            {folders.filter(f => f !== 'Semua').map(f => <option key={f}>{f}</option>)}
          </select>
          <Button className="w-full" disabled={!upName} onClick={() => {
            addFile({ name: upName, type: 'pdf', size: `${(Math.random() * 2 + 0.3).toFixed(1)} MB`, folder: upFolder });
            setUploadOpen(false); setUpName('');
            toast('File berhasil diunggah & permission diterapkan');
          }}>Upload</Button>
        </div>
      </Modal>

      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name || ''}>
        {preview?.type === 'image' ? (
          <img src="/images/banner.jpg" alt={preview.name} className="w-full rounded-xl" />
        ) : (
          <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-12 text-center">
            <FileText className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Preview {preview?.type.toUpperCase()}</p>
            <p className="mt-1 text-xs text-slate-400">{preview?.size} · diunggah {preview && fmtDate(preview.at)}</p>
            <Button className="mt-4" onClick={() => toast(`Mengunduh ${preview?.name}…`, 'info')}><Download className="h-4 w-4" /> Unduh</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
