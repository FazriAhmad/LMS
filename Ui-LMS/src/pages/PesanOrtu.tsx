import { useEffect, useRef, useState } from 'react';
import { Send, MessagesSquare } from 'lucide-react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { cn, fmtDateTime } from '../lib/utils';
import { Avatar, Button, Card, PageHeader, inputCls } from '../components/ui';

interface ApiConversation {
  student_id: number;
  student_name: string;
  class_name: string | null;
  counterpart: string | null;
  last_message: string | null;
  last_message_at: string | null;
  last_sender_name: string | null;
  messages_count: number;
}

interface ApiMessage {
  id: number;
  body: string;
  created_at: string;
  sender_id: number;
  sender_name: string;
  mine: boolean;
}

export default function PesanOrtu() {
  const { user, toast } = useStore();
  const isOrtu = user?.role === 'ortu';

  const [conversations, setConversations] = useState<ApiConversation[] | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ApiMessage[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<{ data: ApiConversation[] }>('/parent-messages')
      .then(res => { setConversations(res.data); setActiveId(res.data[0]?.student_id ?? null); })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'));
  }, []);

  const loadMessages = (studentId: number) => {
    setMessages(null);
    api.get<{ data: ApiMessage[] }>(`/parent-messages/${studentId}`)
      .then(res => setMessages(res.data))
      .catch(() => setMessages([]));
  };

  useEffect(() => {
    if (activeId) loadMessages(activeId);
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const send = async () => {
    if (!activeId || !draft.trim()) return;
    setSending(true);
    try {
      await api.post(`/parent-messages/${activeId}`, { body: draft.trim() });
      setDraft('');
      loadMessages(activeId);
      // daftar percakapan ikut di-refresh biar cuplikan pesan terakhirnya akurat
      api.get<{ data: ApiConversation[] }>('/parent-messages').then(res => setConversations(res.data)).catch(() => {});
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Gagal mengirim pesan', 'error');
    } finally {
      setSending(false);
    }
  };

  if (error) return <Card className="border-rose-200 bg-rose-50/60"><p className="text-sm font-semibold text-rose-700">{error}</p></Card>;
  if (conversations === null) return <div className="py-10 text-center text-sm text-slate-400">Memuat percakapan…</div>;

  const active = conversations.find(c => c.student_id === activeId);

  return (
    <div>
      <PageHeader
        title="Komunikasi"
        desc={isOrtu
          ? 'Pesan langsung dengan wali kelas anak Anda'
          : 'Pesan langsung dengan orang tua siswa di kelas wali Anda'}
      />

      {conversations.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-slate-400">
            {isOrtu
              ? 'Belum ada anak yang terhubung ke akun ini, jadi belum ada wali kelas untuk dihubungi.'
              : 'Anda belum ditunjuk sebagai wali kelas, jadi belum ada orang tua untuk dihubungi.'}
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Daftar percakapan — untuk ortu biasanya cuma 1 (per anak). */}
          <Card pad={false} className="h-fit overflow-hidden">
            <p className="border-b border-slate-100 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400">
              {isOrtu ? 'Anak' : 'Siswa Kelas Wali'}
            </p>
            <div className="max-h-[520px] overflow-y-auto">
              {conversations.map(c => (
                <button
                  key={c.student_id}
                  onClick={() => setActiveId(c.student_id)}
                  className={cn(
                    'flex w-full items-start gap-3 border-b border-slate-50 p-3 text-left transition last:border-0',
                    activeId === c.student_id ? 'bg-indigo-50' : 'hover:bg-slate-50'
                  )}
                >
                  <Avatar name={c.student_name} color="#6366f1" size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-800">{c.student_name}</p>
                    <p className="truncate text-[10px] text-slate-400">
                      {c.counterpart ?? (isOrtu ? 'Wali kelas belum ditunjuk' : 'Orang tua belum terhubung')}
                    </p>
                    {c.last_message && <p className="mt-1 truncate text-[11px] text-slate-500">{c.last_message}</p>}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Ruang percakapan */}
          <Card pad={false} className="flex min-h-[520px] flex-col overflow-hidden">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <MessagesSquare className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">
                  {active?.counterpart ?? (isOrtu ? 'Wali Kelas' : 'Orang Tua')}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  Membahas {active?.student_name}{active?.class_name ? ` · Kelas ${active.class_name}` : ''}
                </p>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/50 p-5">
              {messages === null ? (
                <p className="py-8 text-center text-sm text-slate-400">Memuat pesan…</p>
              ) : messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  Belum ada pesan. Mulai percakapan dengan mengirim pesan pertama.
                </p>
              ) : messages.map(m => (
                <div key={m.id} className={cn('flex', m.mine ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    'max-w-[75%] rounded-2xl px-4 py-2.5',
                    m.mine ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-700'
                  )}>
                    {!m.mine && <p className="mb-0.5 text-[10px] font-bold text-slate-500">{m.sender_name}</p>}
                    <p className="text-sm leading-relaxed">{m.body}</p>
                    <p className={cn('mt-1 text-[10px]', m.mine ? 'text-indigo-200' : 'text-slate-400')}>
                      {fmtDateTime(m.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="flex items-end gap-2 border-t border-slate-100 p-3">
              <textarea
                rows={2}
                className={cn(inputCls, 'resize-none')}
                placeholder="Tulis pesan…"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              />
              <Button disabled={!draft.trim() || sending} onClick={send}>
                <Send className="h-4 w-4" /> {sending ? 'Mengirim…' : 'Kirim'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
