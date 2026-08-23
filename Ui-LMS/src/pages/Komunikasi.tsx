import { useEffect, useState } from 'react';
import { MessageSquare, Plus, Send, Trash2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { cn, fmtDateTime } from '../lib/utils';
import { Avatar, Badge, Button, Card, EmptyState, Modal, PageHeader, inputCls } from '../components/ui';

interface ApiCourseRef { id: number; teaching_assignment: { subject: { name: string }; school_class: { name: string } } }
interface ApiAuthor { id: number; name: string }
interface ApiReply { id: number; body: string; author: ApiAuthor; created_at: string }
interface ApiThread { id: number; title: string; body: string; author: ApiAuthor; created_at: string; replies_count?: number; replies?: ApiReply[] }

const isStaffRole = (role: string) => ['guru', 'walikelas', 'admin', 'superadmin', 'kepsek'].includes(role);

export default function Komunikasi() {
  const { user, toast } = useStore();
  const [courses, setCourses] = useState<ApiCourseRef[]>([]);
  const [threads, setThreads] = useState<(ApiThread & { course: ApiCourseRef })[] | null>(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  const [newOpen, setNewOpen] = useState(false);
  const [newCourseId, setNewCourseId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [saving, setSaving] = useState(false);

  const isStaff = !!user && isStaffRole(user.role);

  const load = () => {
    api.get<{ data: ApiCourseRef[] }>('/courses')
      .then(async ({ data: cs }) => {
        setCourses(cs);
        setNewCourseId(id => id ?? cs[0]?.id ?? null);
        const lists = await Promise.all(cs.map(c => api.get<{ data: ApiThread[] }>(`/courses/${c.id}/forum-threads`).then(r => r.data.map(t => ({ ...t, course: c })))));
        setThreads(lists.flat().sort((a, b) => (a.created_at < b.created_at ? 1 : -1)));
      })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'));
  };
  useEffect(load, []);

  const loadThreadDetail = (threadId: number) => {
    api.get<{ data: ApiThread }>(`/forum-threads/${threadId}`)
      .then(res => setThreads(list => (list ?? []).map(t => t.id === threadId ? { ...res.data, course: t.course } : t)));
  };

  const toggle = (threadId: number) => {
    if (expanded === threadId) { setExpanded(null); return; }
    setExpanded(threadId);
    loadThreadDetail(threadId);
  };

  const createThread = async () => {
    if (!newCourseId) return;
    setSaving(true);
    try {
      await api.post(`/courses/${newCourseId}/forum-threads`, { title: newTitle, body: newBody });
      toast('Thread diskusi berhasil dibuat');
      setNewOpen(false); setNewTitle(''); setNewBody('');
      setThreads(null); load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal membuat thread', 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitReply = async (threadId: number) => {
    if (!replyText.trim()) return;
    try {
      await api.post(`/forum-threads/${threadId}/replies`, { body: replyText });
      setReplyText('');
      loadThreadDetail(threadId);
      toast('Balasan terkirim');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal mengirim balasan', 'error');
    }
  };

  const deleteThread = async (threadId: number) => {
    try {
      await api.delete(`/forum-threads/${threadId}`);
      toast('Thread dihapus');
      setThreads(list => (list ?? []).filter(t => t.id !== threadId));
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menghapus thread', 'error');
    }
  };

  const deleteReply = async (threadId: number, replyId: number) => {
    try {
      await api.delete(`/forum-replies/${replyId}`);
      loadThreadDetail(threadId);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal menghapus balasan', 'error');
    }
  };

  if (error) return <Card className="border-rose-200 bg-rose-50/60"><p className="text-sm font-semibold text-rose-700">{error}</p></Card>;
  if (threads === null) return <div className="py-10 text-center text-sm text-slate-400">Memuat forum diskusi…</div>;

  return (
    <div>
      <PageHeader
        title="Komunikasi"
        desc="Forum diskusi per mata pelajaran — pengumuman & chat guru-siswa sengaja tidak dikerjakan (keputusan produk: komunikasi cukup lewat forum)"
        action={<Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" /> Thread Baru</Button>}
      />

      {threads.length === 0 && <Card><EmptyState icon={MessageSquare} title="Belum ada diskusi" /></Card>}

      <div className="space-y-4">
        {threads.map(t => {
          const canModerateThread = user && (user.id === String(t.author.id) || isStaff);
          const isExpanded = expanded === t.id;
          return (
            <Card key={t.id}>
              <div className="flex items-start gap-3">
                <Avatar name={t.author.name} color="#6366f1" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{t.title}</h3>
                        <Badge color="slate">{t.course.teaching_assignment.subject.name} · {t.course.teaching_assignment.school_class.name}</Badge>
                      </div>
                      <p className="text-[11px] text-slate-400">{t.author.name} · {fmtDateTime(t.created_at)}</p>
                    </div>
                    {canModerateThread && (
                      <button onClick={() => deleteThread(t.id)} className="shrink-0 text-slate-300 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{t.body}</p>

                  {!isExpanded && (
                    <button onClick={() => toggle(t.id)} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline">
                      <MessageSquare className="h-3.5 w-3.5" /> Lihat balasan ({t.replies_count ?? 0})
                    </button>
                  )}

                  {isExpanded && (
                    <div className="mt-3 space-y-2">
                      {(t.replies ?? []).map(r => (
                        <div key={r.id} className="flex items-start justify-between gap-2 rounded-xl bg-slate-50 p-3">
                          <div>
                            <p className="text-[11px] font-bold text-slate-700">{r.author.name}</p>
                            <p className="mt-1 text-xs text-slate-600">{r.body}</p>
                          </div>
                          {user && (user.id === String(r.author.id) || isStaff) && (
                            <button onClick={() => deleteReply(t.id, r.id)} className="shrink-0 text-slate-300 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
                          )}
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Tulis balasan…" className={cn(inputCls, 'flex-1')} />
                        <Button size="sm" onClick={() => submitReply(t.id)}><Send className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="Buat Thread Diskusi">
        <div className="space-y-3">
          <select className={inputCls} value={newCourseId ?? ''} onChange={e => setNewCourseId(Number(e.target.value))}>
            {courses.map(c => <option key={c.id} value={c.id}>{c.teaching_assignment.subject.name} — {c.teaching_assignment.school_class.name}</option>)}
          </select>
          <input className={inputCls} placeholder="Judul diskusi…" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
          <textarea rows={4} className={inputCls} placeholder="Tulis pertanyaan atau topik…" value={newBody} onChange={e => setNewBody(e.target.value)} />
          <Button className="w-full" disabled={!newCourseId || !newTitle || !newBody || saving} onClick={createThread}>{saving ? 'Menyimpan…' : 'Publikasikan'}</Button>
        </div>
      </Modal>
    </div>
  );
}
