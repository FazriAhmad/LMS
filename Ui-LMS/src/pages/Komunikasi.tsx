import { useMemo, useState } from 'react';
import { Bell, Megaphone, MessageSquare, Plus, Send, ShieldCheck, Pin } from 'lucide-react';
import { COURSES, USERS, getMapel, getClass, ROLE_LABELS } from '../lib/data';
import { useStore } from '../lib/store';
import { cn, fmtDate, fmtDateTime, timeAgo } from '../lib/utils';
import { Avatar, Badge, Button, Card, EmptyState, Modal, PageHeader, Tabs, inputCls } from '../components/ui';

export default function Komunikasi() {
  const { user, announcements, addAnnouncement, forums, addForumReply, chats, sendMessage, toast } = useStore();
  const [tab, setTab] = useState('pengumuman');
  const [annOpen, setAnnOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annScope, setAnnScope] = useState<'sekolah' | 'kelas'>('sekolah');
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [chatText, setChatText] = useState('');

  const isStaff = user && ['guru', 'walikelas', 'admin', 'superadmin', 'kepsek'].includes(user.role);
  const myChats = useMemo(() => chats.filter(c => c.users.includes(user?.id || '')), [chats, user]);
  const currentChat = myChats.find(c => c.id === activeChat) || myChats[0];

  const otherName = (chatId: string) => {
    const c = chats.find(x => x.id === chatId)!;
    const otherId = c.users.find(u => u !== user?.id)!;
    return USERS.find(u => u.id === otherId);
  };

  return (
    <div>
      <PageHeader
        title="Komunikasi"
        desc="Pengumuman, forum diskusi, dan chat — dengan audit trail untuk keamanan warga sekolah"
        action={isStaff && tab === 'pengumuman' ? <Button onClick={() => setAnnOpen(true)}><Plus className="h-4 w-4" /> Buat Pengumuman</Button> : undefined}
      />
      <div className="mb-6">
        <Tabs
          tabs={[
            { id: 'pengumuman', label: `Pengumuman (${announcements.length})` },
            { id: 'forum', label: `Forum Diskusi (${forums.length})` },
            { id: 'chat', label: `Chat (${myChats.length})` },
          ]}
          active={tab} onChange={setTab}
        />
      </div>

      {tab === 'pengumuman' && (
        <div className="space-y-4">
          {announcements.map(a => (
            <Card key={a.id} className={cn(a.pinned && 'border-indigo-200 ring-1 ring-indigo-100')}>
              <div className="flex items-start gap-4">
                <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', a.scope === 'sekolah' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600')}>
                  {a.pinned ? <Pin className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{a.title}</h3>
                    <Badge color={a.scope === 'sekolah' ? 'indigo' : 'emerald'}>{a.scope === 'sekolah' ? 'Sekolah' : `Kelas ${a.classId ? getClass(a.classId).name : ''}`}</Badge>
                    {a.pinned && <Badge color="amber">Disematkan</Badge>}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{a.body}</p>
                  <p className="mt-2 text-[11px] text-slate-400">{a.author} · {fmtDate(a.date)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'forum' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {forums.map(f => {
              const course = COURSES.find(c => c.id === f.courseId);
              return (
                <Card key={f.id}>
                  <div className="flex items-start gap-3">
                    <Avatar name={f.author} color="#6366f1" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{f.title}</h3>
                        {course && <Badge color="slate">{getMapel(course.mapelId).name}</Badge>}
                      </div>
                      <p className="text-[11px] text-slate-400">{f.author} · {fmtDate(f.date)} · {f.replies.length} balasan</p>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600">{f.body}</p>
                      <div className="mt-3 space-y-2">
                        {f.replies.map((r, i) => (
                          <div key={i} className="rounded-xl bg-slate-50 p-3">
                            <div className="flex items-center gap-2">
                              <p className="text-[11px] font-bold text-slate-700">{r.author}</p>
                              <Badge color={r.role === 'Guru' ? 'indigo' : 'slate'}>{r.role}</Badge>
                              <span className="text-[10px] text-slate-400">{timeAgo(r.at)}</span>
                            </div>
                            <p className="mt-1 text-xs text-slate-600">{r.text}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <input
                          value={replyText[f.id] || ''}
                          onChange={e => setReplyText(r => ({ ...r, [f.id]: e.target.value }))}
                          placeholder="Tulis balasan…"
                          className={cn(inputCls, 'flex-1')}
                        />
                        <Button size="sm" disabled={!(replyText[f.id] || '').trim()} onClick={() => {
                          addForumReply(f.id, replyText[f.id]);
                          setReplyText(r => ({ ...r, [f.id]: '' }));
                          toast('Balasan terkirim');
                        }}><Send className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          <div className="space-y-4">
            <img src="/images/forum.jpg" alt="Diskusi siswa" className="w-full rounded-2xl object-cover shadow-sm" />
            <Card title="Aturan Forum">
              <ul className="space-y-1.5 text-[11px] leading-relaxed text-slate-500">
                <li>· Gunakan bahasa sopan & konstruktif.</li>
                <li>· Diskusi sesuai topik mata pelajaran.</li>
                <li>· Guru memoderasi; konten tidak pantas dihapus & dicatat di audit log.</li>
                <li>· Komentar materi/tugas juga tersedia di halaman Course.</li>
              </ul>
            </Card>
          </div>
        </div>
      )}

      {tab === 'chat' && (
        <div>
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-800">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p><b>Audit trail aktif:</b> seluruh percakapan guru–siswa tersimpan dan dapat direview Admin / Kepala Sekolah demi keamanan & perlindungan anak. Notifikasi chat masuk terkirim real-time.</p>
          </div>
          {myChats.length === 0 ? (
            <Card><EmptyState icon={MessageSquare} title="Belum ada percakapan" desc="Chat dengan guru atau wali kelas akan muncul di sini." /></Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <Card pad={false} className="lg:col-span-1">
                <div className="divide-y divide-slate-50">
                  {myChats.map(c => {
                    const other = otherName(c.id);
                    const last = c.messages[c.messages.length - 1];
                    return (
                      <button key={c.id} onClick={() => setActiveChat(c.id)} className={cn('flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50', currentChat?.id === c.id && 'bg-indigo-50/60')}>
                        <Avatar name={other?.name || '?'} color={other?.color || '#64748b'} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-slate-800">{other?.name}</p>
                          <p className="truncate text-[10px] text-slate-400">{last.text}</p>
                        </div>
                        <span className="text-[9px] text-slate-300">{timeAgo(last.at)}</span>
                      </button>
                    );
                  })}
                </div>
              </Card>
              <Card pad={false} className="flex flex-col lg:col-span-2">
                {currentChat && (
                  <>
                    <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
                      <Avatar name={otherName(currentChat.id)?.name || '?'} color={otherName(currentChat.id)?.color} size="sm" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">{otherName(currentChat.id)?.name}</p>
                        <p className="text-[10px] text-slate-400">{ROLE_LABELS[otherName(currentChat.id)?.role || ''] || ''} · log tersimpan</p>
                      </div>
                      <Badge color="emerald" className="ml-auto"><ShieldCheck className="h-3 w-3" /> Teraudit</Badge>
                    </div>
                    <div className="max-h-96 flex-1 space-y-3 overflow-y-auto bg-slate-50/50 p-5">
                      {currentChat.messages.map((msg, i) => {
                        const mine = msg.from === user?.id;
                        return (
                          <div key={i} className={cn('flex', mine && 'justify-end')}>
                            <div className={cn('max-w-[75%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed', mine ? 'rounded-br-md bg-indigo-600 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-700')}>
                              {msg.text}
                              <p className={cn('mt-1 text-[9px]', mine ? 'text-indigo-200' : 'text-slate-400')}>{fmtDateTime(msg.at)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 border-t border-slate-100 p-4">
                      <input
                        value={chatText}
                        onChange={e => setChatText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && chatText.trim()) { sendMessage(currentChat.id, user!.id, chatText); setChatText(''); } }}
                        placeholder="Tulis pesan…"
                        className={cn(inputCls, 'flex-1')}
                      />
                      <Button disabled={!chatText.trim()} onClick={() => { sendMessage(currentChat.id, user!.id, chatText); setChatText(''); }}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </Card>
            </div>
          )}
        </div>
      )}

      <Modal open={annOpen} onClose={() => setAnnOpen(false)} title="Buat Pengumuman">
        <div className="space-y-3">
          <input className={inputCls} placeholder="Judul pengumuman…" value={annTitle} onChange={e => setAnnTitle(e.target.value)} />
          <textarea rows={4} className={inputCls} placeholder="Isi pengumuman…" value={annBody} onChange={e => setAnnBody(e.target.value)} />
          <select className={inputCls} value={annScope} onChange={e => setAnnScope(e.target.value as 'sekolah' | 'kelas')}>
            <option value="sekolah">Seluruh sekolah</option>
            <option value="kelas">Kelas tertentu</option>
          </select>
          <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500">
            <Bell className="mr-1 inline h-3.5 w-3.5 text-indigo-500" /> Pengumuman otomatis dikirim sebagai notifikasi ke siswa, guru, dan orang tua (push + email + WhatsApp bila aktif).
          </div>
          <Button className="w-full" disabled={!annTitle || !annBody} onClick={() => {
            addAnnouncement({ title: annTitle, body: annBody, scope: annScope, classId: annScope === 'kelas' ? 'k3' : undefined });
            setAnnOpen(false); setAnnTitle(''); setAnnBody('');
            toast('Pengumuman dipublikasikan & notifikasi terkirim');
          }}>Publikasikan</Button>
        </div>
      </Modal>
    </div>
  );
}
